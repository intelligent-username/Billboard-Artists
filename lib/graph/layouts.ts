import { GraphData } from "@/lib/types/graph";

export function circularLayout(data: GraphData, width: number, height: number) {
  const radius = Math.min(width, height) / 3;
  data.nodes.forEach((node: any, i: number) => {
    const angle = (i / data.nodes.length) * 2 * Math.PI;
    node.x = width / 2 + Math.cos(angle) * radius;
    node.y = height / 2 + Math.sin(angle) * radius;
    node.fx = node.x;
    node.fy = node.y;
  });
  return data;
}

export function shellLayout(data: GraphData, width: number, height: number) {
  const shells = 3;
  const sortedNodes = [...data.nodes].sort((a: any, b: any) => b.degree - a.degree);
  sortedNodes.forEach((node: any, i: number) => {
    const shell = Math.floor(i / (sortedNodes.length / shells));
    const shellRadius = (shell + 1) * (Math.min(width, height) / 6);
    const angle = ((i % (sortedNodes.length / shells)) * 2 * Math.PI) / (sortedNodes.length / shells);
    node.x = width / 2 + Math.cos(angle) * shellRadius;
    node.y = height / 2 + Math.sin(angle) * shellRadius;
    node.fx = node.x;
    node.fy = node.y;
  });
  return data;
}

export function randomLayout(data: GraphData, width: number, height: number) {
  data.nodes.forEach((node: any) => {
    node.x = Math.random() * (width - 100) + 50;
    node.y = Math.random() * (height - 100) + 50;
    // DO NOT PIN, MUST BE MOVABLE
    node.fx = node.x;
    node.fy = node.y;
  });
  return data;
}
