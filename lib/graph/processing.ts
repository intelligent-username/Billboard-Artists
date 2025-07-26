import { GraphData, Node, Edge } from "@/lib/types/graph";
import * as d3 from "d3";

export function shrinkGraph(data: GraphData, vertexLimit: number, shrinkMethod: "degree" | "random"): GraphData {
  let { nodes, edges } = data;

  if (nodes.length > vertexLimit) {
    if (shrinkMethod === "degree") {
      nodes.sort((a: Node, b: Node) => b.degree - a.degree);
      nodes = nodes.slice(0, vertexLimit);
    } else {
      nodes = d3.shuffle(nodes).slice(0, vertexLimit);
    }

    const nodeIds = new Set(nodes.map((n: Node) => n.id));
    edges = edges.filter((e: Edge) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }

  return { nodes, edges };
}
