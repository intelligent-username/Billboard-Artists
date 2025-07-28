"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import GraphVisualization from "@/components/graph-visualization"
import DataPanel from "@/components/data-panel"
import GraphSettings from "@/components/graph-settings" // Import GraphSettings component
import { Loader2 } from "lucide-react"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { WaveformBackground } from "@/components/waveform-background"
import { GraphData, GraphSettings as GraphSettingsType } from "@/lib/types/graph";

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingState, setLoadingState] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [settings, setSettings] = useState<GraphSettingsType>({
    vertexLimit: 100,
    shrinkMethod: "degree",
    layout: "spring",
    showLabels: true,
    showWeights: false,
  })
  // Track if a settings change should trigger graph generation
  const [shouldGenerate, setShouldGenerate] = useState(false);

  useEffect(() => {
    // Load initial data and last update date
    loadLastUpdate()
  }, [])

  const loadLastUpdate = async () => {
    try {
      const response = await fetch("/api/data/last-update")
      if (response.ok) {
        const data = await response.json()
        setLastUpdate(data.lastUpdate)
      }
    } catch (error) {
      console.error("Failed to load last update:", error)
    }
  }

  const generateGraph = async () => {
    setIsLoading(true)
    try {
      // Fetch actual graph data from backend
      const response = await fetch("http://localhost:8000/api/graph/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        const data = await response.json()
        setGraphData(data)
      } else {
        console.error("Failed to generate graph")
      }
    } catch (error) {
      console.error("Error generating graph:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // useEffect to trigger graph generation after settings update (for vertexLimit)
  useEffect(() => {
    if (shouldGenerate) {
      generateGraph();
      setShouldGenerate(false);
    }
  }, [shouldGenerate]); // Fixed dependency array

  const updateData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/data/update", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setLastUpdate(data.lastUpdate)
        // Clear current graph data to force regeneration
        setGraphData(null)
      } else {
        console.error("Failed to update data")
      }
    } catch (error) {
      console.error("Error updating data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen relative">
        <WaveformBackground />
        <div className="relative z-10 p-4">
          <div className="max-w-7xl mx-auto">
            <header className="text-center mb-8 relative">
              <div className="absolute top-0 right-0">
                <ThemeToggle />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Billboard Collaboration Analysis
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Visualize artist collaborations from Billboard Global 200 charts
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
              {/* Left Panel - Data Info */}
              <div className="lg:col-span-1">
                <DataPanel lastUpdate={lastUpdate} onUpdateData={updateData} isLoading={isLoading} />
              </div>

              {/* Center Panel - Graph Visualization */}
              <div className="lg:col-span-2">
                <Card className="h-full neon-border graph-container">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Collaboration Network
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-80px)]">
                    <GraphVisualization data={graphData} settings={settings} isLoading={isLoading} />
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel - Settings */}
              <div className="lg:col-span-1">
                <GraphSettings
                  settings={settings}
                  onSettingsChange={(s) => { setSettings(s); setShouldGenerate(true); }}
                  onGenerate={generateGraph}
                  isLoading={isLoading}
                  graphData={graphData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
