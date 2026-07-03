import sys
import os
import cv2
import numpy as np
from PIL import Image

# Force TF to use Legacy Keras (required for tf.compat.v1.layers in TF 2.16+)
os.environ["TF_USE_LEGACY_KERAS"] = "1"

# Add SimpleHTR/src to sys.path so we can import its modules
simple_htr_src = os.path.join(os.path.dirname(__file__), 'SimpleHTR', 'src')
if simple_htr_src not in sys.path:
    sys.path.append(simple_htr_src)

from model import Model, DecoderType
from preprocessor import Preprocessor
from dataloader_iam import Batch

# File paths needed by SimpleHTR
model_dir = os.path.join(os.path.dirname(__file__), 'SimpleHTR', 'model')
fn_char_list = os.path.join(model_dir, 'charList.txt')

_htr_model = None

def get_htr_model():
    global _htr_model
    if _htr_model is None:
        # Read character list
        with open(fn_char_list) as f:
            char_list = list(f.read())
        
        # SimpleHTR hardcodes paths like '../model/'. We must change cwd to 'src'
        original_cwd = os.getcwd()
        os.chdir(simple_htr_src) 
        try:
            print("[SimpleHTR] Loading model...")
            _htr_model = Model(char_list, DecoderType.BestPath, must_restore=True)
            print("[SimpleHTR] Model loaded successfully.")
        finally:
            os.chdir(original_cwd)

    return _htr_model

def infer_image(pil_img: Image.Image) -> tuple[str, float]:
    """
    Takes a PIL Image (RGB or L), runs SimpleHTR inference, and returns (recognized_text, confidence).
    """
    model = get_htr_model()
    
    # Convert PIL Image to cv2 grayscale numpy array
    cv_img = np.array(pil_img.convert('L'))
    
    # SimpleHTR preprocessor expects dynamic width for inference
    preprocessor = Preprocessor((128, 32), dynamic_width=True, padding=16)
    processed_img = preprocessor.process_img(cv_img)
    
    batch = Batch([processed_img], None, 1)
    recognized, probability = model.infer_batch(batch, True)
    
    # recognized is a list of strings, probability is a list of floats
    text = recognized[0] if recognized else ""
    prob = probability[0] if probability else 0.0
    
    return text, float(prob)
