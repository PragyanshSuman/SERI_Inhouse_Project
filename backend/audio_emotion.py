import torch
import librosa
import numpy as np
from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor

# Load Speech Emotion Recognition model
# This model classifies into: Angry, Happy, Neutral, Sad, Disgust, Fear
MODEL_ID = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
print(f"Loading SER model: {MODEL_ID}...")

device = "cuda" if torch.cuda.is_available() else "cpu"
feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_ID)
model = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_ID).to(device)

print("SER model loaded successfully.")

# Map model outputs to human readable emotions
# Note: The specific mapping varies by model, for this specific one:
LABEL_MAP = {
    0: "angry",
    1: "disgust",
    2: "fear",
    3: "happy",
    4: "neutral",
    5: "sad",
    6: "surprise" # Some variants include surprise
}

def analyze_audio_emotion(audio_path: str):
    """
    Analyzes emotion from an audio file using Wav2Vec2-SER.
    """
    try:
        # 1. Load and Preprocess Audio (Resample to 16kHz)
        speech, sr = librosa.load(audio_path, sr=16000)
        
        # Check for silence
        if np.max(np.abs(speech)) < 0.005:
            return {
                "face_detected": False,
                "audio_detected": True,
                "dominant_emotion": "Silent",
                "concentration_index": 0,
                "confidence": 0,
                "state": "Unknown"
            }

        # 2. Extract Features
        inputs = feature_extractor(speech, sampling_rate=16000, return_tensors="pt", padding=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}

        # 3. Model Inference
        with torch.no_grad():
            logits = model(**inputs).logits
        
        # 4. Process Results
        scores = torch.nn.functional.softmax(logits, dim=-1)[0]
        max_idx = torch.argmax(scores).item()
        confidence = float(scores[max_idx])
        
        dominant_emotion = LABEL_MAP.get(max_idx, "neutral")

        # 5. Calculate Concentration Index (similar logic to face)
        emotions_dict = {LABEL_MAP.get(i, f"class_{i}"): float(scores[i]) for i in range(len(scores))}
        
        neutral_score = emotions_dict.get("neutral", 0) * 100
        happy_score = emotions_dict.get("happy", 0) * 80
        surprise_score = emotions_dict.get("surprise", 0) * 50
        
        sad_score = emotions_dict.get("sad", 0) * 80
        angry_score = emotions_dict.get("angry", 0) * 100
        fear_score = emotions_dict.get("fear", 0) * 100
        disgust_score = emotions_dict.get("disgust", 0) * 100
        
        positive_engagement = neutral_score + happy_score + surprise_score
        negative_distraction = sad_score + angry_score + fear_score + disgust_score
        
        concentration = max(0, min(100, positive_engagement - negative_distraction * 0.4))

        state = "Focused"
        if dominant_emotion in ["angry", "fear", "disgust"]:
            state = "Frustrated"
        elif dominant_emotion == "sad":
            state = "Discouraged"
        elif dominant_emotion == "happy":
            state = "Engaged"

        return {
            "face_detected": False,
            "audio_detected": True,
            "dominant_emotion": dominant_emotion,
            "concentration_index": round(concentration),
            "confidence": round(confidence, 3),
            "state": state,
            "emotions": {k: round(v, 3) for k, v in emotions_dict.items()}
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Error analyzing audio emotion: {str(e)}"}
