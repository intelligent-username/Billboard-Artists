"use client"

import { Button } from "@/components/ui/button"
import { ImageIcon, FileJson } from "lucide-react"
import type { GraphData } from "@/lib/types/graph";

interface ExportControlsProps {
  graphData: GraphData | null
  settings: any
}
const scaleFactor = 10;

export function ExportControls({ graphData, settings }: ExportControlsProps) {
  const exportAsImage = async () => {
    // Try client-side first
    try {
      await exportAsImageClientSide();
    } catch (error) {
      console.error("Client-side PNG export failed:", error);
      console.log("Falling back to server-side PNG generation");
      await exportAsImageServerSide();
    }
  };

  const exportAsImageClientSide = async () => {
    return new Promise((resolve, reject) => {
      const svg = document.querySelector("#graph-svg") as SVGSVGElement;
      if (!svg) {
        reject(new Error("Graph SVG not found"));
        return;
      }

      // Clone SVG and add styles
      const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
      
      // Get computed styles and embed them
      const style = document.createElement("style");
      const allElements = clonedSvg.querySelectorAll("*");
      let cssText = "";
      
      allElements.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        const elementStyle = Array.from(computedStyle).reduce((css, property) => {
          return css + `${property}:${computedStyle.getPropertyValue(property)};`;
        }, "");
        if (elementStyle) {
          cssText += `#${element.id || 'element'} { ${elementStyle} }\n`;
        }
      });
      
      style.textContent = cssText;
      clonedSvg.insertBefore(style, clonedSvg.firstChild);

      // Set explicit dimensions
      const rect = svg.getBoundingClientRect();
      clonedSvg.setAttribute("width", (rect.width * scaleFactor).toString());
      clonedSvg.setAttribute("height", (rect.height * scaleFactor).toString());

      // Convert to canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }


      canvas.width = rect.width * scaleFactor;
      canvas.height = rect.height * scaleFactor;
      ctx.scale(scaleFactor, scaleFactor);

      // Create image from SVG
      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        try {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const downloadUrl = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = downloadUrl;
              link.download = `collaboration-graph-${Date.now()}.png`;
              link.click();
              URL.revokeObjectURL(downloadUrl);
              URL.revokeObjectURL(url);
              resolve(true);
            } else {
              reject(new Error("Failed to create blob"));
            }
          }, 'image/png');
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG as image"));
      };

      img.src = url;
    });
  };

  const exportAsImageServerSide = async () => {
    const svg = document.querySelector("#graph-svg");
    if (!svg) {
      throw new Error("Graph SVG not found");
    }

    // Get SVG with embedded styles
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    const style = document.createElement("style");
    
    // Try to get stylesheet rules
    try {
      style.textContent = Array.from(document.styleSheets)
        .map((sheet) => {
          try {
            return Array.from(sheet.cssRules)
              .map((rule) => rule.cssText)
              .join("\n");
          } catch (e) {
            return "";
          }
        })
        .join("\n");
    } catch (e) {
      console.warn("Could not access stylesheets, styles may not be preserved");
    }
    
    clonedSvg.insertBefore(style, clonedSvg.firstChild);

    // Set explicit dimensions
    const rect = svg.getBoundingClientRect();
    clonedSvg.setAttribute("width", (rect.width * scaleFactor).toString());
    clonedSvg.setAttribute("height", (rect.height * scaleFactor).toString());

    const svgData = new XMLSerializer().serializeToString(clonedSvg);

    const response = await fetch("http://localhost:8000/api/generate-png", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        svg: svgData,
        timestamp: Date.now(),
        settings: settings
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    // Download the PNG
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collaboration-graph-${Date.now()}.png`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAsSVG = () => {
    const svg = document.querySelector("#graph-svg") as SVGSVGElement;
    if (!svg) return;
    // Clone and clean up SVG for export
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    // Set explicit width/height attributes for portability
    const rect = svg.getBoundingClientRect();
    clonedSvg.setAttribute("width", rect.width.toString());
    clonedSvg.setAttribute("height", rect.height.toString());
    // Serialize and download
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collaboration-graph-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    if (!graphData) return;

    const simplifiedGraph = {
      nodes: graphData.nodes.map(({ id, name, degree }) => ({ id, name, degree })),
      edges: graphData.edges.map((edge: { source: { id: string } | string; target: { id: string } | string; weight: number }) => ({
        source: typeof edge.source === "object" ? edge.source.id : edge.source,
        target: typeof edge.target === "object" ? edge.target.id : edge.target,
        weight: edge.weight,
      })),
    };

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        settings,
        nodeCount: simplifiedGraph.nodes.length,
        edgeCount: simplifiedGraph.edges.length,
      },
      graph: simplifiedGraph,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collaboration-graph-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportAsImage}
        disabled={!graphData}
        className="flex items-center gap-1 bg-transparent"
      >
        <ImageIcon className="h-3 w-3" />
        PNG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportAsSVG}
        disabled={!graphData}
        className="flex items-center gap-1 bg-transparent"
      >
        {/* You can use a simple SVG icon or text */}
        SVG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportAsJSON}
        disabled={!graphData}
        className="flex items-center gap-1 bg-transparent"
      >
        <FileJson className="h-3 w-3" />
        JSON
      </Button>
    </div>
  )
}
