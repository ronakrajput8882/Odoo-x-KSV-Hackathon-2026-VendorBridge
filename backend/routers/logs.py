from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
import models

router = APIRouter(prefix="/api/logs", tags=["Logs"])

@router.get("/")
def get_logs(
    entity: str = Query(default=""),
    action: str = Query(default=""),
    limit:  int = Query(default=50),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    q = db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc())
    if entity: q = q.filter(models.ActivityLog.entity_type == entity)
    if action: q = q.filter(models.ActivityLog.action == action)
    logs = q.limit(limit).all()
    return [
        {
            "id":          l.id,
            "action":      l.action,
            "entity":      l.entity_type,
            "entity_id":   l.entity_id,
            "description": l.description,
            "timestamp":   l.timestamp,
            "user": {
                "id":   l.user.id,
                "name": l.user.name,
                "role": l.user.role,
            } if l.user else None,
        }
        for l in logs
    ]