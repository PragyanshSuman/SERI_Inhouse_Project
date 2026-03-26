import traceback
import sys

try:
    from fer import FER
    print("FER imported successfully!")
except Exception as e:
    print("FER failed to import:")
    traceback.print_exc()
    sys.exit(1)
