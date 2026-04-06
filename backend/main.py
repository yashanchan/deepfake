"""
FastAPI Backend for Deepfake Detection
This server handles media uploads and runs inference using the trained ResNet-LSTM-Transformer model.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import cv2
import numpy as np
from pathlib import Path
import tempfile
import logging
from typing import Dict, Any
import os

# Import our custom model
from models.deepfake_model import DeepfakeDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deepfake Detection API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model
detector = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def validate_file_type(file: UploadFile) -> bool:
    """
    Validate if the uploaded file is a supported image or video format.
    
    Args:
        file: Uploaded file
        
    Returns:
        True if file type is supported, False otherwise
    """
    allowed_image_types = ["image/png", "image/jpeg", "image/jpg"]
    allowed_video_types = ["video/mp4", "video/avi", "video/mov", "video/mkv"]
    
    return file.content_type in allowed_image_types + allowed_video_types


def validate_file_size(file: UploadFile) -> bool:
    """
    Validate if the uploaded file size is within limits.
    
    Args:
        file: Uploaded file
        
    Returns:
        True if file size is acceptable, False otherwise
    """
    allowed_image_types = ["image/png", "image/jpeg", "image/jpg"]
    max_size = 100 * 1024 * 1024  # 100MB for videos
    if file.content_type in allowed_image_types:
        max_size = 10 * 1024 * 1024  # 10MB for images
    
    # Read file content to check size
    content = file.file.read()
    file.file.seek(0)  # Reset file pointer
    
    return len(content) <= max_size


@app.on_event("startup")
async def startup_event():
    """Initialize model on startup."""
    global detector
    
    # Path to the trained model weights
    model_path = "models/best_unified_model.pth"
    
    # Check if model file exists
    if not os.path.exists(model_path):
        logger.error(f"Model file not found at: {model_path}")
        logger.error("Please ensure the trained model file is placed in the models/ directory")
        return
    
    try:
        detector = DeepfakeDetector(model_path, device=str(device))
        logger.info("Deepfake detector loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        detector = None


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "message": "Deepfake Detection API",
        "device": str(device),
        "model_loaded": detector is not None
    }


@app.post("/analyze")
async def analyze_media(file: UploadFile = File(...)):
    """
    Analyze uploaded image or video for deepfake detection.
    
    Args:
        file: Uploaded media file (image or video)
        
    Returns:
        JSON with prediction result and confidence
    """
    if not detector:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    # Validate file type
    if not validate_file_type(file):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Supported types: images (PNG, JPEG) and videos (MP4, AVI, MOV, MKV)"
        )
    
    # Validate file size
    if not validate_file_size(file):
        allowed_image_types = ["image/png", "image/jpeg", "image/jpg"]
        max_size = 100 if file.content_type not in allowed_image_types else 10
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {max_size}MB"
        )
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Run prediction using our detector
        result = detector.predict(tmp_path)
        
        # Clean up temporary file
        Path(tmp_path).unlink()
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Format response
        response = {
            "prediction": result['prediction'],
            "confidence": result['confidence'],
            "probability_fake": result['probability_fake'],
            "media_type": result['media_type'],
            "file_name": result['file_name']
        }
        
        logger.info(f"Analysis complete: {response}")
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": detector is not None,
        "device": str(device),
        "cuda_available": torch.cuda.is_available(),
        "model_path": "models/best_unified_model.pth"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
