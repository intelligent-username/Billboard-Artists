"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Users } from "lucide-react";

interface ArtistConnectionsProps {
  artistName: string | null;
  getConnections: (artist: string) => Promise<{ [artist: string]: { count: number, degree: number } }>;
}

const ArtistConnections: React.FC<ArtistConnectionsProps> = ({
  artistName,
  getConnections,
}) => {
  const [connections, setConnections] = useState<{ [artist: string]: { count: number, degree: number } } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(true);

  useEffect(() => {
    const loadConnections = async () => {
      if (!artistName) {
        setConnections(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const artistConnections = await getConnections(artistName);
        setConnections(artistConnections);
      } catch (error: any) {
        console.error("Error loading connections:", error);
        if (error.message && error.message.includes('404')) {
          setError(`Artist "${artistName}" not found in our database.`);
        } else {
          setError("Failed to load connections. Please try again.");
        }
        setConnections(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();
  }, [artistName, getConnections]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {artistName ? `Charting Connections for ${artistName}` : "Select an artist"}
          </CardTitle>
          <Switch checked={showResults} onCheckedChange={setShowResults} />
        </div>
      </CardHeader>
      <CardContent>
        {!artistName && (
          <p className="text-muted-foreground">Please search for and select an artist to see their connections.</p>
        )}
        {isLoading && (
          <p className="text-muted-foreground">Loading connections...</p>
        )}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {showResults && connections && Object.keys(connections).length === 0 && !error && (
          <p className="text-muted-foreground">No connections found for this artist.</p>
        )}
        {showResults && connections && Object.keys(connections).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              {Object.keys(connections).length} collaboration{Object.keys(connections).length !== 1 ? 's' : ''}
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {Object.entries(connections)
                .sort(([,a], [,b]) => b.count - a.count)
                .map(([connectedArtist, connectionData]) => (
                  <div key={connectedArtist} className="flex justify-between items-center p-2 bg-muted/50 rounded-sm">
                    <span className="text-sm font-medium">{connectedArtist}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                        {connectionData.count} collaboration{connectionData.count !== 1 ? 's' : ''}
                      </span>
                      {connectionData.degree > 1 && (
                        <span className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">
                          deg {connectionData.degree}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArtistConnections;
