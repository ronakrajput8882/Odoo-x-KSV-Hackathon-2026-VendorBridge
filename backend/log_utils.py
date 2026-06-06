from sqlalchemy.orm import Session
import models


def log_activity(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    description: str
):
    entry = models.ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description
    )
    db.add(entry)
    db.commit()
