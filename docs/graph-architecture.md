# Graph Architecture

This document outlines the architecture of the graph visualization feature.

## Data Flow

1.  **Data Scraping:** Raw data is scraped from Billboard.com.
2.  **Initial Cleaning:** `initial_cleaner.py` removes duplicate songs.
3.  **Data Processing:** `data_processor.py` builds the collaboration graph.
4.  **API Endpoint:** The Next.js API endpoint at `/api/graph/generate` serves the graph data.
5.  **Frontend:** The React frontend fetches and renders the graph using D3.js.

## Components

-   `GraphVisualization`: The main component for rendering the graph.
-   `GraphSettings`: The component for controlling graph settings.
-   `DataPanel`: The component for displaying data status and download links.
-   `ExportControls`: The component for exporting the graph as an image or JSON.

## Hooks

-   `useD3Graph`: A custom hook for managing the D3.js simulation and rendering.

## Types

-   `lib/types/graph.ts`: Contains all the shared types for the graph data and settings.
