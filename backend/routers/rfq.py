from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
from log_utils import log_activity
from datetime import datetime
import models, schemas

router = APIRouter(prefix="/api/rfq", tags=["RFQ"])


def gen_rfq_number(db: Session) -> str:
    count = db.query(models.RFQ).count() + 1
    return f"RFQ-{datetime.now().year}-{count:04d}"


@router.get("/", response_model=list[schemas.RFQOut])
def list_rfqs(
    status: str = Query(default=""),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    q = db.query(models.RFQ)
    # Vendors only see RFQs assigned to them
    if user.role == "vendor":
        vendor = db.query(models.Vendor).filter(
            models.Vendor.contact_email == user.email
        ).first()
        if vendor:
            assigned_rfq_ids = [
                rv.rfq_id for rv in
                db.query(models.RFQVendor).filter(models.RFQVendor.vendor_id == vendor.id).all()
            ]
            q = q.filter(models.RFQ.id.in_(assigned_rfq_ids))
        else:
            return []
    if status:
        q = q.filter(models.RFQ.status == status)
    return q.order_by(models.RFQ.created_at.desc()).all()


@router.post("/", response_model=schemas.RFQOut, status_code=201)
def create_rfq(
    data: schemas.RFQCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    rfq = models.RFQ(
        rfq_number=gen_rfq_number(db),
        title=data.title,
        description=data.description,
        items=[item.model_dump() for item in data.items],
        deadline=data.deadline,
        created_by=user.id,
    )
    db.add(rfq)
    db.flush()  # get rfq.id before commit

    # Assign vendors
    for vid in data.vendor_ids:
        db.add(models.RFQVendor(rfq_id=rfq.id, vendor_id=vid))

    db.commit()
    db.refresh(rfq)
    log_activity(db, user.id, "CREATED", "RFQ", rfq.id, f"RFQ '{rfq.title}' created ({rfq.rfq_number})")
    return rfq


@router.get("/{rfq_id}", response_model=schemas.RFQOut)
def get_rfq(rfq_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rfq = db.query(models.RFQ).filter(models.RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


@router.get("/{rfq_id}/vendors")
def get_rfq_vendors(rfq_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    assignments = db.query(models.RFQVendor).filter(models.RFQVendor.rfq_id == rfq_id).all()
    return [
        {"id": a.vendor.id, "name": a.vendor.name, "email": a.vendor.contact_email}
        for a in assignments if a.vendor
    ]


@router.patch("/{rfq_id}/close", response_model=schemas.RFQOut)
def close_rfq(rfq_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    rfq = db.query(models.RFQ).filter(models.RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    rfq.status = "closed"
    db.commit()
    db.refresh(rfq)
    log_activity(db, user.id, "UPDATED", "RFQ", rfq.id, f"RFQ '{rfq.title}' closed")
    return rfq