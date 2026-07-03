import sys
import os
from PIL import Image, ImageDraw
import numpy as np

# Import the wrapper
from simple_htr_wrapper import infer_image

def test_ocr(word, stroke_w=16):
    img = Image.new('RGB', (800, 300), color='white')
    draw = ImageDraw.Draw(img)
    # Draw something resembling "and"
    # a
    draw.line([(100, 150), (150, 150), (150, 200), (100, 200), (100, 150)], fill='black', width=stroke_w)
    draw.line([(150, 150), (150, 200)], fill='black', width=stroke_w)
    # n
    draw.line([(200, 200), (200, 150), (250, 150), (250, 200)], fill='black', width=stroke_w)
    # d
    draw.line([(300, 200), (300, 150), (350, 150), (350, 200), (300, 200)], fill='black', width=stroke_w)
    draw.line([(350, 100), (350, 200)], fill='black', width=stroke_w)

    text, prob = infer_image(img)
    print(f"Result (w={stroke_w}):", text, f"(prob={prob})")

if __name__ == '__main__':
    test_ocr("and", stroke_w=16)
