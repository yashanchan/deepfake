"""
Deepfake Detection Model Architecture
Extracted from the Unified Deepfake Training notebook.

This module contains the ResNet-LSTM-Transformer model architecture
for unified deepfake detection on both images and videos.
"""

import torch
import torch.nn as nn
import torchvision.models as models
import math
import cv2
import numpy as np
from PIL import Image
from torchvision import transforms
import mediapipe as mp
from typing import Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class PositionalEncoding(nn.Module):
    """
    Positional encoding for transformer layers.
    """
    
    def __init__(self, d_model: int, dropout: float = 0.1, max_len: int = 5000):
        super(PositionalEncoding, self).__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                           (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        return self.dropout(x + self.pe[:x.size(0), :])


class ResNetLSTMTransformer(nn.Module):
    """
    Unified deepfake detection model using ResNet50 + LSTM + Transformer architecture.
    
    This model can handle both images and videos:
    - Images: ResNet50 → Classifier
    - Videos: ResNet50 → LSTM → Transformer → Classifier
    """
    
    def __init__(
        self, 
        num_classes: int = 1, 
        d_model: int = 512, 
        nhead: int = 8, 
        num_encoder_layers: int = 3, 
        dim_feedforward: int = 1024, 
        freeze_resnet: bool = True
    ):
        super(ResNetLSTMTransformer, self).__init__()
        
        # ResNet50 backbone
        resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        if freeze_resnet:
            for param in resnet.parameters():
                param.requires_grad = False
        
        # Remove the final classification layer
        self.resnet_features = nn.Sequential(*list(resnet.children())[:-1])
        
        # LSTM for temporal modeling in videos
        self.lstm = nn.LSTM(
            input_size=2048,  # ResNet50 feature size
            hidden_size=d_model,
            num_layers=2,
            batch_first=True,
            bidirectional=True
        )
        
        # Linear layer to reduce LSTM output dimensions
        self.lstm_output_layer = nn.Linear(d_model * 2, d_model)
        
        # Positional encoding for transformer
        self.pos_encoder = PositionalEncoding(d_model=d_model)
        
        # Transformer encoder
        encoder_layers = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layers, 
            num_layers=num_encoder_layers
        )
        
        # Classifiers
        self.classifier_video = nn.Sequential(
            nn.Linear(d_model, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )
        
        self.classifier_image = nn.Sequential(
            nn.Linear(2048, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )
        
        self.d_model = d_model
    
    def forward(self, x):
        """
        Forward pass for both images and videos.
        
        Args:
            x: Input tensor
                - For images: (batch_size, channels, height, width)
                - For videos: (batch_size, seq_length, channels, height, width)
        
        Returns:
            Output tensor with shape (batch_size, num_classes)
        """
        is_video = x.dim() == 5
        
        if is_video:
            # Video processing: ResNet → LSTM → Transformer → Classifier
            batch_size, seq_length, c, h, w = x.shape
            x = x.view(batch_size * seq_length, c, h, w)
        
        # Extract features using ResNet50
        features = self.resnet_features(x).view(x.size(0), -1)
        
        if is_video:
            # Reshape for LSTM processing
            features = features.view(batch_size, seq_length, -1)
            
            # LSTM processing
            lstm_output, _ = self.lstm(features)
            features = self.lstm_output_layer(lstm_output)
            
            # Add positional encoding
            features = self.pos_encoder(features)
            
            # Transformer processing
            transformer_output = self.transformer_encoder(features)
            
            # Global average pooling and classification
            output = self.classifier_video(transformer_output.mean(dim=1))
        else:
            # Image processing: ResNet → Classifier
            output = self.classifier_image(features)
        
        return output


class DeepfakeDetector:
    """
    Main class for deepfake detection inference.
    Handles model loading, preprocessing, and prediction.
    """
    
    def __init__(self, model_path: str, device: Optional[str] = None):
        """
        Initialize the deepfake detector.
        
        Args:
            model_path: Path to the trained model weights (.pth file)
            device: Device to run inference on ('cuda' or 'cpu')
        """
        self.device = torch.device(device if device else 
                                 ('cuda' if torch.cuda.is_available() else 'cpu'))
        logger.info(f"Using device: {self.device}")
        
        # Initialize MediaPipe face detection
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1, 
            min_detection_confidence=0.5
        )
        
        # Initialize transforms
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        
        # Load model
        self.model = self._load_model(model_path)
        
        # Confidence thresholds
        self.uncertain_low = 0.40
        self.uncertain_high = 0.60
    
    def _load_model(self, model_path: str) -> ResNetLSTMTransformer:
        """Load the trained model from file."""
        try:
            model = ResNetLSTMTransformer().to(self.device)
            state_dict = torch.load(model_path, map_location=self.device)
            model.load_state_dict(state_dict)
            model.eval()
            logger.info("Model loaded successfully")
            return model
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def _detect_and_crop_face(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect and crop face from image using MediaPipe.
        
        Args:
            image: Input image as numpy array (RGB)
            
        Returns:
            Cropped face image or None if no face detected
        """
        # MediaPipe expects BGR, so convert from RGB
        image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        results = self.face_detection.process(image_bgr)
        
        if not results.detections:
            return None
        
        # Get bounding box from the first detected face
        detection = results.detections[0]
        box = detection.location_data.relative_bounding_box
        h, w, _ = image.shape
        
        xmin = int(box.xmin * w)
        ymin = int(box.ymin * h)
        width = int(box.width * w)
        height = int(box.height * h)
        
        # Ensure coordinates are within image bounds
        xmin = max(0, xmin)
        ymin = max(0, ymin)
        width = min(width, w - xmin)
        height = min(height, h - ymin)
        
        # Crop the face
        face = image[ymin:ymin + height, xmin:xmin + width]
        
        # Resize to 224x224
        face = cv2.resize(face, (224, 224))
        
        return face
    
    def _preprocess_image(self, image_path: str) -> Optional[torch.Tensor]:
        """
        Preprocess a single image for inference.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Preprocessed tensor or None if no face detected
        """
        try:
            # Load image
            image = Image.open(image_path).convert('RGB')
            image_np = np.array(image)
            
            # Detect and crop face
            face = self._detect_and_crop_face(image_np)
            if face is None:
                logger.warning("No face detected in image")
                return None
            
            # Convert to PIL and apply transforms
            face_pil = Image.fromarray(face)
            tensor = self.transform(face_pil)
            
            return tensor.unsqueeze(0)  # Add batch dimension
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return None
    
    def _preprocess_video(self, video_path: str, num_frames: int = 20) -> Optional[torch.Tensor]:
        """
        Preprocess video for inference by extracting and processing frames.
        
        Args:
            video_path: Path to the video file
            num_frames: Number of frames to extract
            
        Returns:
            Preprocessed tensor or None if no faces detected
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.error("Could not open video file")
                return None
            
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            if fps == 0:
                logger.error("Invalid video FPS")
                cap.release()
                return None
            
            # Calculate frame stride for 10 FPS extraction
            frame_stride = int(fps / 10)
            if frame_stride == 0:
                frame_stride = 1
            
            frames = []
            current_frame = 0
            saved_count = 0
            
            while saved_count < num_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if current_frame % frame_stride == 0:
                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    
                    # Detect and crop face
                    face = self._detect_and_crop_face(frame_rgb)
                    if face is not None:
                        # Convert to PIL and apply transforms
                        face_pil = Image.fromarray(face)
                        tensor = self.transform(face_pil)
                        frames.append(tensor)
                        saved_count += 1
                
                current_frame += 1
            
            cap.release()
            
            if len(frames) == 0:
                logger.warning("No faces detected in video")
                return None
            
            # Pad or truncate to exact number of frames
            if len(frames) < num_frames:
                # Repeat last frame to pad
                last_frame = frames[-1]
                frames.extend([last_frame] * (num_frames - len(frames)))
            elif len(frames) > num_frames:
                # Truncate to required number
                frames = frames[:num_frames]
            
            # Stack frames into tensor
            video_tensor = torch.stack(frames).unsqueeze(0)  # Add batch dimension
            
            return video_tensor
            
        except Exception as e:
            logger.error(f"Error preprocessing video: {e}")
            return None
    
    def predict(self, file_path: str) -> Dict[str, Any]:
        """
        Predict whether the input media is real or fake.
        
        Args:
            file_path: Path to image or video file
            
        Returns:
            Dictionary containing prediction results
        """
        # Determine if input is video or image
        video_extensions = ['.mp4', '.avi', '.mov', '.mkv']
        is_video = any(file_path.lower().endswith(ext) for ext in video_extensions)
        
        # Preprocess input
        if is_video:
            input_tensor = self._preprocess_video(file_path)
            media_type = 'video'
        else:
            input_tensor = self._preprocess_image(file_path)
            media_type = 'image'
        
        if input_tensor is None:
            return {
                'success': False,
                'error': 'No face detected in the media',
                'media_type': media_type
            }
        
        # Run inference
        try:
            with torch.no_grad():
                input_tensor = input_tensor.to(self.device)
                output = self.model(input_tensor)
                prob_fake = torch.sigmoid(output).item()
            
            # Determine prediction and confidence
            if prob_fake >= 0.5:
                prediction = "FAKE"
                confidence = prob_fake
            else:
                prediction = "REAL"
                confidence = 1 - prob_fake
            
            return {
                'success': True,
                'prediction': prediction,
                'confidence': confidence,
                'probability_fake': prob_fake,
                'media_type': media_type,
                'file_name': file_path.split('/')[-1]
            }
            
        except Exception as e:
            logger.error(f"Error during inference: {e}")
            return {
                'success': False,
                'error': f'Inference failed: {str(e)}',
                'media_type': media_type
            }
