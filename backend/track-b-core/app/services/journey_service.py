from sqlalchemy.orm import Session
from app.models.models import User, DecisionJourney
from datetime import datetime

def get_or_create_user(db: Session, phone: str, county: str, name: str = None, language: str = "en"):
    """Get existing user or create new one"""
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        user = User(
            name=name,
            phone_number=phone,
            county=county,
            preferred_language=language
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def create_journey(db: Session, user_id: int, crop: str, season: str, growth_stage: str, problem: str):
    """Start a new decision journey"""
    journey = DecisionJourney(
        user_id=user_id,
        crop=crop,
        season=season,
        growth_stage=growth_stage,
        problem=problem,
        status="in_progress"
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)
    return journey

def update_journey_step(db: Session, journey_id: int, step_data: dict):
    """Update journey with screen data"""
    journey = db.query(DecisionJourney).filter(DecisionJourney.id == journey_id).first()
    if journey:
        journey.steps = step_data
        journey.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(journey)
    return journey