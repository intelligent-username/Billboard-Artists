import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import crypto from "node:crypto";

const CACHE_DIR = path.join(process.cwd(), ".cache", "graphs")

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

function getCacheKey(settings: any): string {
  return crypto.createHash("md5").update(JSON.stringify(settings)).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const settingsParam = url.searchParams.get("settings")

    if (!settingsParam) {
      return NextResponse.json({ error: "Settings parameter required" }, { status: 400 })
    }

    const settings = JSON.parse(settingsParam)
    const cacheKey = getCacheKey(settings)
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`)

    if (fs.existsSync(cacheFile)) {
      const cachedData = JSON.parse(fs.readFileSync(cacheFile, "utf-8"))
      return NextResponse.json({ cached: true, data: cachedData })
    }

    return NextResponse.json({ cached: false })
  } catch (error) {
    console.error("Cache retrieval error:", error)
    return NextResponse.json({ error: "Cache retrieval failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { settings, data } = await request.json()
    const cacheKey = getCacheKey(settings)
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`)

    fs.writeFileSync(cacheFile, JSON.stringify(data))
    return NextResponse.json({ success: true, cacheKey })
  } catch (error) {
    console.error("Cache storage error:", error)
    return NextResponse.json({ error: "Cache storage failed" }, { status: 500 })
  }
}
