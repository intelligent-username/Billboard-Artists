"""
Enhanced data processing module with better error handling and modularity.
"""

import json
import csv
from pathlib import Path
from typing import Dict, List, Tuple, Set
import logging
from dataclasses import dataclass
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ProcessingConfig:
    """Configuration for data processing."""
    input_file: str
    collaborations_output: str
    songs_output: str
    min_collaboration_count: int = 1
    
class DataProcessor:
    """Enhanced data processor with caching and validation."""
    
    def __init__(self, config: ProcessingConfig):
        self.config = config
        self.stats = {
            'songs_processed': 0,
            'artists_found': 0,
            'collaborations_created': 0
        }
    
    def process_data(self) -> Tuple[Dict, Dict]:
        """Main processing function with error handling."""
        try:
            logger.info(f"Processing data from {self.config.input_file}")
            
            collaborations, songs_to_artists = self._build_relationship_dicts()
            
            # Validate data
            self._validate_data(collaborations, songs_to_artists)
            
            # Save with backup
            self._save_with_backup(collaborations, self.config.collaborations_output)
            self._save_with_backup(songs_to_artists, self.config.songs_output)
            
            logger.info(f"Processing complete. Stats: {self.stats}")
            return collaborations, songs_to_artists
            
        except Exception as e:
            logger.error(f"Processing failed: {e}")
            raise
    
    def _build_relationship_dicts(self) -> Tuple[Dict, Dict]:
        """Build collaboration and song-artist dictionaries."""
        collaborations = {}
        songs_to_artists = {}
        
        with open(self.config.input_file, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            
            for row_num, row in enumerate(reader, 1):
                try:
                    if len(row) != 4:
                        logger.warning(f"Skipping malformed row {row_num}: {row}")
                        continue
                        
                    position, title, artist_str, featured = row
                    artists = self._extract_artists(artist_str, featured)
                    
                    if not artists:
                        continue
                    
                    # Create song entry
                    song_key = f"{title}/////{'&&&'.join(sorted(artists))}/////{position}"
                    songs_to_artists[song_key] = list(artists)
                    
                    # Update collaboration counts
                    self._update_collaborations(collaborations, artists)
                    
                    self.stats['songs_processed'] += 1
                    
                except Exception as e:
                    logger.warning(f"Error processing row {row_num}: {e}")
                    continue
        
        self.stats['artists_found'] = len(collaborations)
        self.stats['collaborations_created'] = sum(
            len(collabs) for collabs in collaborations.values()
        )
        
        return collaborations, songs_to_artists
    
    def _extract_artists(self, artist_str: str, featured_str: str) -> Set[str]:
        """Extract and clean artist names. Uses a hardcoded list of exceptions for names with commas, etc."""
        EXCEPTIONS = {
            "Tyler, the Creator",
            "Tyler, The Creator",
            "John Scott Trotter & His Orchestra",
            "Ralph Carmichael Orchestra and Chorus",
            "AC/DC",
            "Earth, Wind & Fire",
            # Add more exceptions as needed
        }

        import re
        def split_artists(s: str) -> Set[str]:
            if not isinstance(s, str) or s == "N/A":
                return set()
            s = s.strip()
            # Map exception names to unique tokens
            token_map = {}
            tokenized = s
            for idx, exc in enumerate(EXCEPTIONS):
                token = f"__EXC_{idx}__"
                # Use regex to match the exception as a whole word/phrase
                # Escape special regex chars in exc
                pattern = re.escape(exc)
                # Replace all occurrences with token
                tokenized, n = re.subn(pattern, token, tokenized)
                if n > 0:
                    token_map[token] = exc
            # Now split on delimiters
            delimiters = [',', '&', '/', ' x ', ' with ', ' Featuring ']
            temp = [tokenized]
            for delim in delimiters:
                new_temp = []
                for part in temp:
                    new_temp.extend(part.split(delim))
                temp = new_temp
            # Restore tokens to exception names
            result = set()
            for a in temp:
                a = a.strip()
                if not a:
                    continue
                if a in token_map:
                    result.add(token_map[a])
                else:
                    result.add(a)
            return result

        main_artists = split_artists(artist_str)
        featured_artists = split_artists(featured_str)
        return main_artists.union(featured_artists)
    
    def _update_collaborations(self, collaborations: Dict, artists: Set[str]) -> None:
        """Update collaboration counts between artists."""
        for artist in artists:
            if artist not in collaborations:
                collaborations[artist] = {}
            
            for other_artist in artists:
                if other_artist != artist:
                    if other_artist not in collaborations[artist]:
                        collaborations[artist][other_artist] = 0
                    collaborations[artist][other_artist] += 1
    
    def _validate_data(self, collaborations: Dict, songs_to_artists: Dict) -> None:
        """Validate processed data integrity."""
        if not collaborations:
            raise ValueError("No collaborations found")
        
        if not songs_to_artists:
            raise ValueError("No songs found")
        
        # Check for symmetric collaborations
        for artist, collabs in collaborations.items():
            for other_artist, count in collabs.items():
                if other_artist not in collaborations:
                    logger.warning(f"Asymmetric collaboration: {artist} -> {other_artist}")
                elif collaborations[other_artist].get(artist, 0) != count:
                    logger.warning(f"Collaboration count mismatch: {artist} <-> {other_artist}")
    
    def _save_with_backup(self, data: Dict, filepath: str) -> None:
        """Save data with backup of existing file."""
        path = Path(filepath)
        
        # Create backup if file exists
        if path.exists():
            backup_path = path.with_suffix(f"{path.suffix}.backup")
            path.rename(backup_path)
            logger.info(f"Created backup: {backup_path}")
        
        # Save new data
        with open(filepath, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(data)} entries to {filepath}")

def main():
    """Main function for command-line usage."""
    # Get the directory of this script
    script_dir = Path(__file__).parent
    # Go up one level to backend directory
    backend_dir = script_dir.parent
    
    config = ProcessingConfig(
        input_file=str(backend_dir / "data" / "cleaned.csv"),
        collaborations_output=str(backend_dir / "data" / "collaborations.json"),
        songs_output=str(backend_dir / "data" / "songs_to_artists.json")
    )
    
    processor = DataProcessor(config)
    processor.process_data()

if __name__ == "__main__":
    main()
