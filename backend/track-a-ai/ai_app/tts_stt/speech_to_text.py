from google import genai
import os
# Initialize the Gemini client
gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
# Function to transcribe audio to text
def speech_to_text(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    """
    Transcribes a farmer's voice note to text using Gemini. Returns the raw transcribed text
    Turns the raw transcribed text into a more readable format using Gemini. Returns the formatted text.
    """
    # Transcribe the audio
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
    return response.text.strip()                


