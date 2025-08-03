# Billboard Collaboration Analysis

This project visualizes artist collaborations from the Billboard Global 200 charts.

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

2. Set up and run the backend (Python):

    ```bash
    cd backend
    python -m venv .venv
    .venv\Scripts\activate  # On Windows
    pip install -r requirements.txt
    uvicorn app:app --reload
    ```

    In future runs, just navigate to the backend folder and run the FastAPI backend:
    `uvicorn app:app --reload`

   The backend will be available at [http://localhost:8000](http://localhost:8000).
   Make sure no other processes are running at that location.

3. In a new terminal, run the development server for the frontend:

    ```bash
    npm run dev
    ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
