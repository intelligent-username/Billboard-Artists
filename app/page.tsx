"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import GraphVisualization from "@/components/graph-visualization"
import DataPanel from "@/components/data-panel"
import GraphSettings from "@/components/graph-settings" // Import GraphSettings component
import ArtistSearch from "@/components/artist-search"
import ArtistConnections from "@/components/artist-connections"
import { Loader2, Maximize2, Minimize2 } from "lucide-react"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { WaveformBackground } from "@/components/waveform-background"
import { GraphData, GraphSettings as GraphSettingsType } from "@/lib/types/graph";
import { Calendar } from "lucide-react";

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
    dynamicMode: false,
  })
  // Track if a settings change should trigger graph generation
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [displayConnectionsMode, setDisplayConnectionsMode] = useState(false);
  const [connectionsGraphData, setConnectionsGraphData] = useState<GraphData | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [connectionDegree, setConnectionDegree] = useState(1);
  // Fullscreen state and refs
  const centerCardRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportKey, setViewportKey] = useState(0);

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      // bump key so D3 recomputes layout
      setViewportKey((k) => k + 1);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await centerCardRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen toggle failed", e);
    }
  };

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
    setDisplayConnectionsMode(false)
    // Free the connections graph when (re)generating main graph
    setConnectionsGraphData(null)
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

  // useEffect to handle artist selection changes
  useEffect(() => {
    if (!selectedArtist && displayConnectionsMode) {
      setDisplayConnectionsMode(false);
      setConnectionsGraphData(null);
    }
  }, [selectedArtist, displayConnectionsMode]);

  // useEffect to refresh connections when degree changes
  useEffect(() => {
    if (displayConnectionsMode && selectedArtist) {
      displayArtistConnections();
    }
  }, [connectionDegree]); // Re-fetch when degree changes

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

  const searchArtists = useCallback(async (query: string) => {
    const response = await fetch(`http://localhost:8000/api/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error("Failed to search artists");
    }
    return await response.json();
  }, []);

  const getArtistConnections = useCallback(async (artist: string, degree: number = 1) => {
    const response = await fetch(
      `http://localhost:8000/api/artist/${encodeURIComponent(artist)}/connections?degree=${degree}`
    );
    if (!response.ok) {
      const error = new Error(`Failed to get connections for ${artist}`);
      (error as any).status = response.status;
      throw error;
    }
    return await response.json();
  }, []);

  const connectionsAbortRef = useRef<AbortController | null>(null)

  const getArtistConnectionsGraph = useCallback(async (artist: string, degree: number = 1) => {
    connectionsAbortRef.current?.abort()
    const controller = new AbortController()
    connectionsAbortRef.current = controller

    const response = await fetch(
      `http://localhost:8000/api/artist/${encodeURIComponent(artist)}/connections-graph?degree=${degree}`,
      { signal: controller.signal }
    );
    if (!response.ok) {
      const error = new Error(`Failed to get connections graph for ${artist}`);
      (error as any).status = response.status;
      throw error;
    }
    return await response.json();
  }, []);

  useEffect(() => {
    return () => {
      connectionsAbortRef.current?.abort()
    }
  }, [])

  const displayArtistConnections = async () => {
    if (!selectedArtist) return;
    setIsLoadingConnections(true);
    try {
      const graphData = await getArtistConnectionsGraph(selectedArtist, connectionDegree);
      if (graphData && graphData.nodes) {
        graphData.nodes = graphData.nodes.map((node: any) =>
          node.id === selectedArtist ? { ...node, isSpecial: true } : node
        );
      }
      // Free the generated graph while showing connections
      setGraphData(null)
      setConnectionsGraphData(graphData);
      setDisplayConnectionsMode(true);
    } catch (error) {
      console.error("Error displaying connections:", error);
    } finally {
      setIsLoadingConnections(false);
    }
  };

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
              <p style={{ fontSize: '0.7em', color: 'gray' }}>
                *Note: The Global 200 Charts were started in September 2020.
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Panel - Artist Search & Data Info */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Artist Search</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ArtistSearch
                      onSearch={searchArtists}
                      onSelect={setSelectedArtist}
                      onClear={() => setSelectedArtist(null)}
                    />
                  </CardContent>
                </Card>

                {selectedArtist && (
                  <>
                    <ArtistConnections
                      artistName={selectedArtist}
                      getConnections={(artist: string) => getArtistConnections(artist, 1)}
                    />
                    <Card>
                      <CardHeader>
                        <CardTitle>Visualization Controls</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button 
                          onClick={displayArtistConnections}
                          disabled={isLoadingConnections || !selectedArtist}
                          className="w-full"
                          variant={displayConnectionsMode ? "secondary" : "default"}
                        >
                          {isLoadingConnections ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading...
                            </>
                          ) : (
                            "Display Connections"
                          )}
                        </Button>
                        
                        {/* Degree Selector */}
                        <div className="flex items-center space-x-2">
                          <label htmlFor="degree-select" className="text-sm font-medium">
                            Degree:
                          </label>
                          <select 
                            id="degree-select"
                            value={connectionDegree}
                            onChange={(e) => setConnectionDegree(Number(e.target.value))}
                            className="flex-1 px-2 py-1 text-sm border rounded-md bg-background"
                            disabled={isLoadingConnections}
                          >
                            <option value={1}>Direct (1)</option>
                            <option value={2}>Up to 2</option>
                            <option value={3}>Up to 3</option>
                            <option value={4}>Up to 4</option>
                            <option value={5}>Up to 5</option>
                          </select>
                        </div>
                        
                        {displayConnectionsMode && (
                          <>
                            <Button 
                              onClick={() => {
                                setDisplayConnectionsMode(false)
                                // Free the connections graph when returning
                                setConnectionsGraphData(null)
                              }}
                              className="w-full"
                              variant="outline"
                            >
                              Back to Generated Graph
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Showing connections for {selectedArtist} (degree {connectionDegree})
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                <DataPanel
                  lastUpdate={lastUpdate}
                  onUpdateData={updateData}
                  isLoading={isLoading}
                />
              </div>

              {/* Center Panel - Graph Canvas */}
              <div className="lg:col-span-2">
                <Card
                  ref={centerCardRef}
                  className={`neon-border graph-container ${isFullscreen ? "flex flex-col h-full w-full" : ""}`}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2">
                      {displayConnectionsMode ? `${selectedArtist} Connections` : "Collaboration Network"}
                      {(isLoading || isLoadingConnections) && <Loader2 className="h-4 w-4 animate-spin" />}
                    </CardTitle>
                    <Button variant="ghost" size="icon" aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={toggleFullscreen}>
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </CardHeader>
                  <CardContent className={isFullscreen ? "flex-1 p-0 overflow-hidden" : "p-4"}>
                    {displayConnectionsMode ? (
                      <GraphVisualization 
                        data={connectionsGraphData}
                        settings={settings}
                        isLoading={isLoadingConnections}
                        viewportKey={viewportKey}
                        fillHeight={isFullscreen}
                      />
                    ) : (
                      <GraphVisualization 
                        data={graphData}
                        settings={settings}
                        isLoading={isLoading}
                        viewportKey={viewportKey}
                        fillHeight={isFullscreen}
                      />
                    )}
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
