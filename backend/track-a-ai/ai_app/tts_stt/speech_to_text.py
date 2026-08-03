from google import genai
import os

gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# Sentinel prefix the frontend checks for to detect STT failure
STT_ERROR_PREFIX = "__STT_ERROR__"

def speech_to_text(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    """
    Transcribes a farmer's voice note to text using Gemini.
    Returns the transcription on success, or a sentinel-prefixed error
    string on failure so the caller can distinguish a real transcription
    from an error message.
    """
    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": "Transcribe this audio exactly as spoken. Return only the transcription, no commentary. If the audio is in Kiswahili, English, or a mix of both, transcribe it in the language(s) actually spoken — do not translate."},
                        {"inline_data": {"mime_type": mime_type, "data": audio_bytes}},
                    ],
                }
            ],
        )

        if response.text is None:
            print("STT Error: Gemini returned None response")
            return f"{STT_ERROR_PREFIX}unclear"

        return response.text.strip()

    except Exception as e:
        error_str = str(e).lower()
        print(f"STT Error: {e}")

        # Detect quota exhaustion specifically so the frontend can show
        # a more helpful message than a generic failure
        if "quota" in error_str or "429" in error_str or "resource_exhausted" in error_str:
            return f"{STT_ERROR_PREFIX}quota"

        return f"{STT_ERROR_PREFIX}failed"
