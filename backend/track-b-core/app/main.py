from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime 

# Import stub
# from app.stubs.track_a_stub import extract_context, get_comparison, get_source_details

# Import Track A (stub or real)
from app.services.track_a_loader import get_track_a

# Import database
from app.models.base import get_db
from app.models.models import User, DecisionJourney

# Load Track A once at startup
extract_context, get_comparison, get_source_details = get_track_a()
print("✅ Track A loaded successfully")

app = FastAPI(
    title="Kagua - Track B Core API",
    description="Core backend for Project Kagua",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    phone: str          # Required
    raw_input: str      # Required
    county: str         # Required
    name: str = None    # Optional

class CompareRequest(BaseModel):
    context: Dict[str, Any]
    field_observation: Dict[str, Any]

@app.get("/")
async def root():
    return {"message": "Kagua Track B is running! 🚀", "status": "healthy"}

@app.post("/analyze")
async def analyze(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Extract context from user's input and save journey"""
    
    from app.services.journey_service import get_or_create_user, create_journey
    
    # Pass name as well
    user = get_or_create_user(db, request.phone, request.county, request.name)
    
    # Call Track A (stub or real)
    result = extract_context(request.raw_input, request.county)
    
    # If crop and problem exist, create a journey
    if result.get("crop") and result.get("problem"):
        journey = create_journey(
            db, 
            user.id, 
            result["crop"], 
            result.get("season", "unknown"),
            result.get("growth_stage", "unknown"),
            result["problem"]
        )
        result["journey_id"] = journey.id
        result["user_id"] = user.id
    
    return result

@app.post("/compare")
async def compare(
    request: CompareRequest, 
    db: Session = Depends(get_db)
):
    """Get comparison and guidance, and save to journey"""
    
    from app.services.journey_service import update_journey_step
    
    # Get journey_id from context
    journey_id = request.context.get("journey_id")
    
    # Call Track A stub
    result = get_comparison(request.context, request.field_observation)
    
    # Save to journey if we have an ID
    if journey_id:
        step_data = {
            "comparison": result,
            "field_observation": request.field_observation,
            "timestamp": str(datetime.utcnow())
        }
        update_journey_step(db, journey_id, step_data)
        result["journey_id"] = journey_id
    
    return result

@app.post("/source-details")
async def source_details(sources: List[Dict[str, Any]]):
    """Get detailed content from sources"""
    result = get_source_details(sources)
    return result

@app.post("/test-user")
async def test_user(phone: str, county: str, name: str = None, db: Session = Depends(get_db)):
    """Test: Create or get user"""
    from app.services.journey_service import get_or_create_user
    user = get_or_create_user(db, phone, county, name)
    return {"user_id": user.id, "phone": user.phone_number, "county": user.county, "name": user.name}

@app.get("/user/{phone}/journeys")
async def get_user_journeys(phone: str, db: Session = Depends(get_db)):
    """Get all journeys for a user"""
    from app.models.models import User, DecisionJourney
    
    # Find user
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        return {"error": "User not found", "phone": phone}
    
    # Get all journeys for this user
    journeys = db.query(DecisionJourney).filter(
        DecisionJourney.user_id == user.id
    ).order_by(DecisionJourney.created_at.desc()).all()
    
    # Format response
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
            "created_at": journey.created_at.isoformat() if journey.created_at else None,
            "updated_at": journey.updated_at.isoformat() if journey.updated_at else None
        })
    
    return {
        "user_id": user.id,
        "phone": user.phone_number,
        "name": user.name,
        "total_journeys": len(result),
        "journeys": result
    }

@app.get("/journey/{journey_id}")
async def get_journey(journey_id: int, db: Session = Depends(get_db)):
    """Get a single journey by ID"""
    from app.models.models import DecisionJourney
    
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
        "created_at": journey.created_at.isoformat() if journey.created_at else None,
        "updated_at": journey.updated_at.isoformat() if journey.updated_at else None
    }


@app.put("/journey/{journey_id}/status")
async def update_journey_status(
    journey_id: int, 
    status: str, 
    db: Session = Depends(get_db)
):
    """Update journey status (in_progress, completed)"""
    from app.models.models import DecisionJourney
    
    journey = db.query(DecisionJourney).filter(
        DecisionJourney.id == journey_id
    ).first()
    
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    
    # Update status
    journey.status = status
    journey.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(journey)
    
    return {
        "message": "Status updated",
        "journey_id": journey.id,
        "new_status": journey.status
    }