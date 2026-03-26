from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    emotion_logs = relationship("EmotionLog", back_populates="user")

class EmotionLog(Base):
    __tablename__ = "emotion_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    module_name = Column(String, index=True)           # e.g. "Tracing", "PhonicCheck"
    feature_name = Column(String, nullable=True)       # Human-readable: "Letter Tracing"
    dominant_emotion = Column(String)
    concentration_score = Column(Float)
    source = Column(String, default="face")            # 'face' | 'audio'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="emotion_logs")
