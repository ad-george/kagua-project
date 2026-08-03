from fastapi import UploadFile, File
from fastapi.responses import Response
from ai_app.tts_stt.text_to_speech import text_to_speech
from ai_app.tts_stt.speech_to_text import speech_to_text

def register_audio_endpoints(app):
    """Register audio TTS/STT endpoints with the FastAPI app"""

    @app.get("/test-stt")
    async def test_stt_get():
        return {"message": "Use POST with a file upload for this endpoint."}

    @app.post("/test-stt")
    async def test_stt(file: UploadFile = File(...)):
        audio_bytes = await file.read()
        transcription = speech_to_text(audio_bytes, mime_type=file.content_type)
        return {"transcription": transcription}

    @app.get("/tts")
    def tts(text: str, language: str = "english"):
        """
        Convert text to speech using Gemini TTS.
        language: "english" | "kiswahili" | "mixed"
        """
        try:
            audio_bytes = text_to_speech(text, language=language)
            if not audio_bytes:
                raise Exception("TTS returned empty audio data")
            return Response(content=audio_bytes, media_type="audio/wav")
        except Exception as e:
            print(f"TTS Error: {e}")
            raise

    # Keep old endpoint name working so nothing else breaks
    @app.get("/test-tts")
    def test_tts(text: str = "Hello, this is a test of Kagua's voice.", language: str = "english"):
        try:
            audio_bytes = text_to_speech(text, language=language)
            if not audio_bytes:
                raise Exception("TTS returned empty audio data")
            return Response(content=audio_bytes, media_type="audio/wav")
        except Exception as e:
            print(f"TTS Error: {e}")
            raise
