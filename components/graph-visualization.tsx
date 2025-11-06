"use client"

import { GraphData, GraphSettings } from "@/lib/types/graph";
import { useD3Graph } from "@/hooks/useD3Graph";
import { Loader2 } from "lucide-react";

interface GraphVisualizationProps {
  data: GraphData | null;
  settings: GraphSettings;
  isLoading: boolean;
  // Rerender key to recalc layout on viewport changes (e.g., fullscreen)
  viewportKey?: number;
  fillHeight?: boolean;
}

export default function GraphVisualization({ data, settings, isLoading, viewportKey = 0, fillHeight = false }: GraphVisualizationProps) {
  const svgRef = useD3Graph(data, settings, viewportKey);

  const placeholderStyle = fillHeight
    ? { height: "100%", minHeight: "100%" }
    : { minHeight: "750px" };

  const svgStyle = fillHeight
    ? { height: "100%", minHeight: "100%" }
    : { minHeight: "750px", height: "750px" };

  const placeholderClass = fillHeight
    ? "flex items-center justify-center h-full"
    : "flex items-center justify-center";

  if (isLoading) {
    return (
      <div className={placeholderClass} style={placeholderStyle}>
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={placeholderClass} style={placeholderStyle}>
        <p className="text-slate-400">No graph data available. Generate a graph to get started.</p>
      </div>
    );
  }

  return (
    <div className={fillHeight ? "w-full h-full" : "w-full"}>
      <svg
        ref={svgRef}
        id="graph-svg"
        className={`w-full border border-slate-200 rounded-lg bg-white ${fillHeight ? "h-full" : ""}`}
        style={svgStyle}
      />
    </div>
  );
}
