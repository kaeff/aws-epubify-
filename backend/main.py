from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
from celery import Celery
from typing import Dict, Any, Optional
import redis
import json
from datetime import datetime, timedelta

app = FastAPI(title="AWS Epubify", description="Convert AWS documentation to EPUB format")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis client for storing task status
redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, db=0)

# Celery configuration
celery_app = Celery(
    "aws_epubify",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

class ConversionRequest(BaseModel):
    url: str
    title: Optional[str] = None

class ConversionStatus(BaseModel):
    task_id: str
    status: str
    progress: int = 0
    message: str = ""
    download_url: Optional[str] = None

# In-memory storage for demo purposes (use Redis in production)
tasks: Dict[str, Dict[str, Any]] = {}

@app.get("/")
async def root():
    return {"message": "AWS Epubify API", "version": "1.0.0"}

@app.post("/convert")
async def convert_documentation(request: ConversionRequest):
    """Start conversion of AWS documentation to EPUB"""
    try:
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Store task info
        task_info = {
            "task_id": task_id,
            "url": request.url,
            "title": request.title or "AWS Documentation",
            "status": "pending",
            "progress": 0,
            "message": "Conversion queued",
            "created_at": datetime.now().isoformat()
        }
        
        tasks[task_id] = task_info
        
        # Store in Redis with expiration
        redis_client.setex(
            f"task:{task_id}",
            timedelta(hours=24),
            json.dumps(task_info)
        )
        
        # Start background task
        celery_app.send_task("convert_to_epub", args=[task_id, request.url, request.title])
        
        return {"task_id": task_id, "message": "Conversion started"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start conversion: {str(e)}")

@app.get("/status/{task_id}")
async def get_conversion_status(task_id: str):
    """Get status of conversion task"""
    try:
        # Try to get from Redis first
        task_data = redis_client.get(f"task:{task_id}")
        if task_data:
            task_info = json.loads(task_data)
            return ConversionStatus(**task_info)
        
        # Fallback to in-memory storage
        if task_id in tasks:
            return ConversionStatus(**tasks[task_id])
        
        raise HTTPException(status_code=404, detail="Task not found")
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid task data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@app.get("/download/{task_id}")
async def download_epub(task_id: str):
    """Download the generated EPUB file"""
    try:
        # Check if task exists and is completed
        task_data = redis_client.get(f"task:{task_id}")
        if not task_data:
            if task_id not in tasks:
                raise HTTPException(status_code=404, detail="Task not found")
            task_info = tasks[task_id]
        else:
            task_info = json.loads(task_data)
        
        if task_info["status"] != "completed":
            raise HTTPException(status_code=400, detail="Conversion not completed yet")
        
        # Get file path
        file_path = f"output/{task_id}.epub"
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="EPUB file not found")
        
        return FileResponse(
            file_path,
            media_type="application/epub+zip",
            filename=f"{task_info.get('title', 'aws-documentation')}.epub"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")

@app.delete("/task/{task_id}")
async def delete_task(task_id: str):
    """Delete a conversion task and its files"""
    try:
        # Remove from Redis
        redis_client.delete(f"task:{task_id}")
        
        # Remove from memory
        if task_id in tasks:
            del tasks[task_id]
        
        # Remove file if exists
        file_path = f"output/{task_id}.epub"
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {"message": "Task deleted successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)