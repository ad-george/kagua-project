import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import bcrypt
# from passlib.context import CryptContext

# 1. Force load environmental keys directly into system memory before importing loaders
load_dotenv()

# Import Track A (stub or real)
from app.services.track_a_loader import get_track_a

# Import database
from app.models.base import get_db
from app.models.models import DecisionJourney, User

# Load Track A once at startup
extract_context, get_comparison, get_source_details, generate_summary = get_track_a()

# Import Track A functions
from ai_app.rag.retriever import retrieve_knowledge
from app.audio_endpoints import register_audio_endpoints

print("Track A loaded successfully")

# Create FastAPI app
app = FastAPI(
    title="Kagua - Track B Core API",
    description="Core backend for Project Kagua",
    version="0.1.0",
)

# Add CORS middleware to allow cross-origin requests (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register audio endpoints
register_audio_endpoints(app)

# ====================== AUTH SETUP ======================
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ADD THIS INSTEAD:
# import bcrypt

# ====================== AUTH SETUP ======================
def hash_pin(pin: str) -> str:
    """Hashes a plain text PIN/Password safely."""
    # Convert string to bytes, generate a fresh salt, and hash it
    bytes_pin = pin.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(bytes_pin, salt).decode('utf-8')

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Verifies a plain text PIN against a stored hash."""
    return bcrypt.checkpw(plain_pin.encode('utf-8'), hashed_pin.encode('utf-8'))


class SignupRequest(BaseModel):
    name: Optional[str] = None
    phone: str
    county: str
    pin: str

class LoginRequest(BaseModel):
    phone: str
    pin: str


# Define request models for analyze and compare endpoints
class AnalyzeRequest(BaseModel):
    phone: str
    raw_input: str
    county: str
    name: str = None


# Define request model for compare endpoint
class CompareRequest(BaseModel):
    context: Dict[str, Any]
    field_observation: List[str] = []  # Screen 3 sends a list, not a dict


# Define request model for the summary endpoint — takes the context plus
# the comparison result already computed in /compare, so this endpoint
# does no comparison work of its own, only narrates what's already decided.
# Triggered at the Screen 4 → 5 transition (not eagerly inside /compare),
# since Screen 4 doesn't need this content, only Screen 5 does.
class SummaryRequest(BaseModel):
    context: Dict[str, Any]
    comparison: Dict[str, Any]


# Define request model for source details endpoint
class SourceDetailsRequest(BaseModel):
    sources_used: list


# Define request model for the Screen 4 reply-capture endpoint (Idea 12).
# Keyed by advice_received index (as a string, since JSON object keys are
# always strings) -> the verbatim reply text the farmer logged. Stored
# as-is, no evaluation or reshaping — matches the "closes the loop"
# behavior described in the Screen 4/5 design doc.
class RepliesRequest(BaseModel):
    replies: Dict[str, str]


@app.get("/")
async def root():
    return {"message": "Kagua Track B is running!", "status": "healthy"}


# Analyze endpoint: Extract context from user's input and save journey
@app.post("/analyze")
async def analyze(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Extract context from user's input and save journey"""
    from app.services.journey_service import create_journey, get_or_create_user

    user = get_or_create_user(db, request.phone, request.county, request.name)
    result = extract_context(request.raw_input, request.county)

    # If both crop and reported_problem are present, create a new journey.
    # We now also pass the full extracted context and raw input, so the
    # journey can later be resumed exactly where the farmer left off.
    if result.get("crop") and result.get("reported_problem"):
        journey = create_journey(
            db,
            user.id,
            result["crop"],
            result.get("season", "unknown"),
            result.get("growth_stage", "unknown"),
            result["reported_problem"],
            extracted_context=result,
            raw_input=request.raw_input,
        )
        result["journey_id"] = journey.id
        result["user_id"] = user.id
    return result


# Compare endpoint: Search knowledge base, get comparison and guidance, and save to journey
@app.post("/compare")
async def compare(request: CompareRequest, db: Session = Depends(get_db)):
    """Search the knowledge base, get comparison and guidance, and save to journey"""
    from app.services.journey_service import update_journey_step

    journey_id = request.context.get("journey_id")

    # Combine what extract_context already found with Screen 3's field observations.
    combined_observations = (
        request.context.get("observations", []) + request.field_observation
    )
    # To ensure retrieve_knowledge sees the combined observations, not just what extract_context originally found.
    retrieved = retrieve_knowledge(
        crop=request.context.get("crop"),
        reported_problem=request.context.get("reported_problem"),
        observations=combined_observations,
    )
    # To ensure get_comparison also sees the combined observations, not just what extract_context originally found.
    enriched_context = dict(request.context)
    enriched_context["observations"] = combined_observations
    result = get_comparison(enriched_context, retrieved)
    if isinstance(result, dict):
        result.setdefault("observed", enriched_context.get("observations", []))

    # If a journey_id is present, merge this step's data into the journey's
    # existing steps (rather than overwriting them), and mark that the
    # farmer has now reached Screen 4, this is what lets "Continue" resume
    # at the correct screen instead of always restarting at Screen 1.
    if journey_id:
        # Also update extracted_context.observations to include field observations
        # so they're available when displaying the summary in Screen 5
        updated_context = dict(request.context)
        updated_context["observations"] = combined_observations
        
        updates = {
            "current_screen": 4,
            "field_observation": request.field_observation,
            "comparison": result,
            "extracted_context": updated_context,
            "timestamp": str(datetime.utcnow()),
        }
        update_journey_step(db, journey_id, updates)
        result["journey_id"] = journey_id
    return result


# Summary endpoint: Generate the natural-language Kagua Summary for Screen 5,
# using the context plus the comparison already computed in /compare. Called
# when the farmer taps Continue on Screen 4 — not folded into /compare —
# since Screen 4 itself never needs this content, only Screen 5 does.
@app.post("/summary")
async def summary(request: SummaryRequest, db: Session = Depends(get_db)):
    """Generate the Kagua Summary and save it to the journey"""
    from app.services.journey_service import update_journey_step

    journey_id = request.context.get("journey_id")

    result = generate_summary(request.context, request.comparison)

    # Same merge-not-overwrite pattern as /compare, marking that the farmer
    # has now reached Screen 5.
    if journey_id:
        updates = {
            "current_screen": 5,
            "summary": result,
            "timestamp": str(datetime.utcnow()),
        }
        update_journey_step(db, journey_id, updates)
        result["journey_id"] = journey_id
    return result


# Source details endpoint: Get detailed content from sources
@app.post("/source-details")
async def source_details(request: SourceDetailsRequest):
    """Forward source details retrieval to Track A"""
    result = get_source_details(request.sources_used)
    return result


# Screen 4 reply-capture endpoint (Idea 12): persists what the farmer
# logged after sending the shaped question to a source. Stored inside
# `steps.screen4_replies` via the same merge-not-overwrite helper used by
# /compare and /summary, so it survives a resumed journey fetched fresh
# from GET /journey/{id} on a different device/session — closing the gap
# that used to leave this client-state-only.
@app.put("/journey/{journey_id}/replies")
async def update_replies(journey_id: int, request: RepliesRequest, db: Session = Depends(get_db)):
    """Save the farmer's Screen 4 reply-capture answers, verbatim."""
    from app.services.journey_service import update_journey_step

    journey = db.query(DecisionJourney).filter(DecisionJourney.id == journey_id).first()
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}

    update_journey_step(db, journey_id, {"screen4_replies": request.replies})
    return {"message": "Replies saved", "journey_id": journey_id}


# Test endpoint to create or get a user
@app.post("/test-user")
async def test_user(
    phone: str, county: str, name: str = None, db: Session = Depends(get_db)
):
    """Test: Create or get user"""
    from app.services.journey_service import get_or_create_user

    user = get_or_create_user(db, phone, county, name)
    return {"user_id": user.id, "phone": user.phone_number, "county": user.county, "name": user.name}


# Test endpoint to create a journey
@app.get("/user/{phone}/journeys")
async def get_user_journeys(phone: str, db: Session = Depends(get_db)):
    """Get all journeys for a user"""
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        return {"error": "User not found", "phone": phone}
    journeys = (
        db.query(DecisionJourney)
        .filter(DecisionJourney.user_id == user.id)
        .order_by(DecisionJourney.created_at.desc())
        .all()
    )
    result = []
    for journey in journeys:
        result.append({
            "id": journey.id,
            "crop": journey.crop,
            "season": journey.season,
            "growth_stage": journey.growth_stage,
            "problem": journey.problem,
            "status": journey.status,
            "steps": journey.steps,
            # Needed so the frontend's feedback prompt can tell whether the
            # most recent summary was already answered or skipped, instead
            # of re-asking about it on every login.
            "follow_up_outcome": journey.follow_up_outcome,
            "follow_up_rating": journey.follow_up_rating,
            "created_at": journey.created_at.isoformat() if journey.created_at else None,
            "updated_at": journey.updated_at.isoformat() if journey.updated_at else None,
        })
    return {
        "user_id": user.id,
        "phone": user.phone_number,
        "name": user.name,
        "total_journeys": len(result),
        "journeys": result,
    }


# Test endpoint to get a single journey by ID
@app.get("/journey/{journey_id}")
async def get_journey(journey_id: int, db: Session = Depends(get_db)):
    """Get a single journey by ID"""
    journey = db.query(DecisionJourney).filter(
        DecisionJourney.id == journey_id
    ).first()
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    return {
        "id": journey.id,
        "user_id": journey.user_id,
        "crop": journey.crop,
        "season": journey.season,
        "growth_stage": journey.growth_stage,
        "problem": journey.problem,
        "status": journey.status,
        "steps": journey.steps,
        "follow_up_outcome": journey.follow_up_outcome,
        "follow_up_rating": journey.follow_up_rating,
        "created_at": (
            journey.created_at.isoformat() if journey.created_at else None
        ),
        "updated_at": (
            journey.updated_at.isoformat() if journey.updated_at else None
        ),
    }


# Follow-up endpoint: saves the farmer's post-conversation outcome and
# rating. Called from the Home screen when the farmer responds to the
# "How did it go?" card. Both fields are optional so a partial response
# (e.g. only outcome, no rating yet) is still saved.
class FollowUpRequest(BaseModel):
    outcome: Optional[str] = None
    rating: Optional[str] = None


@app.put("/journey/{journey_id}/follow-up")
async def update_follow_up(journey_id: int, request: FollowUpRequest, db: Session = Depends(get_db)):
    """Save the farmer's follow-up outcome and helpfulness rating."""
    journey = db.query(DecisionJourney).filter(DecisionJourney.id == journey_id).first()
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    if request.outcome is not None:
        journey.follow_up_outcome = request.outcome
    if request.rating is not None:
        journey.follow_up_rating = request.rating
    journey.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Follow-up saved", "journey_id": journey_id}

# ====================== AUTH ENDPOINTS ======================

@app.post("/auth/signup")
def auth_signup(payload: SignupRequest, db: Session = Depends(get_db)):
    # 1. Validate PIN is exactly 4 digits
    if not payload.pin or not payload.pin.isdigit() or len(payload.pin) != 4:
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")

    # 2. Check if phone already exists
    existing = db.query(User).filter(User.phone_number == payload.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this phone already exists")

    # 3. Create new user with hashed PIN
    user = User(
        phone_number=payload.phone,
        name=payload.name,
        county=payload.county,
        preferred_language="en",
        pin_hash = hash_pin(payload.pin)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "phone": user.phone_number,
        "name": user.name,
        "county": user.county
    }


@app.post("/auth/login")
def auth_login(payload: LoginRequest, db: Session = Depends(get_db)):
    # 1. Validate PIN format
    if not payload.pin or not payload.pin.isdigit() or len(payload.pin) != 4:
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")

    # 2. Find user by phone
    user = db.query(User).filter(User.phone_number == payload.phone).first()

    if not user or not user.pin_hash:
        raise HTTPException(status_code=401, detail="Invalid phone")

    # 3. Verify the PIN
    if not verify_pin(payload.pin, user.pin_hash):
        raise HTTPException(status_code=400, detail="Invalid PIN")


    return {
        "id": user.id,
        "phone": user.phone_number,
        "name": user.name,
        "county": user.county
    }


# Test endpoint to update the status of a journey
@app.put("/journey/{journey_id}/status")
async def update_journey_status(
    journey_id: int, status: str, db: Session = Depends(get_db)
):
    """Update journey status (in_progress, completed)"""
    journey = db.query(DecisionJourney).filter(
        DecisionJourney.id == journey_id
    ).first()
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    journey.status = status
    journey.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(journey)
    return {
        "message": "Status updated",
        "journey_id": journey.id,
        "status": journey.status,
    }