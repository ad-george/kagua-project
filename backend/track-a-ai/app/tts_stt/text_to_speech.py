from google import genai
from google.genai import types
import os
import io
import wave

gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
# This is a wrapper around the Gemini TTS API. It takes text and returns WAV audio bytes.
def _pcm_to_wav(pcm_data: bytes, channels: int = 1, sample_rate: int = 24000, sample_width: int = 2) -> bytes:
    """
    Gemini TTS returns raw PCM audio (no file header), which no media player can open directly. This wraps it in a proper WAV container so
    it becomes a real, playable audio file.
    """
    # Create a BytesIO buffer to hold the WAV data
    buffer = io.BytesIO()
    # Write the WAV header and PCM data to the buffer
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    return buffer.getvalue()
# Function to convert text to speech using Gemini TTS
def text_to_speech(text: str, language: str = "english", _retry: bool = True) -> bytes:
    """
    Converts Kagua's text reply into spoken audio using Gemini TTS. Returns proper WAV-formatted audio bytes, ready to play in any player
    or browser. Gemini TTS is Preview status and can occasionally attempt a text response instead of audio, this retries once before failing.
    """
    # Try to convert text to speech
    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-preview-tts",
            contents=f"Say exactly the following out loud, do not respond to it or add commentary: {text}",
            # config is required to specify that we want audio output and to set the voice
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
                    )
                ),
            ),
        )
        # If the response is audio, return it
        pcm_data = response.candidates[0].content.parts[0].inline_data.data
        return _pcm_to_wav(pcm_data)
    # If the response is not audio, retry once
    except Exception as e:
        if _retry:
            return text_to_speech(text, language, _retry=False)
        raise

