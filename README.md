# Billboard Performance

This project visualizes artist collaborations from the Billboard Global 200 charts and predicts future performance. It was inspired by a question: do artists who collaborate with fellow artists more often tend to have better performing songs? After a small study, we found that this was indeed the case. It was decided to take this further by building a graph of artist connections and training a Graph Neural Network (GNN) to predict how well a song would perform at its debut based on the artists involved.

## Features

- Collect and download latest Global 200 data from Billboard
- Graph this data via Artist connections
- See first, second, etc. degree connections
- Export these graphs for future use (PNG, SVG, or simple JSON)
- Find connections for specific artists
- Use connection data to predict future debut performance

## Functionality

This project performs several different tasks. Each one is explained below for reference and as mini-documentation. In the future, when adding or tweaking features, I'll refer back to here and keep it updated.

### Data Collection

To collect data, we simple use BeautifulSoup4 to scrape the Billboard website for the Global 200 charts. The data is then stored in CSV files for further processing.

### Data Processing

Once the data is collected, we have a series of scripts that get rid of redundancy, regularize the data, engineer new features, and prepare it for the model. See `backend/model` for the experimental/exploratory process that went into crafting the final data-related scripts in `backend/scripts`.

### Graphing

`backend/scripts/data_processor.py` builds the collaboration graph from the cleaned data via JSONs. The graph is then using D3.js. This is done in the Next.js API route at `/api/graph/generate`. Some redundant/legacy python scripts for graph generation are present in `backend/scripts` for debugging, comparison, and just general logging, however the front end handles all of the projects actual graphihng. Understand how these graphs work and interact will help in understanding the actual trained GNN model.

### Predictive Model Design: Exploratory

See the [train.ipynb](backend/model/train.ipynb) notebook for the exploratory process that went into designing the final model. This includes feature selection, architecture design, and hyperparameter tuning. It took some "trial and error" to see the shape of the data, fit that data to a proper regressive model, design the new features for the more sophisticated network, and finally settle on a GNN architecture that could leverage the graph data.

### Predictive Model Design: Production

In production, we deploy a finalized version of the GNN with the best hyperparameters and architecture found in the exploratory phase. This is done in `backend/model/gnn_model.py`. The model is trained on the full dataset and saved for future inference. At runtime, the user can input a possible set of artists collaborating on a song and the model will accurately predict how that song will perform at its debut.

#### Disclaimer

The model is strictly predicting based off "connectivity" and "reputation", it can't account for song quality, online trends (for example, if it's used in a trend), if it's a re-release, etc. These are all factors do influence a song's performance but they are beside the point for the purposes of this project. Do not use these predictions to gamble on debuts!

## Tech Stack (Prerequisites)

- npm (Node.js)
- Python 3.8+

For everything else, run the instructions below.

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

1. **Data Scraping:** Raw data is scraped from  Billboard.com.
2. **Initial Cleaning:** `initial_cleaner.py` removes duplicate songs.
3. **Data Processing:** `data_processor.py` builds the collaboration graph.
4. **API Endpoint:** The Next.js API endpoint at `/api/graph/generate` serves the graph data.
5. **Frontend:** The React frontend fetches and renders the graph using D3.js.

#### Components

- `GraphVisualization`: The main component for rendering the graph.
- `GraphSettings`: The component for controlling graph settings.
- `DataPanel`: The component for displaying data status and download links.
- `ExportControls`: The component for exporting the graph as an image or JSON.

#### Types

- `lib/types/graph.ts`: Contains all the shared types for the graph data and settings.

Refer to here when expanding or modifying any features.

---

This project is licensed under the MIT License. See [LICENSE](LICENSE).
