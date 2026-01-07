"""
This module loads the JSON file created by the CSV Processor and Dictionary Builder in process.csv
and uses it to build a NetworkX weighted graph.
"""
import json
import networkx as nx


def create_graph_from_json(filepath: str) -> nx.Graph:
    """
    Loads the nested dict of artist collaborations from JSON and converts it to a weighted NetworkX graph, where
    - each node (vertex) is the name of an artist
    - each edge is weighted by the number of collaborations between the two artists it connects
    """
    with open(filepath, 'r') as f:
        data = json.load(f)

    graph = nx.Graph()

    for artist_a, other_dict in data.items():
        for artist_b, weight in other_dict.items():
            graph.add_node(artist_a, name=str(artist_a))
            graph.add_node(artist_b, name=str(artist_b))
            graph.add_edge(artist_a, artist_b, weight=weight)

    return graph

