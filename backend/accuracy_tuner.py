import sounddevice as sd
import numpy as np
from scipy.io.wavfile import write
import time
import os
import colorama
from colorama import Fore, Style
from scoring import evaluate_pronunciation

colorama.init(autoreset=True)

WORDS_TO_TEST = ["cat", "dog", "elephant", "hit", "head", "think", "this", "van"]

def record_audio(filename, duration=3, fs=16000):
    print(Fore.CYAN + f"\n🎙️  Get ready... Recording in 1 second!")
    time.sleep(1)
    print(Fore.RED + f"🔴 RECORDING NOW! Please say the word...")
    
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32')
    sd.wait()  # Wait until recording is finished
    
    print(Fore.GREEN + f"✅ Recording stopped.")
    
    # Save as WAV file
    write(filename, fs, recording)

def print_result(word, result):
    if "error" in result:
        print(Fore.RED + f"Error: {result['error']}")
        return

    print("\n" + "="*50)
    print(Fore.YELLOW + f"RESULTS FOR: '{word.upper()}'")
    print(Style.DIM + "-"*50)
    print(f"Target ARPAbet: {result['debug_target_ipa']}")
    print(f"Heard ARPAbet:  {result['transcription_heard']}")
    print(Style.DIM + "-"*50)
    
    print(Fore.CYAN + "Phoneme Breakdown:")
    for p in result['phonemes']:
        color = Fore.GREEN if p['score'] >= 80 else Fore.YELLOW if p['score'] >= 50 else Fore.RED
        print(f"  [{p['p'].ljust(3)}] -> Score: {color}{str(p['score']).ljust(3)}%{Style.RESET_ALL} | Feedback: {p['feedback']}")
    
    print(Style.DIM + "-"*50)
    final_color = Fore.GREEN if result['word_accuracy'] >= 80 else Fore.YELLOW if result['word_accuracy'] >= 60 else Fore.RED
    print(f"FINAL ACCURACY: {final_color}{result['word_accuracy']}%")
    print(f"VERDICT: {result['verdict']}")
    print("="*50 + "\n")

def main():
    print(Fore.MAGENTA + Style.BRIGHT + "=== 🛠️ ACCURACY TUNER HARNESS ===")
    print("This tool lets you rapidly test words and tune the 'phonetic_equivalents' in scoring.py")
    print("Press Ctrl+C at any time to exit.\n")
    
    for word in WORDS_TO_TEST:
        response = input(Fore.WHITE + f"\nTest the word '{word}'? (Press Enter to record, 's' to skip, 'q' to quit): ").strip().lower()
        if response == 'q':
            break
        elif response == 's':
            continue
            
        temp_file = "temp_tuner_audio.wav"
        
        # 1. Record
        record_audio(temp_file, duration=1.5) # 1.5 seconds prevents trailing background noise
        
        # 2. Evaluate
        print(Fore.BLUE + "⏳ Analyzing phonemes...")
        result = evaluate_pronunciation(word, temp_file)
        
        # 3. Display
        print_result(word, result)
        
        # Cleanup
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == "__main__":
    main()
