"""
FastAPI backend for Billboard Artists collaboration graph.
For now, handles data updates & PNG generation.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, List
import logging
import tempfile
import os

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from data_access import DataAccessLayer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Billboard Artists API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base paths
BASE_DIR = Path(__file__).parent
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"

# Ensure static directory exists
STATIC_DIR.mkdir(exist_ok=True)

# Initialize Data Access Layer
try:
    dal = DataAccessLayer(DATA_DIR / "collaborations.json", DATA_DIR / "songs_to_artists.json")
except Exception as e:
    logger.error(f"Failed to initialize DAL: {e}")
    dal = None

class GraphSettings(BaseModel):
    """Graph settings for PNG generation"""
    vertexLimit: int = 10
    shrinkMethod: str = "degree"
    layout: str = "spring"
    showLabels: bool = True
    showWeights: bool = False

class UpdateStatus:
    """Track update status"""
    def __init__(self):
        self.is_running = False
        self.current_step = ""
        self.error = None
        self.completed = False

update_status = UpdateStatus()

def run_script(script_name: str, *args) -> subprocess.CompletedProcess:
    """Run a Python script with error handling"""
    script_path = SCRIPTS_DIR / script_name
    if not script_path.exists():
        raise FileNotFoundError(f"Script {script_name} not found")
    
    cmd = [sys.executable, str(script_path)] + list(args)
    logger.info(f"Running command: {' '.join(cmd)}")
    
    # Change to scripts directory so relative paths work
    return subprocess.run(
        cmd, 
        cwd=SCRIPTS_DIR,
        capture_output=True, 
        text=True, 
        check=True
    )

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Billboard Artists API is running"}

@app.get("/api/search")
async def search_artists(query: str) -> List[str]:
    """Searches for artists whose names contain the query string."""
    if dal is None:
        raise HTTPException(status_code=503, detail="Data service not available")
    try:
        results = dal.search_artists(query)
        return results
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/artist/{artist_name}/connections")
async def get_artist_connections(artist_name: str, degree: int = 1) -> Dict[str, Dict]:
    """Retrieves connections for a specific artist up to specified degree."""
    if dal is None:
        raise HTTPException(status_code=503, detail="Data service not available")
    
    # Validate degree parameter
    if degree < 1:
        raise HTTPException(status_code=400, detail="Degree must be at least 1")
    if degree > 5:  # Limit to prevent excessive computation
        raise HTTPException(status_code=400, detail="Degree cannot exceed 5")
    
    try:
        connections = dal.get_artist_connections(artist_name, degree=degree)
        # Check if artist exists in data (even with no connections)
        if not dal.artist_exists(artist_name):
            raise HTTPException(
                status_code=404, detail=f"Artist not found: {artist_name}"
            )
        return connections
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get connections: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/artist/{artist_name}/connections-graph")
async def get_artist_connections_graph(artist_name: str, degree: int = 1) -> Dict:
    """Retrieves the complete graph structure for an artist's connections up to specified degree."""
    if dal is None:
        raise HTTPException(status_code=503, detail="Data service not available")
    
    # Validate degree parameter
    if degree < 1:
        raise HTTPException(status_code=400, detail="Degree must be at least 1")
    if degree > 5:  # Limit to prevent excessive computation
        raise HTTPException(status_code=400, detail="Degree cannot exceed 5")
    
    try:
        graph_data = dal.get_artist_connections_graph(artist_name, degree=degree)
        # Check if artist exists in data (even with no connections)
        if not dal.artist_exists(artist_name):
            raise HTTPException(
                status_code=404, detail=f"Artist not found: {artist_name}"
            )
        return graph_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get connections graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/update-status")
async def get_update_status():
    """Get the current status of data update"""
    return {
        "is_running": update_status.is_running,
        "current_step": update_status.current_step,
        "error": update_status.error,
        "completed": update_status.completed
    }

def update_data_task():
    """Background task to update data"""
    global update_status
    
    try:
        update_status.is_running = True
        update_status.error = None
        update_status.completed = False
        
        # Step 1: Scrape new data
        update_status.current_step = "Scraping Billboard data..."
        logger.info("Starting data scraping")
        run_script("scraper.py")
        
        # Step 2: Clean the data
        update_status.current_step = "Cleaning data..."
        logger.info("Starting data cleaning")
        run_script("initial_cleaner.py")
        
        # Step 3: Process into JSON format
        update_status.current_step = "Processing collaborations..."
        logger.info("Starting data processing")
        run_script("data_processor.py")
        
        update_status.current_step = "Update completed successfully"
        update_status.completed = True
        logger.info("Data update completed successfully")
        
    except subprocess.CalledProcessError as e:
        error_msg = f"Script failed: {e.stderr or e.stdout or str(e)}"
        logger.error(error_msg)
        update_status.error = error_msg
        update_status.current_step = f"Error: {error_msg}"
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        update_status.error = error_msg
        update_status.current_step = f"Error: {error_msg}"
        
    finally:
        update_status.is_running = False

@app.post("/api/update-data")
async def update_data(background_tasks: BackgroundTasks):
    """Trigger data update process"""
    if update_status.is_running:
        raise HTTPException(status_code=409, detail="Update already in progress")
    
    # Reset status
    update_status.completed = False
    update_status.error = None
    
    # Start background task
    background_tasks.add_task(update_data_task)
    
    return {"status": "Update started", "message": "Check /api/update-status for progress"}

@app.post("/api/generate-png")
async def generate_png(svg_data: Dict[str, Any]):
    """Generate PNG from SVG data using Selenium"""
    try:
        svg_content = svg_data.get("svg")
        if not svg_content:
            raise HTTPException(status_code=400, detail="SVG content is required")

        # Create temporary SVG file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.svg', delete=False, encoding='utf-8') as temp_svg:
            temp_svg.write(svg_content)
            temp_svg_path = temp_svg.name

        try:
            # Output PNG path
            output_png = STATIC_DIR / f"graph_{os.getpid()}_{os.urandom(4).hex()}.png"

            # Call updated image_maker.py
            result = subprocess.run([
                sys.executable,
                str(SCRIPTS_DIR / "image_maker.py"),
                temp_svg_path,
                str(output_png)
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                logger.error(f"Image conversion stderr: {result.stderr}")
                logger.error(f"Image conversion stdout: {result.stdout}")
                raise HTTPException(status_code=500, detail=f"Image conversion failed: {result.stderr}")

            if not output_png.exists():
                raise HTTPException(status_code=500, detail="PNG file was not created")

            return FileResponse(
                output_png,
                media_type="image/png",
                filename=f"collaboration-graph-{svg_data.get('timestamp', 'export')}.png"
            )
        finally:
            # Clean up temporary SVG file
            if os.path.exists(temp_svg_path):
                os.unlink(temp_svg_path)
            
    except Exception as e:
        logger.error(f"PNG generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PNG generation failed: {str(e)}")

@app.get("/api/data/download/{filename}")
async def download_data_file(filename: str):
    """Download data files"""
    allowed_files = {
        "billboard_global_200.csv",
        "cleaned.csv", 
        "collaborations.json",
        "songs_to_artists.json"
    }
    
    if filename not in allowed_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = DATA_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path, filename=filename)

@app.post("/api/graph/generate")
async def generate_graph(settings: Dict[str, Any]):
    """
    Generate graph data as JSON for the frontend.
    """
    try:
        # Path to processed data
        data_path = DATA_DIR / "collaborations.json"
        if not data_path.exists():
            raise HTTPException(status_code=404, detail="Collaborations data not found")

        # Load the data
        with open(data_path, "r", encoding="utf-8") as f:
            collaborations = json.load(f)

        # --- Transform collaborations to nodes/edges ---
        # This logic should match what your frontend did before.
        # Example assumes collaborations is a dict: { artist: { collaborator: count, ... }, ... }
        nodes = []
        edges = []
        node_set = set()

        # Apply settings (e.g., vertexLimit)
        vertex_limit = settings.get("vertexLimit", 100)
        shrink_method = settings.get("shrinkMethod", "degree")

        # Sort and limit nodes by degree
        sorted_artists = sorted(collaborations.items(), key=lambda x: -sum(x[1].values()))
        limited_artists = [artist for artist, _ in sorted_artists[:vertex_limit]]

        nodes = []
        edges = []
        node_set = set()
        
        for artist in limited_artists:
            degree = sum(collaborations[artist].values())
            node_set.add(artist)
            nodes.append({
                "id": artist,
                "name": artist,
                "degree": degree
            })
        
        for artist in limited_artists:
            degree = sum(collaborations[artist].values())  # <-- Add this line
            for collaborator, weight in collaborations[artist].items():
                if collaborator in node_set:
                    edges.append({
                        "source": artist,
                        "target": collaborator,
                        "weight": weight,
                        "degree": degree,
                        "name": artist
                    })
        return JSONResponse({"nodes": nodes, "edges": edges})

    except Exception as e:
        logger.error(f"Graph generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Graph generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
