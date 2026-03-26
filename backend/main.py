import os
import shutil
import tempfile
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from scoring import evaluate_pronunciation
from pydantic import BaseModel
from emotion_analysis import analyze_emotion_from_base64
from audio_emotion import analyze_audio_emotion
import models
from database import engine
from routers import auth_router, analytics_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

class EmotionRequest(BaseModel):
    image_base64: str

# Enable CORS for React Native development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(analytics_router.router)

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}

@app.post("/analyze-emotion")
async def analyze_emotion_api(req: EmotionRequest):
    """
    Receives a Base64 image and returns the emotion analysis and concentration index.
    """
    result = analyze_emotion_from_base64(req.image_base64)
    return result

@app.post("/analyze-audio-emotion")
async def analyze_audio_emotion_api(audio: UploadFile = File(...)):
    """
    Analyzes emotion from an uploaded audio file.
    Used as a fallback when face detection fails.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        shutil.copyfileobj(audio.file, temp_audio)
        temp_audio_path = temp_audio.name

    try:
        result = analyze_audio_emotion(temp_audio_path)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

@app.post("/evaluate")
async def evaluate(word: str = Form(...), audio: UploadFile = File(...)):
    """
    Evaluates the pronunciation of a word from an uploaded audio file.
    """
    # Create a temporary file to save the uploaded audio
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        shutil.copyfileobj(audio.file, temp_audio)
        temp_audio_path = temp_audio.name

    try:
        # Run the scoring logic
        result = evaluate_pronunciation(word, temp_audio_path)
        print(f"Processed audio saved at: {temp_audio_path}")
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    # finally:
    #     # Clean up the temporary file
    #     if os.path.exists(temp_audio_path):
    #         os.remove(temp_audio_path)

if __name__ == "__main__":
    import uvicorn
    # Listen on all interfaces so the phone/emulator can connect
    uvicorn.run(app, host="0.0.0.0", port=8000)
