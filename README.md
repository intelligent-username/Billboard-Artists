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

    # Activate a virtual environment
        .venv\Scripts\activate  # On Windows
    
        source .venv/bin/activate  # On macOS/Linux 

        conda create -n billboard-env python=3.10  # If using conda
        conda activate billboard-env

    pip install -r requirements.txt
    uvicorn app:app --reload
    ```

    In future runs, you just need to     `uvicorn app:app --reload`

   The backend can be accessed at [http://localhost:8000](http://localhost:8000).

   (Make sure no other processes are running at that location.)

3. In a new terminal, run the development server for the frontend:

    ```bash
    npm run dev
    # or, to not run in development mode:
    npm run build
    ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
