import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image, ImageDraw

def test_ocr(word, stroke_w=16, pad_square=False):
    processor = TrOCRProcessor.from_pretrained('microsoft/trocr-small-handwritten')
    model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-small-handwritten')

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

    if pad_square:
        max_dim = max(img.width, img.height)
        square_img = Image.new('RGB', (max_dim, max_dim), color='white')
        square_img.paste(img, ((max_dim - img.width)//2, (max_dim - img.height)//2))
        img = square_img

    pixel_values = processor(images=img, return_tensors="pt").pixel_values
    generated_ids = model.generate(pixel_values, max_new_tokens=20)
    text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    print(f"Result (pad_square={pad_square}, w={stroke_w}):", text)

test_ocr("and", stroke_w=8, pad_square=False)
test_ocr("and", stroke_w=8, pad_square=True)
test_ocr("and", stroke_w=16, pad_square=False)
