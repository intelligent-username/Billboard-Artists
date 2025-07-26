"use client"

import { Button } from "@/components/ui/button"
import { ImageIcon, FileJson } from "lucide-react"
import type { GraphData } from "@/app/page"

interface ExportControlsProps {
  graphData: GraphData | null
  settings: any
}

export function ExportControls({ graphData, settings }: ExportControlsProps) {
  const exportAsImage = () => {
    const svg = document.querySelector("svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    canvas.width = svg.clientWidth
    canvas.height = svg.clientHeight

    img.onload = () => {
      ctx?.drawImage(img, 0, 0)
      const link = document.createElement("a")
      link.download = `collaboration-graph-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
    }

    img.src = "data:image/svg+xml;base64," + btoa(svgData)
  }

  const exportAsJSON = () => {
    if (!graphData) return

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        settings,
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
      },
      graph: graphData,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `collaboration-graph-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
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
