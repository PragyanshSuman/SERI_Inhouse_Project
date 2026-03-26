import cv2
import numpy as np
import base64
from fer.fer import FER

# Initialize the FER model globally so it's only loaded once
detector = FER(mtcnn=True)

def analyze_emotion_from_base64(base64_string: str):
    """
    Decodes a base64 string, converts it to an OpenCV image,
    and uses the FER library to detect emotions.
    """
    try:
        # Strip the data:image/jpeg;base64, prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # Decode base64 to bytes
        img_data = base64.b64decode(base64_string)
        
        # Convert bytes to numpy array
        nparr = np.frombuffer(img_data, np.uint8)
        
        # Decode numpy array to image
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Failed to decode image from base64 string."}

        # Run emotion detection
        # The result is a list of dictionaries with 'box' and 'emotions'
        result = detector.detect_emotions(img)
        
        if not result:
            return {
                "face_detected": False,
                "dominant_emotion": "Unknown",
                "concentration_index": 0,
                "emotions": {}
            }
            
        # Get the first face detected (assuming one user)
        face = result[0]
        emotions = face["emotions"]
        
        # Determine dominant emotion
        dominant_emotion = max(emotions, key=emotions.get)
        
        # Calculate a pseudo "Concentration Index" (0-100)
        # We assume Neutral and Happy correlate with engagement/concentration
        # Angry, Disgust, Fear, Sad, limit concentration. Surprised is ambiguous but often means engaged.
        neutral_score = emotions.get("neutral", 0) * 100
        happy_score = emotions.get("happy", 0) * 70
        surprise_score = emotions.get("surprise", 0) * 50
        
        # Negative emotions drop the score
        sad_score = emotions.get("sad", 0) * 80
        angry_score = emotions.get("angry", 0) * 100
        fear_score = emotions.get("fear", 0) * 100
        disgust_score = emotions.get("disgust", 0) * 100
        
        # Base concentration
        positive_engagement = neutral_score + happy_score + surprise_score
        negative_distraction = sad_score + angry_score + fear_score + disgust_score
        
        # Formula: Base engagement heavily penalized by negative distraction
        concentration = max(0, min(100, positive_engagement - negative_distraction * 0.5))
        
        # Provide a Dyslexia/Learning friendly Context String
        state = "Focused"
        if dominant_emotion in ["sad", "angry", "fear"]:
            state = "Frustrated"
        elif dominant_emotion == "happy":
            state = "Engaged"
            
        return {
            "face_detected": True,
            "dominant_emotion": dominant_emotion,
            "concentration_index": round(concentration),
            "state": state,
            "emotions": {k: round(v, 3) for k, v in emotions.items()}
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Error analyzing emotion: {str(e)}"}
