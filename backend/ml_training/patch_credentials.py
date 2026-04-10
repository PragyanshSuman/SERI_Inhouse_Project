import json, os

# ── Load existing notebook ────────────────────────────────────────────────────
with open("backend/ml_training/dyslexia_training.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

# ── New Cell 3 source: inline credentials + download ─────────────────────────
new_cell3_source = [
    "# CELL 3: Kaggle Credentials & Dataset Download\n",
    "# Option A (already done): kaggle.json at C:\\Users\\<you>\\.kaggle\\kaggle.json\n",
    "# Option B (inline — set here if kaggle.json is missing):\n",
    "import os\n",
    "\n",
    "# ---- SET YOUR CREDENTIALS HERE IF NEEDED ----\n",
    "os.environ['KAGGLE_USERNAME'] = 'pragyanshsuman'  # your kaggle username\n",
    "os.environ['KAGGLE_KEY']      = 'KGAT_8f733594024b9a971312783f6c3b702f'\n",
    "# ---------------------------------------------\n",
    "\n",
    "import kagglehub\n",
    "\n",
    "print('Downloading Kaggle Synthetic Dyslexia Dataset (~120 MB)...')\n",
    "kaggle_path = kagglehub.dataset_download(\n",
    "    'michaelfink0923/synthetic-dyslexia-handwriting-dataset'\n",
    ")\n",
    "print(f'Dataset downloaded to: {kaggle_path}')\n",
    "\n",
    "# Explore the folder structure\n",
    "print('\\nFolder structure:')\n",
    "for root, dirs, files in os.walk(kaggle_path):\n",
    "    level = root.replace(str(kaggle_path), '').count(os.sep)\n",
    "    indent = '  ' * level\n",
    "    print(f'{indent}{os.path.basename(root)}/')\n",
    "    if level < 2:\n",
    "        for fname in files[:5]:\n",
    "            print(f'{indent}  {fname}')\n",
    "        if len(files) > 5:\n",
    "            print(f'{indent}  ... ({len(files)} total files)')\n",
]

# Find and update cell 3 (index 3 in the cells list — 0=markdown,1=install,2=config,3=dl)
# Cell index 3 is the download cell
for i, cell in enumerate(nb["cells"]):
    if cell.get("cell_type") == "code":
        src = "".join(cell.get("source", []))
        if "kagglehub.dataset_download" in src and "os.environ" not in src:
            nb["cells"][i]["source"] = new_cell3_source
            print(f"Updated cell {i} with inline credentials")
            break

with open("backend/ml_training/dyslexia_training.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=2, ensure_ascii=False)

print("Notebook updated — Cell 3 now has inline credentials support!")
