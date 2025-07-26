import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import crypto from "node:crypto";

interface GraphSettings {
  vertexLimit: number
  shrinkMethod: "degree" | "random"
  layout: string
  showLabels: boolean
  showWeights: boolean
}

interface Node {
  id: string
  name: string
  degree: number
}

interface Edge {
  source: string
  target: string
  weight: number
}

function shrinkGraphByDegree(nodes: Node[], edges: Edge[], limit: number): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length <= limit) return { nodes, edges }

  // Sort nodes by degree (ascending)
  const sortedNodes = [...nodes].sort((a, b) => a.degree - b.degree)
  const nodesToKeep = new Set(sortedNodes.slice(-limit).map((n) => n.id))

  const filteredNodes = nodes.filter((n) => nodesToKeep.has(n.id))
  const filteredEdges = edges.filter((e) => nodesToKeep.has(e.source) && nodesToKeep.has(e.target))

  return { nodes: filteredNodes, edges: filteredEdges }
}

function shrinkGraphRandomly(nodes: Node[], edges: Edge[], limit: number): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length <= limit) return { nodes, edges }

  // Randomly select nodes to keep
  const shuffled = [...nodes].sort(() => Math.random() - 0.5)
  const nodesToKeep = new Set(shuffled.slice(0, limit).map((n) => n.id))

  const filteredNodes = nodes.filter((n) => nodesToKeep.has(n.id))
  const filteredEdges = edges.filter((e) => nodesToKeep.has(e.source) && nodesToKeep.has(e.target))

  return { nodes: filteredNodes, edges: filteredEdges }
}

function getCacheKey(settings: any): string {
  return crypto.createHash("md5").update(JSON.stringify(settings)).digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const settings: GraphSettings = await request.json()

    // Check cache first
    const cacheKey = getCacheKey(settings)
    const cacheDir = path.join(process.cwd(), ".cache", "graphs")
    const cacheFile = path.join(cacheDir, `${cacheKey}.json`)

    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    // Return cached data if available
    if (fs.existsSync(cacheFile)) {
      const cachedData = JSON.parse(fs.readFileSync(cacheFile, "utf-8"))
      return NextResponse.json(cachedData)
    }

    // Read collaborations data
    const dataPath = path.join(process.cwd(), "data", "collaborations.json")

    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: "Collaborations data not found" }, { status: 404 })
    }

    const collaborationsData = JSON.parse(fs.readFileSync(dataPath, "utf-8"))

    // Convert to graph format
    const nodes: Node[] = []
    const edges: Edge[] = []
    const nodeSet = new Set<string>()
    const edgeSet = new Set<string>()

    // Create nodes and calculate degrees
    const degreeMap = new Map<string, number>()

    for (const [artistA, collaborators] of Object.entries(collaborationsData)) {
      if (!nodeSet.has(artistA)) {
        nodeSet.add(artistA)
        degreeMap.set(artistA, 0)
      }

      for (const [artistB, weight] of Object.entries(collaborators as Record<string, number>)) {
        if (!nodeSet.has(artistB)) {
          nodeSet.add(artistB)
          degreeMap.set(artistB, 0)
        }

        // Add edge (avoid duplicates)
        const edgeKey = [artistA, artistB].sort().join("|")
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey)
          edges.push({
            source: artistA,
            target: artistB,
            weight,
          })

          // Update degrees
          degreeMap.set(artistA, (degreeMap.get(artistA) || 0) + weight)
          degreeMap.set(artistB, (degreeMap.get(artistB) || 0) + weight)
        }
      }
    }

    // Create nodes array
    for (const artist of nodeSet) {
      nodes.push({
        id: artist,
        name: artist,
        degree: degreeMap.get(artist) || 0,
      })
    }

    // Apply shrinking if necessary
    let finalNodes = nodes
    let finalEdges = edges

    if (nodes.length > settings.vertexLimit) {
      if (settings.shrinkMethod === "degree") {
        const result = shrinkGraphByDegree(nodes, edges, settings.vertexLimit)
        finalNodes = result.nodes
        finalEdges = result.edges
      } else {
        const result = shrinkGraphRandomly(nodes, edges, settings.vertexLimit)
        finalNodes = result.nodes
        finalEdges = result.edges
      }
    }

    const result = {
      nodes: finalNodes,
      edges: finalEdges,
    }

    // Cache the result
    fs.writeFileSync(cacheFile, JSON.stringify(result))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error generating graph:", error)
    return NextResponse.json({ error: "Failed to generate graph" }, { status: 500 })
  }
}
