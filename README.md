# Billboard Collaboration Analysis

This project visualizes artist collaborations from the Billboard Global 200 charts.

## Features

- Interactive graph visualization of artist collaborations.
- Customizable graph settings, including layout, vertex limit, and more.
- Light and dark themes.
- Export the graph as a PNG image or JSON data.

## Tech Stack

- Next.js
- React
- TypeScript
- D3.js
- Tailwind CSS
- Python for data processing

## Getting Started

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

   The backend will be available at [http://localhost:8000](http://localhost:8000).

3. In a new terminal, run the development server for the frontend:

    ```bash
    npm run dev
    ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
