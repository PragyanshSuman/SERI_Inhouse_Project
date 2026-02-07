import os
import shutil
import tempfile
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from scoring import evaluate_pronunciation

app = FastAPI()

# Enable CORS for React Native development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Phonic Check Backend is running!"}

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
