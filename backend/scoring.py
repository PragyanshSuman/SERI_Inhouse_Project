import torch
import librosa
import numpy as np
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
import pronouncing
import re

# Use a true Phoneme Model that outputs ARPAbet tokens
MODEL_ID = "vitouphy/wav2vec2-xls-r-300m-phoneme"
print(f"[TEST ENV] Loading phoneme model: {MODEL_ID}...")
processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID)
print("[TEST ENV] Phoneme Model loaded successfully.")

# Define acceptable ARPAbet substitutions specifically for Indian English accents and Microphone artifacts
PHONETIC_EQUIVALENTS = [
    # Vowels
    {'ao', 'aa'},       # 'o' variations (dog, hot)
    {'ah', 'ax', 'eh', 'ih'}, # Schwa and short i/e variations
    {'ih', 'iy'},       # Short/long 'i' (bit/beat) which often shifts
    {'ae', 'aa', 'eh'}, # 'a' variations (cat/ask)
    {'ow', 'ao'},       # 'o' as in 'go' often pronounced as pure vowel 'ao'
    {'er', 'axr', 'ah'},# 'r' coloring variations
    {'uw', 'uh'},
    
    # Consonants (Crucial for Indian Accents & Microphone Voicing Errors)
    {'v', 'w'},         # v/w merger is extremely common
    {'th', 't', 'd', 'dh'}, # Interdental shifts
    {'z', 's'},         # Devoicing of 'z' at the end of words (dogs -> dogs)
    
    # Voiced / Unvoiced Pairs
    {'k', 'g'},         # cat -> gat
    {'t', 'd'},         # cat -> cad
    {'p', 'b'},         # pig -> big
    {'f', 'v'},         # fan -> van
    {'ch', 'jh'},       # chin -> gin
    {'sh', 'zh'}        # pressure -> measure
]

def is_phonetic_match(t_char, p_char):
    if t_char == p_char:
        return True
    for group in PHONETIC_EQUIVALENTS:
        if t_char in group and p_char in group:
            return True
    return False

def align_phonemes(target_phonemes, pred_phonemes):
    """
    Simple Needleman-Wunsch alignment for lists to align target ARPAbet with predicted ARPAbet.
    """
    n, m = len(target_phonemes), len(pred_phonemes)
    dp = np.zeros((n + 1, m + 1))
    
    for i in range(1, n + 1): dp[i][0] = i
    for j in range(1, m + 1): dp[0][j] = j
        
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if is_phonetic_match(target_phonemes[i-1], pred_phonemes[j-1]):
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = min(dp[i-1][j-1] + 1,    # substitute
                               dp[i][j-1] + 1,      # insert
                               dp[i-1][j] + 1)      # delete

    # Backtrace
    i, j = n, m
    alignment = []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and is_phonetic_match(target_phonemes[i-1], pred_phonemes[j-1]):
            alignment.append((target_phonemes[i-1], pred_phonemes[j-1]))
            i -= 1; j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
            alignment.append((target_phonemes[i-1], pred_phonemes[j-1]))
            i -= 1; j -= 1
        elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
            alignment.append((target_phonemes[i-1], '-'))
            i -= 1
        else:
            j -= 1 # Ignore insertions
            
    return alignment[::-1]

from g2p_en import G2p

# Use neural Grapheme-to-Phoneme for dynamic word translation
print("[TEST ENV] Loading G2P engine...")
g2p = G2p()
print("[TEST ENV] G2P engine loaded.")

def evaluate_pronunciation(target_word: str, audio_path: str):
    """
    Evaluates pronunciation using True Phoneme Alignment (ARPAbet).
    """
    target_clean = target_word.lower().strip()
    
    # 1. Convert Target to ARPAbet Array using Neural G2P (handles ANY word)
    raw_phones = g2p(target_clean)
    target_arpabet = []
    for p in raw_phones:
        if p.strip() and re.match(r'[A-Za-z]', p):
            # Strip numbers (stress marks) and lowercase
            target_arpabet.append(re.sub(r'\d+', '', p).lower())

    # 2. Load Audio
    try:
        speech, sr = librosa.load(audio_path, sr=16000)
    except Exception as e:
        return {"error": f"Could not load audio: {str(e)}", "phonemes": None}
    
    if np.max(np.abs(speech)) < 0.005:
        return {
            "error": "Audio too quiet. Please speak louder.",
            "phoneme_accuracy": 0, "word_accuracy": 0, "phonemes": []
        }

    # 3. Phoneme Inference
    input_values = processor(speech, return_tensors="pt", sampling_rate=16000).input_values
    with torch.no_grad():
        logits = model(input_values).logits

    predicted_ids = torch.argmax(logits, dim=-1)
    
    # Convert IDs directly to tokens to avoid batch_decode gluing them together
    raw_tokens = processor.tokenizer.convert_ids_to_tokens(predicted_ids[0].tolist())
    
    # Clean up CTC duplicates and Blanks
    pred_arpabet = []
    previous = None
    for t in raw_tokens:
        # Skip CTC blank, pad tokens, and silence
        if t in ['[PAD]', '|', 'h#', '<s>', '</s>']:
            previous = t
            continue
        if t != previous:
            pred_arpabet.append(t)
            previous = t
    
    # 4. Alignment & Scoring
    alignment = align_phonemes(target_arpabet, pred_arpabet)
    
    phoneme_data = []
    correct_count = 0
    total_count = len(alignment)
    
    for t_char, p_char in alignment:
        if is_phonetic_match(t_char, p_char):
            score = np.random.randint(90, 100)
            feedback = "Great" if t_char == p_char else "Great!"
            correct_count += 1
        elif p_char == '-':
            score = np.random.randint(0, 20)
            feedback = "Missed"
        else:
            score = np.random.randint(20, 50)
            feedback = f"Heard '{p_char}'"
            
        phoneme_data.append({
            "p": t_char, 
            "heard_p": p_char,
            "score": score, 
            "feedback": feedback
        })
        
    final_score = (correct_count / max(1, total_count)) * 100
    
    if final_score > 70:
        final_score = min(100, final_score + 10)
    elif final_score < 40:
        final_score = max(0, final_score - 10)

    if final_score >= 80:
        verdict = "Amazing!"
        tips = "You sound fantastic!"
    elif final_score >= 60:
        verdict = "Great Try!"
        tips = "You are doing great! Keep it up."
    elif final_score >= 40:
        verdict = "Getting There"
        tips = f"Try paying attention to the tricky sounds."
    else:
        verdict = "Try Again"
        tips = "It's okay! Let's try one more time slowly."

    return {
        "phoneme_accuracy": round(final_score, 1),
        "word_accuracy": round(final_score, 1),
        "phonemes": phoneme_data,
        "verdict": verdict,
        "tips": tips,
        "transcription_heard": " ".join(pred_arpabet),
        "debug_target_ipa": " ".join(target_arpabet)
    }
