"""
Standalone test for text_to_speech() — generates real audio files so you
can actually listen to English AND Kiswahili output and judge intelligibility
yourself, before wiring backend TTS into AudioPlayer/Screen4/Screen5.

Usage:
    Run this from backend/track-b-core (or adjust the sys.path line below
    to wherever your track-a-ai folder actually is relative to this file).

    python test_tts.py

Requires GEMINI_API_KEY to already be set in your environment (same .env
used by the rest of track-a-ai).
"""

import sys
import os
from dotenv import load_dotenv

# This script bypasses the normal app startup (main.py -> track_a_loader.py),
# which is what normally loads the .env file — so it needs to load it here
# itself, or GEMINI_API_KEY will never actually be set.
load_dotenv()

# Add track-a-ai to the import path the same way track_a_loader.py does,
# so this can run standalone without needing the full FastAPI app running.
sys.path.insert(0, os.path.abspath("../track-a-ai"))

from ai_app.tts_stt.text_to_speech import text_to_speech

TEST_CASES = [
    {
        "name": "english_sample",
        "language": "english",
        "text": (
            "Crop: maize. Observed problem: yellow leaves. What remains "
            "uncertain: trusted sources do not yet have a confident match "
            "for this exact situation."
        ),
    },
    {
        "name": "kiswahili_sample",
        "language": "kiswahili",
        "text": (
            "Zao: mahindi. Tatizo lililoripotiwa: majani ya njano. "
            "Hakuna mwongozo ulioidhinishwa uliolingana na hali hii bado."
        ),
    },
]

def run_tests():
    for case in TEST_CASES:
        print(f"Generating: {case['name']} (language={case['language']})...")
        try:
            audio_bytes = text_to_speech(case["text"], language=case["language"])
            filename = f"{case['name']}.wav"
            with open(filename, "wb") as f:
                f.write(audio_bytes)
            print(f"  Saved to {filename} — play it and listen for yourself.\n")
        except Exception as e:
            print(f"  FAILED: {e}\n")
    print(
        "Now actually listen to both .wav files. Specifically check:\n"
        "  - Does the Kiswahili sample sound like real, intelligible Kiswahili\n"
        "    (not English pronunciation of Kiswahili words, not garbled)?\n"
        "  - Does either sample add unexpected commentary instead of just\n"
        "    reading the text verbatim?\n"
        "  - Does the pacing/tone feel appropriate for a calm, trustworthy\n"
        "    farming companion, not robotic or jarring?\n"
    )
if __name__ == "__main__":
    run_tests()



