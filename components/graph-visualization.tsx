"use client"

import { useD3Graph } from "@/hooks/useD3Graph";
import { GraphData, GraphSettings } from "@/lib/types/graph";
import { Loader2 } from "lucide-react";

interface GraphVisualizationProps {
  data: GraphData | null;
  settings: GraphSettings;
  isLoading: boolean;
}

export default function GraphVisualization({ data, settings, isLoading }: GraphVisualizationProps) {
  const svgRef = useD3Graph(data, settings);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Generating graph...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No graph data available</p>
          <p className="text-sm text-slate-500">Click "Generate Graph" to create a visualization</p>
        </div>
      </div>
    );
  }

  return <svg ref={svgRef} className="w-full h-full border border-slate-200 rounded-lg bg-white" />;
}
