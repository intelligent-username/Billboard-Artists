import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export function getLastUpdate() {
  try {
    const csvPath = path.join(process.cwd(), "backend", "data", "billboard_global_200.csv")

    if (!fs.existsSync(csvPath)) {
      return { lastUpdate: null }
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8")
    const lines = csvContent.trim().split("\n")

    if (lines.length < 2) {
      return { lastUpdate: null }
    }

    // Get the second last line and extract the date (first column)
    const secondLastLine = lines[lines.length - 2]
    const lastDate = secondLastLine.split(",")[0]

    return { lastUpdate: lastDate }
  } catch (error) {
    console.error("Error reading last update:", error)
    return { lastUpdate: null }
  }
}

export async function GET() {
  return NextResponse.json(getLastUpdate())
}
