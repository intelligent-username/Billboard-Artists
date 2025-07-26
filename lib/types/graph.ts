export interface Node {
  id: string;
  name: string;
  degree: number;
}

export interface Edge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface GraphSettings {
  vertexLimit: number;
  shrinkMethod: "degree" | "random";
  layout: "spring" | "circular" | "shell" | "random" | "kamada" | "fruchterman";
  showLabels: boolean;
  showWeights: boolean;
  highPerformance: boolean;
}
