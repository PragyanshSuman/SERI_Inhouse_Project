import torch
import librosa
import numpy as np
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
from rapidfuzz import fuzz
import jellyfish

# Load model and processor globally to avoid reloading on every request
# This uses the facebook/wav2vec2-base-960h model which is good for general English
MODEL_ID = "facebook/wav2vec2-base-960h"
print(f"Loading model: {MODEL_ID}...")
processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID)
print("Model loaded successfully.")

def run_phonetic_check(target, actual):
    """
    Checks if two words sound similar using multiple algorithms.
    Returns a score boost (0-20) if they match phonetically.
    """
    boost = 0
    # Metaphone (English phonetic)
    if jellyfish.metaphone(target) == jellyfish.metaphone(actual):
        boost += 30
    # Soundex (Older but good for broad classes)
    elif jellyfish.soundex(target) == jellyfish.soundex(actual):
        boost += 20
    # Match Rating Approach (Good for names/spellings)
    elif jellyfish.match_rating_comparison(target, actual):
        boost += 15
        
    return boost

def evaluate_pronunciation(target_word: str, audio_path: str):
    """
    Evaluates pronunciation using wav2vec 2.0 + Fuzzy Matching + Phonetic Analysis.
    Designed to be Dyslexia-friendly and encouraging.
    """
    
    # 1. Load and Preprocess Audio
    try:
        speech, sr = librosa.load(audio_path, sr=16000)
    except Exception as e:
        return {"error": f"Could not load audio: {str(e)}", "phonemes": None}
    
    # Check for silence/noise
    if np.max(np.abs(speech)) < 0.005:
        return {
            "error": "Audio too quiet. Please speak louder.",
            "phoneme_accuracy": 0,
            "word_accuracy": 0,
            "phonemes": []
        }

    # 2. Model Inference
    input_values = processor(speech, return_tensors="pt", sampling_rate=16000).input_values
    
    with torch.no_grad():
        logits = model(input_values).logits

    # 3. Decode Predicted Tokens
    predicted_ids = torch.argmax(logits, dim=-1)
    transcription = processor.batch_decode(predicted_ids)[0].lower()
    
    # --- NEW: Target Confidence Check (Force Alignment / CTC Loss) ---
    # We check how probable the TARGET word is, given the audio.
    # If the model thinks the target word is highly probable (even if not the top 1), we give credit.
    
    target_clean = target_word.lower()
    
    # Encode target word to labels
    with processor.as_target_processor():
        target_labels = processor(target_clean, return_tensors="pt").input_ids
        
    # Calculate CTC Loss
    # log_probs: (T, N, C) -> we need (T, N, C) for ctc_loss? 
    # torch.nn.CTCLoss expects (Input Sequence Length, Batch Size, Number of Classes)
    # Logits from wav2vec are (Batch, Time, Classes). We need to transpose to (Time, Batch, Classes)
    
    log_probs = torch.nn.functional.log_softmax(logits, dim=-1).transpose(0, 1)
    
    input_lengths = torch.full(size=(1,), fill_value=log_probs.shape[0], dtype=torch.long)
    target_lengths = torch.full(size=(1,), fill_value=target_labels.shape[1], dtype=torch.long)
    
    ctc_loss = torch.nn.functional.ctc_loss(
        log_probs, 
        target_labels, 
        input_lengths, 
        target_lengths, 
        blank=processor.tokenizer.pad_token_id,
        reduction='mean'
    )
    
    # CTC Loss is negative log likelihood. Lower is better.
    # Typical values: 
    # < 1.0: Very confident
    # 1.0 - 3.0: Reasonably confident
    # > 5.0: Unlikely
    
    confidence_score = float(torch.exp(-ctc_loss)) # Convert to probability-like (0-1)
    # Note: CTC probability is often very small, so we might need a heuristic threshold.
    # Let's use the loss value directly for heuristics.
    loss_val = float(ctc_loss)
    print(f"CTC Loss for '{target_clean}': {loss_val}")
    
    # 4. Scoring Logic - ENHANCED FOR DYSLEXIA + TARGET VERIFICATION
    trans_lower = transcription.lower()

    # Base Text Similarity (fuzzy)
    score_ratio = fuzz.ratio(target_clean, trans_lower)
    score_partial = fuzz.partial_ratio(target_clean, trans_lower)
    
    base_score = (score_ratio * 0.6) + (score_partial * 0.4)
    
    # Phonetic Boost
    phonetic_boost = run_phonetic_check(target_clean, trans_lower)
    
    current_score = base_score + phonetic_boost
    
    # --- TARGET BIAS ---
    # If the CTC Loss is low (meaning the model thinks the audio *could* be the target word),
    # we boost the score significantly, overriding the greedy transcription.
    # TIGHTENED THRESHOLDS:
    # < 0.5: Extremely confident match
    # < 1.5: Very confident
    # < 3.0: Plausible match
    
    target_verification_boost = 0
    if loss_val < 0.5:
        target_verification_boost = 50 # Almost certainly correct
        transcription = target_clean 
    elif loss_val < 1.5:
        target_verification_boost = 30 # Strong match
    elif loss_val < 3.0:
        target_verification_boost = 10 # Possible match, small boost only
        
    final_score = current_score + target_verification_boost
    
    # Bonus for length similarity
    if abs(len(target_clean) - len(trans_lower)) <= 1:
        final_score += 5

    # Cap at 100, Floor at 0
    final_score = min(100, max(0, final_score))
    
    # 4.5 Dyslexia/Kid Adjustment: Be very generous with "almost there" scores
    # ONLY boost if we are already in a decent range. Don't boost failing scores.
    if final_score > 70:
        final_score = min(100, final_score + 10)
    elif final_score < 40:
        # Penalize completely wrong answers to prevent "accepting anything"
        # If score is very low, push it down further
        final_score = max(0, final_score - 10)

    # 5. Generate "Phoneme" Visualization
    phoneme_data = []
    target_viz_clean = target_clean.upper()
    transcription_clean = transcription.upper()
    
    target_idx = 0
    trans_idx = 0
    
    while target_idx < len(target_viz_clean):
        char = target_viz_clean[target_idx]
        
        # Improved window search
        search_window_start = max(0, trans_idx - 1)
        search_window_end = min(len(transcription_clean), trans_idx + 2)
        search_window = transcription_clean[search_window_start:search_window_end]
        
        match_found = char in search_window
        
        # Also check for phonetic similarity of CHARACTERS (e.g. F/PH, S/Z, C/K)
        # We can simulate this by checking if they sound similar
        if not match_found:
             for window_char in search_window:
                 if jellyfish.metaphone(char) == jellyfish.metaphone(window_char):
                     match_found = True
                     break
        
        if match_found:
             score = min(100, final_score + np.random.randint(5, 10))
             # Ensure visualization is encouraging even if base score is mid
             if score < 70: score = 75 
             feedback = "Good"
             trans_idx += 1 
        else:
             score = max(30, final_score - np.random.randint(10, 20))
             feedback = "Unclear"
        
        phoneme_data.append({"p": char, "score": score, "feedback": feedback})
        target_idx += 1

    # Verdict
    if final_score >= 80:
        verdict = "Amazing!"
        tips = "You sound fantastic!"
    elif final_score >= 60:
        verdict = "Great Try!"
        tips = "You are doing great! Keep it up."
    elif final_score >= 40:
        verdict = "Getting There"
        tips = f"We heard '{transcription}'. Try saying it slowly."
    else:
        verdict = "Try Again"
        tips = "It's okay! Let's try one more time."

    return {
        "phoneme_accuracy": round(final_score, 1),
        "word_accuracy": round(final_score, 1),
        "phonemes": phoneme_data,
        "verdict": verdict,
        "tips": tips,
        "transcription_heard": transcription,
        "debug_ctc_loss": round(loss_val, 2)
    }
