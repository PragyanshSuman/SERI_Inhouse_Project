from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import models, database, auth
from jose import JWTError, jwt

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

class EmotionLogCreate(BaseModel):
    module_name: str
    feature_name: Optional[str] = None    # Human-readable feature name
    dominant_emotion: str
    concentration_score: float
    source: Optional[str] = "face"        # 'face' | 'audio'

class SyncRequest(BaseModel):
    logs: List[EmotionLogCreate]

@router.post("/sync-emotions")
def sync_emotions(req: SyncRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Receives an array of emotion logs recorded during an offline/active session and persists them.
    Now supports source differentiation (face/audio) and feature-level grouping.
    """
    db_logs = [
        models.EmotionLog(
            user_id=current_user.id,
            module_name=log.module_name,
            feature_name=log.feature_name or log.module_name,
            dominant_emotion=log.dominant_emotion,
            concentration_score=log.concentration_score,
            source=log.source or "face"
        )
        for log in req.logs
    ]
    db.add_all(db_logs)
    db.commit()
    return {"message": f"Successfully synced {len(db_logs)} emotion logs"}


@router.get("/reports/emotions")
def get_emotion_report(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """
    Aggregates historical emotion data for the user, now broken down by:
    - Overall summary
    - Per-feature summary (Letter Tracing, Phonic Check, etc.)
    - Source breakdown (face detection vs. voice analysis) per feature
    """
    logs = db.query(models.EmotionLog).filter(models.EmotionLog.user_id == current_user.id).all()

    if not logs:
        return {"total_logs": 0, "average_concentration": 0, "by_feature": {}, "overall_emotions": {}, "source_breakdown": {}}

    total_score = sum(log.concentration_score for log in logs)
    avg_score = round(total_score / len(logs))

    by_feature = {}
    overall_emotions = {}
    source_totals = {"face": 0, "audio": 0}

    for log in logs:
        feat = log.feature_name or log.module_name
        emo = log.dominant_emotion
        src = log.source or "face"

        # Overall aggregation
        overall_emotions[emo] = overall_emotions.get(emo, 0) + 1
        source_totals[src] = source_totals.get(src, 0) + 1

        # Per-feature aggregation
        if feat not in by_feature:
            by_feature[feat] = {
                "count": 0,
                "totalScore": 0,
                "emotions": {},
                "face_count": 0,
                "audio_count": 0,
                "face_emotions": {},
                "audio_emotions": {},
            }

        feat_data = by_feature[feat]
        feat_data["count"] += 1
        feat_data["totalScore"] += log.concentration_score
        feat_data["emotions"][emo] = feat_data["emotions"].get(emo, 0) + 1

        if src == "face":
            feat_data["face_count"] += 1
            feat_data["face_emotions"][emo] = feat_data["face_emotions"].get(emo, 0) + 1
        else:
            feat_data["audio_count"] += 1
            feat_data["audio_emotions"][emo] = feat_data["audio_emotions"].get(emo, 0) + 1

    # Calculate average concentration per feature
    for feat_data in by_feature.values():
        feat_data["avg_concentration"] = round(feat_data["totalScore"] / feat_data["count"])

    return {
        "total_logs": len(logs),
        "average_concentration": avg_score,
        "by_feature": by_feature,
        "overall_emotions": overall_emotions,
        "source_breakdown": source_totals,
    }
