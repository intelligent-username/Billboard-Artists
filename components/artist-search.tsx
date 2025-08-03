"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface ArtistSearchProps {
  onSearch: (query: string) => Promise<string[]>;
  onSelect: (artist: string) => void;
  onClear?: () => void;
}

const ArtistSearch: React.FC<ArtistSearchProps> = ({ onSearch, onSelect, onClear }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await onSearch(query);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, onSearch]);

  // Auto-search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim() && query !== selectedArtist) {
        handleSearch();
      } else if (!query.trim()) {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedArtist, handleSearch]);



  const handleSelect = (artist: string) => {
    onSelect(artist);
    setResults([]);
    setQuery(artist); // Show selected artist in search box
    setSelectedArtist(artist);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSelectedArtist(null);
    if (onClear) {
      onClear();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear selected artist if user is typing something different
    if (selectedArtist && newQuery !== selectedArtist) {
      setSelectedArtist(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Search for an artist..."
          value={query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isLoading} size="sm">
          <Search className="h-4 w-4" />
        </Button>
        {selectedArtist && (
          <Button onClick={handleClear} variant="outline" size="sm">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border rounded-md bg-background">
          {results.map((artist) => (
            <div
              key={artist}
              className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
              onClick={() => handleSelect(artist)}
            >
              {artist}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistSearch;