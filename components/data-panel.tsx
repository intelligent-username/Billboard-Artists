"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"

interface DataPanelProps {
  lastUpdate: string | null
  onUpdateData: () => void
  isLoading: boolean
}

interface UpdateStatus {
  is_running: boolean
  current_step: string
  error: string | null
  completed: boolean
}

export default function DataPanel({ lastUpdate, onUpdateData, isLoading }: DataPanelProps) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    is_running: false,
    current_step: "",
    error: null,
    completed: false
  })

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
      const response = await fetch(`http://localhost:8000/api/data/download/${filename}`)
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
      } else {
        console.error("Failed to download file:", response.statusText)
        alert("Failed to download file. Make sure the backend is running.")
      }
    } catch (error) {
      console.error("Failed to download file:", error)
      alert("Failed to download file. Make sure the backend is running.")
    }
  }

  const handleUpdateData = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/update-data", {
        method: "POST"
      })
      
      if (response.ok) {
        // Start polling for status updates
        pollUpdateStatus()
        onUpdateData() // Call parent callback
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`Failed to start update: ${errorData.detail || response.statusText}`)
      }
    } catch (error) {
      console.error("Failed to start update:", error)
      alert("Failed to start update. Make sure the backend is running.")
    }
  }

  const pollUpdateStatus = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:8000/api/update-status")
        if (response.ok) {
          const status = await response.json()
          setUpdateStatus(status)
          
          // Stop polling when update is complete or failed
          if (!status.is_running) {
            clearInterval(interval)
          }
        }
      } catch (error) {
        console.error("Failed to get update status:", error)
        clearInterval(interval)
      }
    }, 1000) // Poll every second
  }

  // Poll status on component mount if update is running
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/update-status")
        if (response.ok) {
          const status = await response.json()
          setUpdateStatus(status)
          if (status.is_running) {
            pollUpdateStatus()
          }
        }
      } catch (error) {
        // Backend not running, ignore
      }
    }
    checkStatus()
  }, [])

  const getStatusIcon = () => {
    if (updateStatus.error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (updateStatus.completed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (updateStatus.is_running) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
    }
    return null
  }

  const getStatusBadge = () => {
    if (updateStatus.error) {
      return <Badge variant="destructive">Error</Badge>
    }
    if (updateStatus.completed) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
    }
    if (updateStatus.is_running) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Running</Badge>
    }
    return <Badge variant="outline">Ready</Badge>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            {getStatusBadge()}
          </div>
          {updateStatus.current_step && (
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-xs text-slate-600">{updateStatus.current_step}</span>
            </div>
          )}
        </div>

        <Button 
          onClick={handleUpdateData} 
          disabled={isLoading || updateStatus.is_running} 
          className="w-full bg-transparent" 
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || updateStatus.is_running) ? "animate-spin" : ""}`} />
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
