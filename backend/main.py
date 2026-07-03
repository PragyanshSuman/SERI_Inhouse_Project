import os
import shutil
import tempfile
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from scoring import evaluate_pronunciation
from pydantic import BaseModel
from emotion_analysis import analyze_emotion_from_base64
from audio_emotion import analyze_audio_emotion
import models
from database import engine
from routers import auth_router, analytics_router
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
from PIL import Image, ImageDraw
import io

from simple_htr_wrapper import infer_image

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

class EmotionRequest(BaseModel):
    image_base64: str

class PdfReportRequest(BaseModel):
    report_text: str

class StrokePoint(BaseModel):
    x: float
    y: float

class RecognizeSpellingRequest(BaseModel):
    strokes: List[List[StrokePoint]]
    canvas_width: float = 340.0
    canvas_height: float = 220.0
    expected_word: str = ""

# Enable CORS for React Native development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(os.path.join(os.path.dirname(__file__), "reports_output"), exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "reports_output")), name="static")

app.include_router(auth_router.router)
app.include_router(analytics_router.router)

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}

@app.post("/recognize-spelling")
async def recognize_spelling(req: RecognizeSpellingRequest):
    """
    High-quality handwriting OCR pipeline:
    1. Render strokes at 6x scale with thick ink
    2. Auto-crop to bounding box of writing
    3. Dilate strokes for better OCR readability
    4. Run easyocr with handwriting-tuned parameters
    """
    try:
        import numpy as np
        from scipy.ndimage import binary_dilation

        w, h = int(req.canvas_width), int(req.canvas_height)
        scale = 2  # 2x is plenty for EasyOCR without making lines too thin
        print(f"[OCR] Received {len(req.strokes)} strokes. Rendering at scale {scale}...")

        # ── 1. Render thick strokes ───────────────────────────────────────
        img = Image.new('RGB', (w * scale, h * scale), color='white')
        draw = ImageDraw.Draw(img)

        # Match the React Native canvas visually (frontend strokeWidth=8)
        stroke_w = 8 * scale
        radius   = stroke_w // 2

        for stroke in req.strokes:
            if len(stroke) < 2:
                # if just a dot
                if len(stroke) == 1:
                    px, py = int(stroke[0].x * scale), int(stroke[0].y * scale)
                    draw.ellipse([px - radius, py - radius, px + radius, py + radius], fill='black')
                continue
            points = [(int(p.x * scale), int(p.y * scale)) for p in stroke]
            draw.line(points, fill='black', width=stroke_w, joint='curve')
            for px, py in points:
                draw.ellipse([px - radius, py - radius,
                              px + radius, py + radius], fill='black')

        # ── 2. Auto-crop tight around the writing ─────────────────────────
        print("[OCR] Auto-cropping...")
        arr = np.array(img)
        mask = arr.min(axis=2) < 200          # pixels darker than 200
        if mask.any():
            rows = np.any(mask, axis=1)
            cols = np.any(mask, axis=0)
            rmin, rmax = np.where(rows)[0][[0, -1]]
            cmin, cmax = np.where(cols)[0][[0, -1]]
            pad = 60
            rmin = max(0, rmin - pad)
            rmax = min(arr.shape[0], rmax + pad)
            cmin = max(0, cmin - pad)
            cmax = min(arr.shape[1], cmax + pad)
            img = img.crop((cmin, rmin, cmax, rmax))

        # Save for debugging
        debug_path = os.path.join(os.path.dirname(__file__), "reports_output", "debug_ocr.png")
        os.makedirs(os.path.dirname(debug_path), exist_ok=True)
        img.save(debug_path)
        print(f"[OCR] Saved debug image to {debug_path}")

        # ── 3. Convert to bytes for easyocr ──
        print("[OCR] Converting image to bytes...")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        img_data = buf.getvalue()

        # ── 4. Run TrOCR ────────────────────────────────────────────────
        print("[OCR] Running TrOCR...")
        recognized = ""
        confidence = 0.0
        match_score = 0.0
        is_match = False
        
        try:
            from transformers import TrOCRProcessor, VisionEncoderDecoderModel
            import torch
            import re
            import difflib

            # Global caching for the model
            global _trocr_processor, _trocr_model
            if '_trocr_processor' not in globals():
                print("[OCR] Loading TrOCR model (microsoft/trocr-small-handwritten)...")
                _trocr_processor = TrOCRProcessor.from_pretrained("microsoft/trocr-small-handwritten")
                _trocr_model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-small-handwritten")
                print("[OCR] TrOCR loaded.")

            # Convert to RGB image format required by TrOCR
            rgb_img = img.convert("RGB")
            
            # Predict
            pixel_values = _trocr_processor(rgb_img, return_tensors="pt").pixel_values
            # generate with a bit of max_length constraints
            generated_ids = _trocr_model.generate(pixel_values, max_length=20)
            text = _trocr_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            recognized = re.sub(r'[^a-zA-Z]', '', text).lower()
            confidence = 1.0  # TrOCR doesn't easily expose confidences by default, we rely on fuzzy match
                
            # If expected_word is provided, compute fuzzy match
            if req.expected_word:
                expected = req.expected_word.lower().strip()
                match_score = difflib.SequenceMatcher(None, expected, recognized).ratio()
                
                # TrOCR is incredibly accurate on handwriting. 
                # If the score is >= 0.45, we consider it a match to handle sloppy child drawing.
                is_match = match_score >= 0.45
                print(f"[OCR] Expected: '{expected}', Recognized: '{recognized}', Score: {match_score:.2f}")
            else:
                print(f"[OCR] Recognized: '{recognized}'")
                
            if not recognized:
                print("[OCR] No text detected")
        except Exception as e:
            print(f"[OCR] TrOCR error: {e}")

        print("[OCR] Returning response.")
        return {
            "recognized": recognized,
            "confidence": confidence,
            "match_score": match_score,
            "is_match": is_match,
            "success": True,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"recognized": "", "success": False, "error": str(e)}


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

@app.post("/export-pdf")
async def export_pdf(req: PdfReportRequest):
    try:
        from fpdf import FPDF
        
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=10)
        
        # Replace emojis and unicode characters with text equivalents
        replacements = {
            "✅": "[PASS]", "⚠️": "[WARN]", "🔴": "[FAIL]", "🩺": "", "📤": "",
            "🔁": "[RETRY]", "🎉": "[EXCELLENT]", "📢": "[LOUD]", "👁": "[FACE]", "🎤": "[AUDIO]", "☁️": "[CLOUD]",
            "══════════════════════════════════════════════": "="*46,
            "───────────────────": "-"*19,
            "──────────────────────": "-"*22,
            "────────────────────────────────────────": "-"*40,
            "─────────────────────────": "-"*25,
            "•": "-"
        }
        
        text = req.report_text
        for k, v in replacements.items():
            text = text.replace(k, v)
            
        for line in text.split('\n'):
            clean_line = line.encode('latin-1', 'replace').decode('latin-1')
            pdf.cell(190, 6, txt=clean_line, ln=True, align="L")
            
        # We save to a static file in the backend so it can be served
        reports_dir = os.path.join(os.path.dirname(__file__), "reports_output")
        os.makedirs(reports_dir, exist_ok=True)
        pdf_filename = "Clinical_Report.pdf"
        pdf_path = os.path.join(reports_dir, pdf_filename)
        
        pdf.output(pdf_path)
        
        return {"url": f"/static/{pdf_filename}"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Listen on all interfaces so the phone/emulator can connect
    uvicorn.run(app, host="0.0.0.0", port=8000)
