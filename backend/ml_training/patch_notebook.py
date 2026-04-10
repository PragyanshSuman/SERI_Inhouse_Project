import json, os

with open("backend/ml_training/dyslexia_training.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

# ── Helper to find a code cell by keyword ────────────────────────────────────
def find_cell(keyword):
    for i, c in enumerate(nb["cells"]):
        if c.get("cell_type") == "code":
            src = "".join(c.get("source", []))
            if keyword in src:
                return i, src
    return None, None

# ════════════════════════════════════════════════════════════════════════════ #
# FIX 1 — Cell 4: Replace find_image_for_label with correct path logic        #
#   Real layout: synthdata/labels/train/*.txt  <->  synthdata/images/train/*  #
#   Fix: replace the 'labels' segment with 'images' in the path string         #
# ════════════════════════════════════════════════════════════════════════════ #
idx4, _ = find_cell("find_image_for_label")
assert idx4 is not None, "Cell 4 not found"

nb["cells"][idx4]["source"] = [
    "# CELL 4: YOLO Annotation Parser — crops individual letters\n",
    "# FIX: YOLO layout is synthdata/labels/<split>/*.txt  <->  synthdata/images/<split>/*.img\n",
    "# We map label path -> image path by swapping 'labels' segment with 'images'.\n",
    "from pathlib import Path\n",
    "\n",
    "def find_image_for_label(label_path, img_extensions=('.png', '.jpg', '.jpeg', '.bmp')):\n",
    "    \"\"\"Find the matching image by replacing 'labels' -> 'images' in path.\"\"\"\n",
    "    label_path = Path(label_path)\n",
    "    stem       = label_path.stem\n",
    "    parent_str = str(label_path.parent)\n",
    "\n",
    "    # Replace the 'labels' directory segment with 'images'\n",
    "    img_dir_str = parent_str.replace(os.sep + 'labels' + os.sep,\n",
    "                                      os.sep + 'images' + os.sep)\n",
    "    # Also handle case where path ENDS in 'labels' (no sub-split folder)\n",
    "    if img_dir_str == parent_str:\n",
    "        # try splitting on forward slash too (cross-platform)\n",
    "        img_dir_str = parent_str.replace('/labels/', '/images/')\n",
    "\n",
    "    img_dir = Path(img_dir_str)\n",
    "    for ext in img_extensions:\n",
    "        candidate = img_dir / (stem + ext)\n",
    "        if candidate.exists():\n",
    "            return str(candidate)\n",
    "\n",
    "    # Fallback: also try parent.parent / 'images' / parent.name\n",
    "    fallback_dir = label_path.parent.parent / 'images' / label_path.parent.name\n",
    "    for ext in img_extensions:\n",
    "        candidate = fallback_dir / (stem + ext)\n",
    "        if candidate.exists():\n",
    "            return str(candidate)\n",
    "    return None\n",
    "\n",
    "\n",
    "def parse_yolo_dataset(root_path, img_size=28, max_samples=None):\n",
    "    \"\"\"\n",
    "    Walk dataset, parse YOLO .txt files, crop bounding boxes.\n",
    "    Returns:\n",
    "        crops      : list of float32 arrays (img_size x img_size)\n",
    "        ori_labels : 0=Normal, 1=Reversal, 2=Corrected\n",
    "    \"\"\"\n",
    "    crops, ori_labels = [], []\n",
    "    label_files = list(Path(root_path).rglob('*.txt'))\n",
    "    random.shuffle(label_files)\n",
    "    if max_samples:\n",
    "        label_files = label_files[:max_samples]\n",
    "\n",
    "    print(f'Found {len(label_files):,} .txt annotation files')\n",
    "\n",
    "    # Debug: show first attempted path pair\n",
    "    if label_files:\n",
    "        sample_lf  = str(label_files[0])\n",
    "        sample_img = find_image_for_label(label_files[0])\n",
    "        print(f'  Sample label : {sample_lf}')\n",
    "        print(f'  Sample image : {sample_img}')\n",
    "\n",
    "    skipped = 0\n",
    "    for lf in tqdm(label_files, desc='Parsing annotations'):\n",
    "        img_path = find_image_for_label(lf)\n",
    "        if img_path is None:\n",
    "            skipped += 1\n",
    "            continue\n",
    "        try:\n",
    "            img = Image.open(img_path).convert('L')  # grayscale\n",
    "            W, H = img.size\n",
    "            with open(lf, 'r') as f:\n",
    "                for line in f:\n",
    "                    parts = line.strip().split()\n",
    "                    if len(parts) < 5:\n",
    "                        continue\n",
    "                    cls_id = int(parts[0])          # 0=Normal, 1=Reversal, 2=Corrected\n",
    "                    cx, cy, bw, bh = map(float, parts[1:5])\n",
    "                    x1 = max(0, int((cx - bw / 2) * W))\n",
    "                    y1 = max(0, int((cy - bh / 2) * H))\n",
    "                    x2 = min(W, int((cx + bw / 2) * W))\n",
    "                    y2 = min(H, int((cy + bh / 2) * H))\n",
    "                    if x2 - x1 < 4 or y2 - y1 < 4:\n",
    "                        continue\n",
    "                    crop = img.crop((x1, y1, x2, y2))\n",
    "                    crop = crop.resize((img_size, img_size), Image.LANCZOS)\n",
    "                    arr  = np.array(crop, dtype=np.float32) / 255.0\n",
    "                    crops.append(arr)\n",
    "                    ori_labels.append(cls_id)\n",
    "        except Exception as e:\n",
    "            skipped += 1\n",
    "            continue\n",
    "\n",
    "    print(f'Total crops: {len(crops):,}  |  Skipped files: {skipped}')\n",
    "    return crops, ori_labels\n",
    "\n",
    "\n",
    "kaggle_crops, kaggle_oris = parse_yolo_dataset(kaggle_path, img_size=28)\n",
    "print('Orientation distribution:')\n",
    "for k, name in enumerate(['Normal', 'Reversal', 'Corrected']):\n",
    "    n = kaggle_oris.count(k)\n",
    "    print(f'  {k}={name}: {n:,}')\n",
]
print("Fixed Cell 4: find_image_for_label now uses labels->images path swap")

# ════════════════════════════════════════════════════════════════════════════ #
# FIX 2 — Cell 8: Guard Kaggle visualization against empty dataset            #
# ════════════════════════════════════════════════════════════════════════════ #
idx8, _ = find_cell("Combined train:")
assert idx8 is not None, "Cell 8 not found"

nb["cells"][idx8]["source"] = [
    "# CELL 8: Build Final Combined DataLoaders\n",
    "combined_train = ConcatDataset([emnist_train_w, kaggle_train])\n",
    "combined_val   = ConcatDataset([emnist_test_w,  kaggle_val])\n",
    "\n",
    "train_loader = DataLoader(combined_train, batch_size=BATCH_SIZE,\n",
    "                          shuffle=True,  num_workers=0)\n",
    "val_loader   = DataLoader(combined_val,   batch_size=BATCH_SIZE,\n",
    "                          shuffle=False, num_workers=0)\n",
    "\n",
    "print(f'EMNIST train: {len(emnist_train_w):,} | Kaggle train: {len(kaggle_train):,}')\n",
    "print(f'Combined train: {len(combined_train):,} | val: {len(combined_val):,}')\n",
    "\n",
    "# ── Visualize EMNIST samples ────────────────────────────────────────────────\n",
    "ori_names = ['Normal', 'Reversal', 'Corrected']\n",
    "n_cols = 10\n",
    "n_rows = 2 if len(kaggle_train) > 0 else 1\n",
    "fig, axes = plt.subplots(n_rows, n_cols, figsize=(18, n_rows * 2))\n",
    "if n_rows == 1:\n",
    "    axes = [axes]   # make 2D for uniform indexing\n",
    "\n",
    "for col in range(n_cols):\n",
    "    img_e, lbl_e, ori_e, _ = emnist_train_w[col * 3000]\n",
    "    axes[0][col].imshow(img_e.squeeze(), cmap='gray')\n",
    "    axes[0][col].set_title(f'{CLASS_NAMES[lbl_e]}\\n{ori_names[ori_e]}', fontsize=7)\n",
    "    axes[0][col].axis('off')\n",
    "\n",
    "    if len(kaggle_train) > 0:\n",
    "        k_idx = col * max(1, len(kaggle_train) // n_cols)\n",
    "        k_idx = min(k_idx, len(kaggle_train) - 1)\n",
    "        img_k, _, ori_k, _ = kaggle_train[k_idx]\n",
    "        axes[1][col].imshow(img_k.squeeze(), cmap='gray')\n",
    "        axes[1][col].set_title(f'{ori_names[min(ori_k, 2)]}', fontsize=7)\n",
    "        axes[1][col].axis('off')\n",
    "\n",
    "axes[0][0].set_ylabel('EMNIST', fontsize=8)\n",
    "if n_rows > 1:\n",
    "    axes[1][0].set_ylabel('Kaggle', fontsize=8)\n",
    "\n",
    "title = 'EMNIST ByClass'\n",
    "if len(kaggle_train) > 0:\n",
    "    title += ' | Kaggle Synthetic Dyslexia Crops'\n",
    "plt.suptitle(title, fontsize=11)\n",
    "plt.tight_layout()\n",
    "plt.savefig('sample_images.png', dpi=150)\n",
    "plt.show()\n",
]
print("Fixed Cell 8: Kaggle visualization now guarded against empty dataset")

# ════════════════════════════════════════════════════════════════════════════ #
# FIX 3 — Cell 15: Guard orientation evaluation against empty kaggle_val      #
# ════════════════════════════════════════════════════════════════════════════ #
idx15, _ = find_cell("Orientation Head Accuracy on Kaggle")
assert idx15 is not None, "Cell 15 not found"

nb["cells"][idx15]["source"] = [
    "# CELL 15: Orientation Head Accuracy on Kaggle Val Set\n",
    "ori_acc = 0.0   # default if Kaggle val is empty\n",
    "\n",
    "if len(kaggle_val) == 0:\n",
    "    print('WARNING: Kaggle val set is empty — skipping orientation matrix.')\n",
    "    print('This happens if the YOLO annotations were not parsed correctly.')\n",
    "    print('Check that Cell 4 printed a non-zero crop count and re-run.')\n",
    "else:\n",
    "    model.eval()\n",
    "    ori_preds, ori_true = [], []\n",
    "    kaggle_val_loader = DataLoader(kaggle_val, batch_size=128, shuffle=False)\n",
    "    with torch.no_grad():\n",
    "        for imgs, _, oris, _ in kaggle_val_loader:\n",
    "            imgs = imgs.to(DEVICE)\n",
    "            _, out_ori, _ = model(imgs)\n",
    "            ori_preds.extend(torch.argmax(out_ori, 1).cpu().numpy())\n",
    "            ori_true.extend(oris.numpy())\n",
    "\n",
    "    # Only evaluate classes that exist in the data\n",
    "    present = sorted(set(ori_true))\n",
    "    present_names = ['Normal', 'Reversal', 'Corrected']\n",
    "    ori_cm  = confusion_matrix(ori_true, ori_preds, labels=present)\n",
    "    ori_acc = accuracy_score(ori_true, ori_preds) * 100\n",
    "\n",
    "    fig, ax = plt.subplots(figsize=(6, 5))\n",
    "    sns.heatmap(ori_cm, annot=True, fmt='d', cmap='Purples',\n",
    "                xticklabels=[present_names[i] for i in present],\n",
    "                yticklabels=[present_names[i] for i in present],\n",
    "                linewidths=2, ax=ax)\n",
    "    ax.set_title(f'Orientation Detection Matrix (Kaggle)\\nAccuracy: {ori_acc:.2f}%', fontsize=12)\n",
    "    ax.set_xlabel('Predicted'); ax.set_ylabel('True')\n",
    "    plt.tight_layout()\n",
    "    plt.savefig('orientation_detection_matrix.png', dpi=150)\n",
    "    plt.show()\n",
    "    print(f'Reversal Detection Accuracy: {ori_acc:.2f}%')\n",
    "    print('Saved: orientation_detection_matrix.png')\n",
]
print("Fixed Cell 15: orientation eval now guarded against empty kaggle_val")

# ════════════════════════════════════════════════════════════════════════════ #
# FIX 4 — Cell 16: ori_acc default already set in Cell 15, no change needed  #
# But replace ori_acc reference with safe access                              #
# ════════════════════════════════════════════════════════════════════════════ #
# ori_acc is now always defined (default 0.0 set in Cell 15) — no extra fix.

# ── Write out ────────────────────────────────────────────────────────────────
with open("backend/ml_training/dyslexia_training.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=2, ensure_ascii=False)

print("")
print("All fixes applied and notebook saved!")
print("Summary of fixes:")
print("  Bug 1 (Cell  4): FIXED — image path discovery now swaps 'labels' -> 'images'")
print("  Bug 2 (Cell  8): FIXED — visualization guarded against empty kaggle_train")
print("  Bug 3 (Cell 15): FIXED — orientation eval guarded + ori_acc defaults to 0.0")
print("  Bug 4 (Cell 16): OK    — ori_acc always defined via Cell 15 default")
