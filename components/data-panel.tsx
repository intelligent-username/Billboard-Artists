"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, RefreshCw } from "lucide-react"

interface DataPanelProps {
  lastUpdate: string | null
  onUpdateData: () => void
  isLoading: boolean
}

export default function DataPanel({ lastUpdate, onUpdateData, isLoading }: DataPanelProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const downloadData = async (filename: string) => {
    try {
      const response = await fetch(`/api/data/download/${filename}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Failed to download file:", error)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Data Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Update:</span>
            <Badge variant="outline">{formatDate(lastUpdate)}</Badge>
          </div>
          <p className="text-xs text-slate-500">Data from Billboard Global 200 charts</p>
        </div>

        <Button onClick={onUpdateData} disabled={isLoading} className="w-full bg-transparent" variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Update Data
        </Button>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Download Data Files</h4>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => downloadData("billboard_global_200.csv")}
            >
              <Download className="h-3 w-3 mr-2" />
              Raw Chart Data
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => downloadData("cleaned.csv")}
            >
              <Download className="h-3 w-3 mr-2" />
              Cleaned Data
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => downloadData("collaborations.json")}
            >
              <Download className="h-3 w-3 mr-2" />
              Collaborations
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => downloadData("songs_to_artists.json")}
            >
              <Download className="h-3 w-3 mr-2" />
              Songs to Artists
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="text-xs text-slate-500 space-y-1">
            <p>
              <strong>Data Sources:</strong>
            </p>
            <p>• Billboard Global 200 charts</p>
            <p>• Weekly data since Sept 2020</p>
            <p>• Artist collaboration networks</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
