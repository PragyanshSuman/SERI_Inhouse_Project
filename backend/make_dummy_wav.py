import wave
import struct

# Create a valid 1-second silent WAV file at 16000Hz
with wave.open("dummy.wav", "w") as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(16000)
    for _ in range(16000):
        f.writeframesraw(struct.pack('<h', 0))
