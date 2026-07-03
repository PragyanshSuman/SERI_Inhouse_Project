import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write
import time
import os
import csv
import colorama
from colorama import Fore, Style
from scoring import evaluate_pronunciation

colorama.init(autoreset=True)

# A phonetically rich list designed to hit all 39 ARPAbet phonemes
PHONETICALLY_RICH_WORDS = [
    # Vowels & Diphthongs
    "beet", "bit", "bet", "bat", "bot", "bought", "boat", "put", "boot", "but", "bird", 
    "bite", "bout", "boy",
    # Consonants
    "pig", "big", "time", "dog", "cat", "go", "fan", "van", "think", "this", 
    "see", "zoo", "shoe", "measure", "chop", "jump", "man", "now", "sing", 
    "leg", "red", "yes", "wet", "hat"
]

REPETITIONS = 3
CSV_FILENAME = "phoneme_tuning_dataset.csv"

def record_audio(filename, duration=2.5, fs=16000):
    print(Fore.RED + f"🔴 RECORDING NOW! Please say the word...")
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32')
    sd.wait()
    print(Fore.GREEN + f"✅ Stopped.")
    write(filename, fs, recording)

def main():
    print(Fore.MAGENTA + Style.BRIGHT + "=== 🧠 PHONEME DATASET BUILDER ===")
    print(f"We will test {len(PHONETICALLY_RICH_WORDS)} words, exactly {REPETITIONS} times each.")
    print(f"This covers every single sound in the English language.")
    print("At the end, a CSV file will be generated mapping what you SAID to what the AI HEARD.")
    print("Press Ctrl+C at any time to exit early and save progress.\n")
    
    dataset = []
    
    try:
        for rep in range(1, REPETITIONS + 1):
            print(Fore.CYAN + f"\n\n--- 🔄 REPETITION {rep} of {REPETITIONS} ---")
            
            for word in PHONETICALLY_RICH_WORDS:
                response = input(Fore.WHITE + f"\nTest the word '{word}'? (Press Enter to record, 's' to skip): ").strip().lower()
                if response == 's':
                    continue
                    
                temp_file = "temp_dataset_audio.wav"
                time.sleep(0.5)
                record_audio(temp_file, duration=1.5)
                
                print(Fore.BLUE + "⏳ Analyzing...")
                result = evaluate_pronunciation(word, temp_file)
                
                if "error" in result:
                    print(Fore.RED + f"Error: {result['error']}")
                    continue
                
                # Show quick result so user isn't totally blind
                print(Fore.YELLOW + f"Target: {result['debug_target_ipa']}")
                print(Fore.YELLOW + f"Heard:  {result['transcription_heard']}")
                
                for p in result['phonemes']:
                    dataset.append({
                        "Repetition": rep,
                        "Word": word,
                        "Target_Phoneme": p['p'],
                        "Heard_Phoneme": p['heard_p'],
                        "Is_Equivalent_Match": "Yes" if p['score'] >= 80 else "No"
                    })
                    
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    
    except KeyboardInterrupt:
        print(Fore.RED + "\n\nTest interrupted! Saving progress to CSV...")

    # Save to CSV
    if not dataset:
        print(Fore.YELLOW + "No data collected. Exiting.")
        return
        
    print(Fore.GREEN + f"\n💾 Saving {len(dataset)} phoneme pairs to {CSV_FILENAME}...")
    
    with open(CSV_FILENAME, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["Repetition", "Word", "Target_Phoneme", "Heard_Phoneme", "Is_Equivalent_Match"])
        writer.writeheader()
        for row in dataset:
            writer.writerow(row)
            
    print(Fore.GREEN + Style.BRIGHT + f"✅ DONE! Open {CSV_FILENAME} in Excel to view your accent profile!")
    print("If you see a Target_Phoneme constantly paired with a specific Heard_Phoneme, add them to 'phonetic_equivalents' in scoring.py!")

if __name__ == "__main__":
    main()
