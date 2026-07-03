from PIL import Image
import numpy as np

img = Image.open('backend/SimpleHTR/data/word.png')
print(f"Size: {img.size}")
arr = np.array(img.convert('L'))
ink = arr < 128
print(f"Ink pixels: {np.sum(ink)}")
print(f"Fill ratio: {np.sum(ink) / arr.size}")
