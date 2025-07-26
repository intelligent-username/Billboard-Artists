import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const {
      minCollaborations = 1,
      maxCollaborations = Number.POSITIVE_INFINITY,
      artists = [],
      minRank = 1,
      maxRank = 200,
    } = await request.json()

    const collaborationsPath = path.join(process.cwd(), "data", "collaborations.json")
    const songsPath = path.join(process.cwd(), "data", "songs_to_artists.json")

    if (!fs.existsSync(collaborationsPath)) {
      return NextResponse.json({ error: "Collaborations data not found" }, { status: 404 })
    }

    const collaborationsData = JSON.parse(fs.readFileSync(collaborationsPath, "utf-8"))
    const songsData = fs.existsSync(songsPath) ? JSON.parse(fs.readFileSync(songsPath, "utf-8")) : {}

    // Filter collaborations by count
    const filteredCollaborations: any = {}

    for (const [artist, collaborators] of Object.entries(collaborationsData)) {
      const totalCollabs = Object.values(collaborators as Record<string, number>).reduce((sum, count) => sum + count, 0)

      if (totalCollabs >= minCollaborations && totalCollabs <= maxCollaborations) {
        // Filter by specific artists if provided
        if (artists.length === 0 || artists.includes(artist)) {
          filteredCollaborations[artist] = collaborators
        }
      }
    }

    // Filter songs by rank if songs data is available
    const filteredSongs: any = {}
    for (const [songKey, artistList] of Object.entries(songsData)) {
      const rank = Number.parseInt(songKey.split("/////")[2])
      if (rank >= minRank && rank <= maxRank) {
        filteredSongs[songKey] = artistList
      }
    }

    return NextResponse.json({
      collaborations: filteredCollaborations,
      songs: filteredSongs,
      stats: {
        artistCount: Object.keys(filteredCollaborations).length,
        songCount: Object.keys(filteredSongs).length,
      },
    })
  } catch (error) {
    console.error("Error filtering data:", error)
    return NextResponse.json({ error: "Failed to filter data" }, { status: 500 })
  }
}
