import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"

const execAsync = promisify(exec)

export async function POST() {
  try {
    const scriptsDir = path.join(process.cwd(), "scripts")

    // Run the data update pipeline
    await execAsync("python scraper.py", { cwd: scriptsDir })
    await execAsync("python initial_cleaner.py", { cwd: scriptsDir })
    await execAsync("python process_csv.py", { cwd: scriptsDir })

    // Get the new last update date
    const { lastUpdate } = await import("./last-update/route")
    const response = await lastUpdate()
    const data = await response.json()

    return NextResponse.json({
      success: true,
      lastUpdate: data.lastUpdate,
      message: "Data updated successfully",
    })
  } catch (error) {
    console.error("Error updating data:", error)
    return NextResponse.json(
      {
        error: "Failed to update data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
