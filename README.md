# Billboard Collaboration Analysis

This project visualizes artist collaborations from the Billboard Global 200 charts and predicts future performance.

## Features

- Collect and download latest Global 200 data from Billboard
- Graph this data via Artist connections
- Export these graphs for future use (PNG, SVG, or simple JSON)
- Find connections for specific artists

## Tech Stack

- Next.js
- React
- TypeScript
- D3.js
- Tailwind CSS
- Python for data processing

## Running the Project

1. Install frontend dependencies:

    ```bash
    npm install
    ```

2. Set up and run the (Python) backend:

    ```bash
    cd backend
    python -m venv .venv
    
    # Activate the virtual environment
    .venv\Scripts\activate  # On Windows
    source .venv/bin/activate  # On macOS/Linux
    
    # Install dependencies
    pip install -r requirements.txt
    
    # Start the backend server
    uvicorn app:app --reload
    ```

    The backend will be available at [http://localhost:8000](http://localhost:8000).

3. In a new terminal, run the development server for the frontend:

    ```bash
    npm run dev
    # or, to not run in development mode:
    npm run build
    ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Graph Architecture

For reference, here's an overview of the data flow.

#### Data Flow

1.  **Data Scraping:** Raw data is scraped from  Billboard.com.
2.  **Initial Cleaning:** `initial_cleaner.py` removes duplicate songs.
3.  **Data Processing:** `data_processor.py` builds the collaboration graph.
4.  **API Endpoint:** The Next.js API endpoint at `/api/graph/generate` serves the graph data.
5.  **Frontend:** The React frontend fetches and renders the graph using D3.js.

#### Components

-   `GraphVisualization`: The main component for rendering the graph.
-   `GraphSettings`: The component for controlling graph settings.
-   `DataPanel`: The component for displaying data status and download links.
-   `ExportControls`: The component for exporting the graph as an image or JSON.

#### Types

-   `lib/types/graph.ts`: Contains all the shared types for the graph data and settings.

Refer to here when expanding or modifying any features.

---

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
