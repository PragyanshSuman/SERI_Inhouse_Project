import cv2
import numpy as np
from fer import FER

def test_fer():
    try:
        print("Initializing FER...")
        detector = FER(mtcnn=True)
        print("Creating dummy image...")
        img = np.zeros((300, 300, 3), dtype=np.uint8)
        print("Detecting emotions...")
        result = detector.detect_emotions(img)
        print("Result:", result)
        print("FER is fully working!")
    except Exception as e:
        print("FER error:", e)

if __name__ == "__main__":
    test_fer()
