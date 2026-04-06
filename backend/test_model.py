#!/usr/bin/env python3
"""
Test script for the deepfake detection model.
This script tests the model loading and basic functionality.
"""

import os
import sys
import torch
import logging
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.deepfake_model import DeepfakeDetector, ResNetLSTMTransformer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_model_architecture():
    """Test if the model architecture can be instantiated."""
    logger.info("Testing model architecture...")
    
    try:
        model = ResNetLSTMTransformer()
        logger.info("✅ Model architecture created successfully")
        
        # Test with dummy inputs
        # Test image input (batch_size=1, channels=3, height=224, width=224)
        dummy_image = torch.randn(1, 3, 224, 224)
        output_image = model(dummy_image)
        logger.info(f"✅ Image inference test passed. Output shape: {output_image.shape}")
        
        # Test video input (batch_size=1, seq_length=20, channels=3, height=224, width=224)
        dummy_video = torch.randn(1, 20, 3, 224, 224)
        output_video = model(dummy_video)
        logger.info(f"✅ Video inference test passed. Output shape: {output_video.shape}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Model architecture test failed: {e}")
        return False


def test_model_loading():
    """Test if the trained model can be loaded."""
    logger.info("Testing model loading...")
    
    model_path = "models/best_unified_model.pth"
    
    # Check if model file exists
    if not os.path.exists(model_path):
        logger.warning(f"⚠️ Model file not found at: {model_path}")
        logger.warning("Please ensure you have downloaded the trained model from Colab")
        return False
    
    try:
        # Test loading the model
        detector = DeepfakeDetector(model_path)
        logger.info("✅ Model loaded successfully")
        
        # Test device detection
        logger.info(f"✅ Using device: {detector.device}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Model loading test failed: {e}")
        return False


def test_dependencies():
    """Test if all required dependencies are available."""
    logger.info("Testing dependencies...")
    
    required_packages = [
        'torch',
        'torchvision', 
        'cv2',
        'numpy',
        'PIL',
        'mediapipe',
        'fastapi',
        'uvicorn'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'cv2':
                import cv2
            elif package == 'PIL':
                from PIL import Image
            else:
                __import__(package)
            logger.info(f"✅ {package} is available")
        except ImportError:
            missing_packages.append(package)
            logger.error(f"❌ {package} is missing")
    
    if missing_packages:
        logger.error(f"Missing packages: {missing_packages}")
        logger.error("Please install missing packages with: pip install -r requirements.txt")
        return False
    
    return True


def test_mediapipe():
    """Test MediaPipe face detection."""
    logger.info("Testing MediaPipe face detection...")
    
    try:
        import mediapipe as mp
        import numpy as np
        
        # Initialize MediaPipe
        mp_face_detection = mp.solutions.face_detection
        face_detection = mp_face_detection.FaceDetection(
            model_selection=1, 
            min_detection_confidence=0.5
        )
        
        # Create a dummy image (white image)
        dummy_image = np.ones((224, 224, 3), dtype=np.uint8) * 255
        
        # Test face detection
        results = face_detection.process(dummy_image)
        logger.info("✅ MediaPipe face detection initialized successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ MediaPipe test failed: {e}")
        return False


def main():
    """Run all tests."""
    logger.info("🧪 Starting Deepfake Detection Model Tests")
    logger.info("=" * 50)
    
    tests = [
        ("Dependencies", test_dependencies),
        ("MediaPipe", test_mediapipe),
        ("Model Architecture", test_model_architecture),
        ("Model Loading", test_model_loading),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        logger.info(f"\n🔍 Running {test_name} test...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info("\n" + "=" * 50)
    logger.info("📊 Test Results Summary:")
    logger.info("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed! The model is ready to use.")
        return True
    else:
        logger.warning("⚠️ Some tests failed. Please check the issues above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
