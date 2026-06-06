from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
from log_utils import log_activity
import models

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])

@router.get("/")
def list_approvals(db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(models.Approval)
    if user.role not in ["admin", "manager"]:
        q = q.filter(models.Approval.approver_id == user.id)
    return [
        {
            "id": a.id, "status": a.status, "remarks": a.remarks,
            "timestamp": a.created_at,
            "quotation_id": a.quotation_id,
            "approver_id": a.approver_id,
            "quotation": {
                "id": a.quotation.id,
                "total_price": a.quotation.total_price,
                "delivery_days": a.quotation.delivery_days,
                "vendor_name": a.quotation.vendor.name if a.quotation.vendor else "—",
                "rfq_number": a.quotation.rfq.rfq_number if a.quotation.rfq else "—",
                "rfq_title": a.quotation.rfq.title if a.quotation.rfq else "—",
            } if a.quotation else None,
        }
        for a in q.order_by(models.Approval.created_at.desc()).all()
    ]

@router.post("/request/{quotation_id}")
def request_approval(quotation_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not q: raise HTTPException(404, "Quotation not found")
    existing = db.query(models.Approval).filter(models.Approval.quotation_id == quotation_id).first()
    if existing: raise HTTPException(400, "Approval already requested")
    a = models.Approval(quotation_id=quotation_id, approver_id=user.id, status="pending")
    db.add(a); db.commit(); db.refresh(a)
    log_activity(db, user.id, "CREATED", "Approval", a.id, f"Approval requested for quotation #{quotation_id}")
    return {"id": a.id, "status": a.status}

@router.patch("/{approval_id}/approve")
def approve(approval_id: int, payload: dict = {}, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = db.query(models.Approval).filter(models.Approval.id == approval_id).first()
    if not a: raise HTTPException(404, "Not found")
    if a.status != "pending": raise HTTPException(400, "Already actioned")
    a.status = "approved"; a.remarks = payload.get("remarks", ""); a.approver_id = user.id
    db.commit(); db.refresh(a)
    log_activity(db, user.id, "UPDATED", "Approval", a.id, f"Approval #{a.id} approved")
    return {"id": a.id, "status": a.status}

@router.patch("/{approval_id}/reject")
def reject(approval_id: int, payload: dict = {}, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = db.query(models.Approval).filter(models.Approval.id == approval_id).first()
    if not a: raise HTTPException(404, "Not found")
    if a.status != "pending": raise HTTPException(400, "Already actioned")
    a.status = "rejected"; a.remarks = payload.get("remarks", ""); a.approver_id = user.id
    db.commit(); db.refresh(a)
    log_activity(db, user.id, "UPDATED", "Approval", a.id, f"Approval #{a.id} rejected")
    return {"id": a.id, "status": a.status}