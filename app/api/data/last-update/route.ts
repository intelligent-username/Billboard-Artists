import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), "data", "billboard_global_200.csv")

    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ lastUpdate: null })
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8")
    const lines = csvContent.trim().split("\n")

    if (lines.length < 2) {
      return NextResponse.json({ lastUpdate: null })
    }

    // Get the last line and extract the date (first column)
    const lastLine = lines[lines.length - 1]
    const lastDate = lastLine.split(",")[0]

    return NextResponse.json({ lastUpdate: lastDate })
  } catch (error) {
    console.error("Error reading last update:", error)
    return NextResponse.json({ lastUpdate: null })
  }
}
