from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    county = Column(String)
    preferred_language = Column(String, default="en")
    created_at = Column(DateTime, default=datetime.utcnow)

    journeys = relationship("DecisionJourney", back_populates="user")

class DecisionJourney(Base):
    __tablename__ = "decision_journeys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    crop = Column(String)
    season = Column(String)
    growth_stage = Column(String)
    problem = Column(String)
    status = Column(String, default="in_progress")  # in_progress, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="journeys")
    steps = Column(JSON, default=dict)  # Store screen-by-screen data
    follow_up_outcome = Column(String, nullable=True)   # "yes" | "not_yet"
    follow_up_rating = Column(String, nullable=True)    # "yes" | "somewhat" | "no"