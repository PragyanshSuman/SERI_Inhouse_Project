import urllib.request
import zipfile
import os

url = "https://www.dropbox.com/s/mya8hw6jyzqm0a3/word-model.zip?dl=1"
output_zip = "backend/SimpleHTR/model.zip"
extract_dir = "backend/SimpleHTR/" # it will extract a 'model' directory

os.makedirs(extract_dir, exist_ok=True)

print("Downloading pretrained weights...")
urllib.request.urlretrieve(url, output_zip)

print("Extracting weights...")
with zipfile.ZipFile(output_zip, 'r') as zip_ref:
    zip_ref.extractall(extract_dir)

print("Removing zip file...")
os.remove(output_zip)

print("Download and extraction complete.")
