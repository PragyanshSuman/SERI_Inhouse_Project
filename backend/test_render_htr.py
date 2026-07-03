import sys
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw

# Import from SimpleHTR directly to test preprocessing
simple_htr_src = os.path.join(os.path.dirname(__file__), 'SimpleHTR', 'src')
if simple_htr_src not in sys.path:
    sys.path.append(simple_htr_src)

from preprocessor import Preprocessor
from simple_htr_wrapper import infer_image

def simulate_app_drawing(word):
    # simulate the cropped image of handwriting
    img = Image.new('RGB', (800, 300), color='white')
    draw = ImageDraw.Draw(img)
    stroke_w = 16
    # draw a generic cursive loop
    for i in range(100):
        draw.ellipse([(100+i*5, 150+np.sin(i*0.2)*50), (100+i*5+stroke_w, 150+np.sin(i*0.2)*50+stroke_w)], fill='black')
    
    return img

def test_preprocessing():
    # Let's take a real word "some" from the app or just text "all"
    img = Image.new('RGB', (400, 200), color='white')
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "all", fill='black', font=None, size=100) # no large font easily available, draw lines instead

    # draw 'all'
    stroke_w = 12
    draw.ellipse([50, 100, 100, 150], outline='black', width=stroke_w)
    draw.line([100, 50, 100, 150], fill='black', width=stroke_w)
    # l
    draw.line([150, 20, 150, 150], fill='black', width=stroke_w)
    # l
    draw.line([200, 20, 200, 150], fill='black', width=stroke_w)

    cv_img = np.array(img.convert('L'))
    preprocessor = Preprocessor((128, 32), dynamic_width=True, padding=16)
    processed_img = preprocessor.process_img(cv_img)
    
    # Save the processed image back to visualize what the NN sees
    # The processed img is transposed and scaled. We undo it.
    vis_img = (processed_img + 0.5) * 255
    vis_img = cv2.transpose(vis_img)
    cv2.imwrite("backend/dump/processed_vis.png", vis_img)

    text, prob = infer_image(img)
    print(f"Recognized 'all' as: {text} (prob: {prob})")

if __name__ == '__main__':
    os.makedirs("backend/dump", exist_ok=True)
    test_preprocessing()
