"""
CSC111 Project 2: Visualizing the Graph

This module provides a collection of methods to visualize a graph and other related helper functions.
    - create smaller subgraphs
    - get size of nodes for drawing
    - draw/save the graph
    - build graph name
"""
from random import choice
import networkx as nx
import matplotlib.pyplot as plt
import numpy as np


def shrink_graph_degree(graph: nx.Graph, limit: int) -> nx.Graph:
    """
    Return a new graph that has at most limit number of vertices,
    by randomly removing vertices of the lowest degree (the output is not deterministic).

    If limit >= number of vertices, then the output will be a copy of the input graph.

    Preconditions:
        - limit >= 0
    """
    new_graph = graph.copy()

    new_graph_size = new_graph.number_of_nodes()
    if new_graph_size <= limit:
        return new_graph

    degree = set()
    degree_dct = {}
    for n in new_graph:
        deg_n = new_graph.degree[n]
        degree.add(deg_n)
        if deg_n not in degree_dct:
            degree_dct[deg_n] = [n]
        else:
            degree_dct[deg_n].append(n)
    lst_degree = list(degree)
    lst_degree.sort()

    index = 0
    reduction_goal = new_graph_size - limit
    while reduction_goal > 0 and index < len(lst_degree):
        rem_vertices = degree_dct[lst_degree[index]]
        if len(rem_vertices) <= reduction_goal:
            for vertex in rem_vertices:
                new_graph.remove_node(vertex)
            reduction_goal -= len(rem_vertices)
            index += 1
        else:
            j = 0
            while reduction_goal > 0:
                new_graph.remove_node(rem_vertices[j])
                j += 1
                reduction_goal -= 1

    return new_graph


def shrink_graph_random(graph: nx.Graph, limit: int) -> nx.Graph:
    """
    Return a new graph that has at most limit number of vertices,
    by randomly removing vertices.

    If limit >= number of vertices, then the output will be a copy of the input graph.

    Preconditions:
        - limit >= 0
    """
    new_graph = graph.copy()

    if new_graph.number_of_nodes() <= limit:
        return new_graph

    reduction_goal = new_graph.number_of_nodes() - limit
    while reduction_goal > 0:
        new_graph.remove_node(choice(list(new_graph.nodes)))
        reduction_goal -= 1

    return new_graph


def get_node_sizes(graph: nx.Graph, size_difference: int = 50) -> dict[str, int]:
    """
    Return a dictionary of nodes and the size they should be when drawn
    value = size_difference * degree of vertex
    """
    size = {}
    for n in graph:
        size[n] = graph.degree[n] * size_difference
    return size


def draw_graph(graph: nx.Graph, size_dct: dict[str, int],
               show_label: bool = False, show_weight: bool = False, pos: int = 0) -> None:
    """
    Draw the graph with optimized spacing using spring layout

    graph: the graph being drawn
    size_dct: dictionary with the size of nodes
    show_label: whether to show the name of each node
    show_weight: whether to show the weight of each edge
    pos: position configuration of graph display

    Preconditions:
        - all(node in size_dct for node in graph.nodes())
    """

    if pos == "2":
        lay = nx.circular_layout(graph, scale=2)
        layout_name = "Circular Layout"
    elif pos == "3":
        lay = nx.shell_layout(graph, scale=2)
        layout_name = "Shell Layout"
    elif pos == "4":
        lay = nx.random_layout(graph)
        layout_name = "Random Layout"
    elif pos == "5":
        lay = nx.kamada_kawai_layout(graph, scale=2)
        layout_name = "Kamada Kawai Layout"
    elif pos == "6":
        lay = nx.fruchterman_reingold_layout(graph, scale=2)
        layout_name = "Fruchterman Reingold Layout"
    else:
        lay = nx.spring_layout(graph, k=1.5, iterations=50, scale=2)
        layout_name = "Spring Layout"

    colors = np.linspace(0, 1, len(graph.nodes))
    size = [size_dct[node] for node in graph.nodes()]

    nx.draw(graph, lay, node_size=size, node_color=colors, alpha=0.7, width=0.5, edge_color='gray')

    if show_label:
        nlabels = nx.get_node_attributes(graph, "name")
        nx.draw_networkx_labels(graph, lay, labels=nlabels, font_size=5, font_weight='bold')

    if show_weight:
        nedges = nx.get_edge_attributes(graph, "weight")
        nx.draw_networkx_edge_labels(graph, lay, edge_labels=nedges, alpha=0.7, font_size=5, font_weight='bold')

    name = name_builder("images/", layout_name, graph.number_of_nodes(), show_label, show_weight)
    plt.savefig(name)
    plt.show()


def name_builder(location: str, layout: str, num_vertex: int, vertex_label: bool, edge_label: bool) -> str:
    """
    Builds the name of the image file. Helper function for draw_graph.

    layout: name of the layout
    num_vertex: number of vertices in the graph
    vertex_label: whether to show the vertex label
    edge_label: whether to show the edge label

    Example Output:
    "images/Spring Layout (100 TF).png"
    For a spring layout with 100 nodes, shown vertex names, and hidden weights in images
    """
    name = location + layout + " (" + str(num_vertex) + " "
    if vertex_label:
        name += "T"
    else:
        name += "F"
    if edge_label:
        name += "T"
    else:
        name += "F"

    name += ").png"
    return name


if __name__ == "__main__":
  print("Don't run this in main yo")
