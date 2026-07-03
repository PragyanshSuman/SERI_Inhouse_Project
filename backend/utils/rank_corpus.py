import json
import os
import re

# --- BASE DATA ---
# Common words categorized by their 'Tricky' nature for dyslexia
TRICKY_WORDS = {
    "said", "was", "one", "two", "the", "of", "are", "do", "does", "done", 
    "gone", "give", "live", "some", "come", "where", "there", "were", 
    "could", "should", "would", "eight", "through", "thought", "though"
}

# Base Frequency Ranks (Simulated GSL/Fry lists)
# Rank 1: Very Common, Rank 5: Rare/Hard
FREQUENCY_BASE = {
    "the": 1, "be": 1, "to": 1, "of": 1, "and": 1, "a": 1, "in": 1, "that": 1,
    "have": 1, "i": 1, "it": 1, "for": 1, "not": 1, "on": 1, "with": 1, "he": 1,
    "as": 1, "you": 1, "do": 1, "at": 1, "this": 2, "but": 2, "his": 2, "by": 2,
    "from": 2, "they": 2, "we": 2, "say": 2, "her": 2, "she": 2, "or": 2, "an": 2,
    "will": 2, "my": 2, "one": 3, "all": 3, "would": 3, "there": 3, "their": 3,
    "what": 3, "so": 3, "up": 3, "out": 3, "if": 3, "about": 3, "who": 3, "get": 3,
    "through": 5, "between": 4, "children": 4, "important": 5, "different": 4
}

def calculate_dds(word):
    """
    Calculates Dyslexia Difficulty Score (DDS)
    0.0 (Easy) to 10.0 (Extremely Hard)
    """
    word = word.lower()
    score = 0.0
    
    # 1. Frequency Component (40%)
    # Default to mid-difficulty if not in frequency list
    freq_rank = FREQUENCY_BASE.get(word, 3) 
    score += (freq_rank * 0.8) # Max 4.0
    
    # 2. Irregularity Component (30%)
    if word in TRICKY_WORDS:
        score += 3.0
        
    # 3. Length Component (20%)
    # Longer words increase cognitive load for decoding
    length_penalty = len(word) * 0.2
    score += min(2.0, length_penalty)
    
    # 4. Phonological Complexity (10%)
    # Count vowel clusters (double vowels like 'ea', 'ou')
    vowel_clusters = len(re.findall(r'[aeiou]{2,}', word))
    score += min(1.0, vowel_clusters * 0.5)
    
    return round(score, 2)

def generate_corpus():
    # Combine lists for processing
    all_words = list(set(list(FREQUENCY_BASE.keys()) + list(TRICKY_WORDS) + [
        "cat", "bat", "mat", "ship", "chat", "shop", "cake", "rope", "boat", "rain",
        "thoroughly", "extraordinary", "beautiful", "friend", "because"
    ]))
    
    corpus = []
    for word in all_words:
        dds = calculate_dds(word)
        
        # Categorize
        if dds < 3.0:
            level = "Easy"
        elif dds < 5.0:
            level = "Medium"
        else:
            level = "Hard"
            
        corpus.append({
            "word": word,
            "dds": dds,
            "level": level,
            "isTricky": word in TRICKY_WORDS,
            "length": len(word)
        })
        
    # Sort by DDS
    corpus.sort(key=lambda x: x['dds'])
    return corpus

if __name__ == "__main__":
    data = generate_corpus()
    output_path = os.path.join("src", "data", "lexicalCorpus.json")
    
    # Ensure dir exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)
        
    print(f"✅ Generated corpus with {len(data)} words at {output_path}")
