import json
from pathlib import Path
from typing import Dict, List
from collections import deque, defaultdict

class DataAccessLayer:
    def __init__(self, data_file: Path, songs_to_artists_file: Path):
        self.data_file = data_file
        self.songs_to_artists_file = songs_to_artists_file
        self.data: Dict[str, Dict[str, int]] = self._load_data()
        self.songs_to_artists: Dict[str, List[str]] = self._load_songs_to_artists()

    def _load_data(self) -> Dict[str, Dict[str, int]]:
        """Loads collaboration data from the JSON file."""
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Data file not found: {self.data_file}")
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON format in: {self.data_file}")

    def _load_songs_to_artists(self) -> Dict[str, List[str]]:
        """Loads songs to artists mapping from the JSON file."""
        try:
            with open(self.songs_to_artists_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Songs to artists file not found: {self.songs_to_artists_file}")
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON format in: {self.songs_to_artists_file}")


    def get_artist_connections(self, artist_name: str, degree: int = 1) -> Dict[str, Dict]:
        """
        Returns a dict of collaborators and their collaboration count up to the specified degree.
        Counts the number of unique songs where artists appear together.
        
        Args:
            artist_name: The artist to find connections for
            degree: The degree of separation (1 = direct collaborators, 2 = collaborators of collaborators, etc.)
        
        Returns:
            Dict mapping collaborator names to {'count': int, 'degree': int}
        """
        if degree == 1:
            # Use optimized direct connections for degree 1
            return self._get_direct_connections(artist_name)
        
        # Use BFS for higher degrees
        return self._get_connections_bfs(artist_name, degree)
    
    def _get_direct_connections(self, artist_name: str) -> Dict[str, Dict]:
        """Get direct collaborators (degree 1) for an artist."""
        artist_name = artist_name.strip()
        connections: Dict[str, int] = {}
        
        # Iterate through all songs and find ones that include the artist
        for song, artists in self.songs_to_artists.items():
            if artist_name in artists:
                # For each other artist in the same song, increment their collaboration count
                for other_artist in artists:
                    if other_artist != artist_name:
                        connections[other_artist] = connections.get(other_artist, 0) + 1
        
        # Convert to new format
        result = {}
        for collaborator, count in connections.items():
            result[collaborator] = {'count': count, 'degree': 1}
        
        return result
    
    def _get_connections_bfs(self, artist_name: str, max_degree: int) -> Dict[str, Dict]:
        """Get connections using BFS up to max_degree."""
        artist_name = artist_name.strip()
        visited = set([artist_name])
        queue = deque([(artist_name, 0)])
        connections = {}
        
        while queue:
            current_artist, current_degree = queue.popleft()
            if current_degree >= max_degree:
                continue
                
            # Get direct collaborators for current artist
            direct_collabs = self._get_direct_collaborators_raw(current_artist)
            
            for collab, count in direct_collabs.items():
                if collab not in visited:
                    # Add to connections if not already found at a closer degree
                    if collab not in connections:
                        connections[collab] = {'count': count, 'degree': current_degree + 1}
                        queue.append((collab, current_degree + 1))
                        visited.add(collab)
        
        return connections
    
    def _get_direct_collaborators_raw(self, artist_name: str) -> Dict[str, int]:
        """Get direct collaborators as a simple dict of {collaborator: count}."""
        artist_name = artist_name.strip()
        connections: Dict[str, int] = {}
        
        # Iterate through all songs and find ones that include the artist
        for song, artists in self.songs_to_artists.items():
            if artist_name in artists:
                # For each other artist in the same song, increment their collaboration count
                for other_artist in artists:
                    if other_artist != artist_name:
                        connections[other_artist] = connections.get(other_artist, 0) + 1
        
        return connections


    def artist_exists(self, artist_name: str) -> bool:
        """Check if an artist exists in the data."""
        # Check if artist appears in any song
        for artists in self.songs_to_artists.values():
            if artist_name in artists:
                return True
        return False


    def search_artists(self, query: str) -> List[str]:
        """Searches for artists whose names contain the query string."""
        if not query.strip():
            return []
        
        query_lower = query.lower()
        artist_set = set()
        
        # Collect all unique artists from songs_to_artists
        for artists in self.songs_to_artists.values():
            for artist in artists:
                if query_lower in artist.lower():
                    artist_set.add(artist)
        
        results = list(artist_set)
        
        # Sort by relevance: exact matches first, then starts with, then contains
        def sort_key(artist):
            artist_lower = artist.lower()
            if artist_lower == query_lower:
                return (0, artist)
            elif artist_lower.startswith(query_lower):
                return (1, artist)
            else:
                return (2, artist)
        
        results.sort(key=sort_key)
        return results[:20]  # Limit to top 20 results

    def get_artist_connections_graph(self, artist_name: str, degree: int = 1) -> Dict:
        """
        Returns the complete graph structure (nodes and edges) for an artist's connections up to the specified degree.
        
        Args:
            artist_name: The artist to find connections for
            degree: The degree of separation
        
        Returns:
            Dict with 'nodes' and 'edges' lists representing the complete graph structure
        """
        artist_name = artist_name.strip()
        
        # Get all artists within the specified degree using BFS
        visited = set([artist_name])
        queue = deque([(artist_name, 0)])
        all_artists = set([artist_name])
        
        while queue:
            current_artist, current_degree = queue.popleft()
            
            if current_degree < degree:
                collaborators = self._get_direct_collaborators_raw(current_artist)
                for collaborator in collaborators:
                    if collaborator not in visited:
                        visited.add(collaborator)
                        all_artists.add(collaborator)
                        queue.append((collaborator, current_degree + 1))
        
        # Build nodes
        nodes = []
        for artist in all_artists:
            # Calculate degree (number of direct connections)
            connections = self._get_direct_collaborators_raw(artist)
            nodes.append({
                'id': artist,
                'name': artist,
                'degree': len(connections)
            })
        
        # Build edges between all artists in the graph
        edges = []
        processed_pairs = set()
        
        for artist in all_artists:
            connections = self._get_direct_collaborators_raw(artist)
            for collaborator, count in connections.items():
                if collaborator in all_artists:
                    # Create a sorted pair to avoid duplicate edges
                    pair = tuple(sorted([artist, collaborator]))
                    if pair not in processed_pairs:
                        processed_pairs.add(pair)
                        edges.append({
                            'source': pair[0],
                            'target': pair[1],
                            'weight': count,
                            'name': f"{pair[0]} - {pair[1]}"
                        })
        
        return {
            'nodes': nodes,
            'edges': edges
        }

