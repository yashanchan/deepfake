"""
FastAPI Backend for Deepfake Detection
This server handles media uploads and runs inference using the trained ResNet-LSTM-Transformer model.
"""

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import cv2
import numpy as np
from pathlib import Path
import logging
from typing import Dict, Any
import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file (for Cloudinary keys, etc)
load_dotenv()

# Import our custom model
from models.deepfake_model import DeepfakeDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deepfake Detection API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://deepguard-one.vercel.app"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model
detector = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class AnalyzeRequest(BaseModel):
    cloudinary_url: str


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
async def analyze_media(request: AnalyzeRequest):
    """
    Analyze image or video for deepfake detection from a Cloudinary URL.
    
    Args:
        request: Request body containing the Cloudinary URL
        
    Returns:
        JSON with prediction result and confidence
    """
    if not detector:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    url = request.cloudinary_url
    if not url:
        raise HTTPException(status_code=400, detail="Cloudinary URL is required")
        
    try:
        # Run prediction using our detector (streams from cloud)
        result = detector.predict(url)
        
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
    uvicorn.run(app, host="0.0.0.0", port=7860)
