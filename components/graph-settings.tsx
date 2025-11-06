"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { GraphSettings as GraphSettingsType } from "@/lib/types/graph";
import { Settings, Play } from "lucide-react"
import { ExportControls } from "./export-controls"
import { useState } from "react";

interface GraphSettingsProps {
  settings: GraphSettingsType
  onSettingsChange: (settings: GraphSettingsType) => void
  onGenerate: () => void
  isLoading: boolean
  graphData: any
}

export default function GraphSettings({
  settings,
  onSettingsChange,
  onGenerate,
  isLoading,
  graphData,
}: GraphSettingsProps) {
  // Store vertexLimit locally so changing it doesn't reload the graph
  const [localVertexLimit, setLocalVertexLimit] = useState(settings.vertexLimit);

  const updateSetting = (key: keyof GraphSettingsType, value: any) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Graph Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Essential Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Essential Settings</h3>
          <div className="space-y-2">
            <Label htmlFor="vertex-limit">Maximum Vertices</Label>
            <Input
              id="vertex-limit"
              type="number"
              value={localVertexLimit}
              onChange={(e) => {
                  const newLimit = Number.parseInt(e.target.value) || 100;
                  setLocalVertexLimit(newLimit);
                  updateSetting("vertexLimit", newLimit); // Ensure settings are updated immediately
              }}
              min="1"
              max="10000"
            />
            <p className="text-xs text-slate-500">Limit the number of artists shown in the graph</p>
          </div>

          <div className="space-y-2">
            <Label>Shrinking Method</Label>
            <Select
              value={settings.shrinkMethod}
              onValueChange={(value: "degree" | "random") => updateSetting("shrinkMethod", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="degree">Remove Lowest Degree</SelectItem>
                <SelectItem value="random">Remove Randomly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">How to reduce the graph size when over the vertex limit</p>
          </div>

          <div className="space-y-2">
            <Label>Layout Algorithm</Label>
            <Select value={settings.layout} onValueChange={(value: any) => updateSetting("layout", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spring">Spring Layout</SelectItem>
                <SelectItem value="circular">Circular Layout</SelectItem>
                <SelectItem value="shell">Shell Layout</SelectItem>
                <SelectItem value="random">Random Layout</SelectItem>
                <SelectItem value="kamada">Kamada Kawai Layout</SelectItem>
                <SelectItem value="fruchterman">Fruchterman Reingold Layout</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Algorithm used to position nodes in the graph</p>
          </div>
        </div>

        {/* Aesthetic Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Aesthetic Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-labels">Show Artist Names</Label>
              <Switch
                id="show-labels"
                checked={settings.showLabels}
                onCheckedChange={(checked) => updateSetting("showLabels", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-weights">Show Collaboration Counts</Label>
              <Switch
                id="show-weights"
                checked={settings.showWeights}
                onCheckedChange={(checked) => updateSetting("showWeights", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="dynamic-mode">Dynamism</Label>
              <Switch
                id="dynamic-mode"
                checked={settings.dynamicMode}
                onCheckedChange={(checked) => updateSetting("dynamicMode", checked)}
              />
            </div>

          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={() => {
          onSettingsChange({ ...settings, vertexLimit: localVertexLimit });
          onGenerate();
        }} disabled={isLoading} className="w-full" size="lg">
          <Play className="h-4 w-4 mr-2" />
          Generate Graph
        </Button>
        <div className="text-xs text-slate-500 text-center mt-2">
          Some graphs may require you to press twice to confirm.
          {/* THIS IS OBVIOUSLY A *BUG*, not supposed to be there at all, happens somewhat RANDOMLY */}
        </div>
        <ExportControls graphData={graphData} settings={settings} />

      </CardContent>
    </Card>
  );
}
