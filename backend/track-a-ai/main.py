import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi import UploadFile, File
from pydantic import BaseModel
import uvicorn
from groq import Groq
from google import genai

from app.extract_context import extract_context
from app.rag.retriever import retrieve_knowledge
from app.get_comparison import get_comparison
from app.safety_guardrails import apply_guardrails
from app.get_source_details import get_source_details
from app.tts_stt.text_to_speech import text_to_speech
from app.tts_stt.speech_to_text import speech_to_text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


@app.get("/")
def health_check():
    return {"status": "Track A is running"}


@app.get("/test-groq")
def test_groq():
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say hello in one short sentence."}],
    )
    return {"groq_response": response.choices[0].message.content}


@app.get("/test-gemini")
def test_gemini():
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say hello in one short sentence.",
    )
    return {"gemini_response": response.text}


@app.get("/test-retrieval")
def test_retrieval():
    sample_input = "My maize has holes in the leaves."
    context = extract_context(sample_input)
    matches = retrieve_knowledge(
        crop=context["crop"],
        reported_problem=context["reported_problem"],
        observations=context["observations"],
    )
    return {
        "extracted": context,
        "matches_found": len(matches),
        "matched_topics": [m.get("topic") for m in matches],
    }


@app.get("/test-comparison-high")
def test_comparison_high():
    sample_input = "My maize leaves have grey rectangular spots."
    context = extract_context(sample_input)
    retrieved = retrieve_knowledge(
        crop=context["crop"],
        reported_problem=context["reported_problem"],
        observations=context["observations"],
    )
    comparison = get_comparison(context, retrieved)
    comparison = apply_guardrails(comparison)
    return {
        "extracted": context,
        "retrieved_count": len(retrieved),
        "comparison": comparison,
    }


@app.get("/test-comparison-low")
def test_comparison_low():
    sample_input = "My maize seeds did not germinate at all this season."
    context = extract_context(sample_input)
    retrieved = retrieve_knowledge(
        crop=context["crop"],
        reported_problem=context["reported_problem"],
        observations=context["observations"],
    )
    comparison = get_comparison(context, retrieved)
    comparison = apply_guardrails(comparison)
    return {
        "extracted": context,
        "retrieved_count": len(retrieved),
        "comparison": comparison,
    }


@app.get("/test-stt")
async def test_stt_get():
    return {"message": "Use POST with a file upload for this endpoint."}


@app.post("/test-stt")
async def test_stt(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    transcription = speech_to_text(audio_bytes, mime_type=file.content_type)
    return {"transcription": transcription}


@app.get("/test-tts")
def test_tts(text: str = "Hello Grace, this is a test of Kagua's voice."):
    audio_bytes = text_to_speech(text)
    return Response(content=audio_bytes, media_type="audio/wav")


# ---------------------------------------------------------------------
# Real endpoints for the frontend to call, replacing mock data
# ---------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    raw_input: str
    county: str = "Kiambu"


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    return extract_context(req.raw_input, req.county)


class CompareRequest(BaseModel):
    context: dict
    field_observation: list = []


@app.post("/compare")
def compare(req: CompareRequest):
    combined_observations = req.context.get("observations", []) + req.field_observation

    retrieved = retrieve_knowledge(
        crop=req.context.get("crop"),
        reported_problem=req.context.get("reported_problem"),
        observations=combined_observations,
    )

    # Ensure Screen 3's observations flow into get_comparison too, not just retrieval
    enriched_context = dict(req.context)
    enriched_context["observations"] = combined_observations

    comparison = get_comparison(enriched_context, retrieved)
    comparison = apply_guardrails(comparison)
    return comparison


class SourceDetailsRequest(BaseModel):
    sources_used: list


@app.post("/source-details")
def source_details(req: SourceDetailsRequest):
    return get_source_details(req.sources_used)


if __name__ == "__main__":
    port = int(os.getenv("TRACK_A_PORT", "8001"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)