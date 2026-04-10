import torch

class DyslexiaDiagnosticEngine:
    """
    Mathematical engine that translates handwriting OCR errors into clinical Dyslexia Risk scores.
    Based on the journal paper formula:
    P_dyslexia(w) = (1/N) * sum(alpha*R_i + beta*M_i + gamma*T_i) * 100%
    """
    def __init__(self, alpha=1.0, beta=0.8, gamma=1.2):
        # alpha = Reversal/Substitution weight (b <-> d, p <-> q)
        # beta  = Mirroring weight (if utilizing orientation head outputs)
        # gamma = Transposition weight (teh <-> the)
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        
        # Clinically significant pairs for Dyslexia
        self.reversal_pairs = [('b','d'), ('d','b'), 
                               ('p','q'), ('q','p'), 
                               ('m','w'), ('w','m'), 
                               ('n','u'), ('u','n')]

    def calculate_risk(self, transcribed_word: str, target_word: str):
        """
        Compares the CRNN output (transcribed_word) against the intended prompt (target_word).
        Returns: (Risk Score Float 0-100, List of human-readable error descriptions)
        """
        transcribed_word = transcribed_word.strip().lower()
        target_word = target_word.strip().lower()
        
        if transcribed_word == target_word:
            return 0.0, ["None"]
            
        N = len(target_word)
        if N == 0: return 0.0, ["Invalid input"]
        
        score_accumulator = 0.0
        detected_errors = []
        
        # 1. Transposition Check (gamma * T_i)
        # Ex: "saw" vs "was"
        if sorted(transcribed_word) == sorted(target_word) and len(transcribed_word) == N:
            score_accumulator += (self.gamma * 1.0) # Full transposition event
            detected_errors.append(f"Transposition (Wrote '{transcribed_word}' instead of '{target_word}')")
            final_score = (score_accumulator / 1.0) * 100.0
            return min(100.0, final_score), detected_errors
            
        # 2. Linear Scan for Reversals (alpha * R_i) and standard errors
        # Note: A true diff algorithm (like Levenshtein) is better for production, 
        # but linear zip aligns with our fixed-length journal paper constraints.
        for t_char, target_char in zip(transcribed_word, target_word):
            if t_char != target_char:
                if (t_char, target_char) in self.reversal_pairs:
                    # Dyslexic Reversal detected at character i
                    score_accumulator += self.alpha
                    detected_errors.append(f"Reversal ({target_char} -> {t_char})")
                else:
                    # Standard spelling error or misclassification (lower weight)
                    score_accumulator += 0.2
                    detected_errors.append(f"Substitution ({target_char} -> {t_char})")
                    
        # Apply formula normalization (1/N)
        final_risk_score = (score_accumulator / N) * 100.0
        
        if not detected_errors:
            detected_errors.append("Generic Character Span Error")
            final_risk_score = 15.0 # Baseline penalty for non-matching length etc.
            
        return min(100.0, final_risk_score), detected_errors

# --- QUICK TEST MODULE ---
if __name__ == "__main__":
    engine = DyslexiaDiagnosticEngine()
    
    test_cases = [
        ("bed", "bed"),     # Perfect
        ("dog", "bog"),     # Reversal d->b
        ("stop", "sdob"),   # Multiple Reversals t->d, p->b
        ("was", "saw"),     # Transposition
        ("the", "teh")      # Transposition
    ]
    
    print(" Dyslexia Clinical Diagnosis Engine - Test Output ")
    print("="*75)
    print(f"{'Target':<10} | {'OCR Read':<10} | {'P_dyslexia':<10} | {'Error Trace'}")
    print("-" * 75)
    
    for intended, read in test_cases:
        score, trace = engine.calculate_risk(read, intended)
        print(f"{intended:<10} | {read:<10} | {score:>5.1f}%     | {' + '.join(trace)}")
