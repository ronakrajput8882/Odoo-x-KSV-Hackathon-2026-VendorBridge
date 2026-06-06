from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
from log_utils import log_activity
import models, schemas

router = APIRouter(prefix="/api/quotations", tags=["Quotations"])


def _vendor_for_user(user, db):
    return db.query(models.Vendor).filter(
        models.Vendor.contact_email == user.email
    ).first()


@router.get("/", response_model=list[schemas.QuotationOut])
def list_quotations(
    rfq_id: int  = Query(default=None),
    status:  str = Query(default=""),
    db: Session  = Depends(get_db),
    user         = Depends(get_current_user)
):
    q = db.query(models.Quotation)
    if user.role == "vendor":
        v = _vendor_for_user(user, db)
        if not v:
            return []
        q = q.filter(models.Quotation.vendor_id == v.id)
    if rfq_id:
        q = q.filter(models.Quotation.rfq_id == rfq_id)
    if status:
        q = q.filter(models.Quotation.status == status)
    return q.order_by(models.Quotation.submitted_at.desc()).all()


@router.post("/", response_model=schemas.QuotationOut, status_code=201)
def submit_quotation(
    data: schemas.QuotationCreate,
    db: Session = Depends(get_db),
    user        = Depends(get_current_user)
):
    if user.role == "vendor":
        v = _vendor_for_user(user, db)
        if not v:
            raise HTTPException(404, "No vendor record linked to your account email")
        vendor_id = v.id
    else:
        if not data.vendor_id:
            raise HTTPException(400, "vendor_id required")
        vendor_id = data.vendor_id

    rfq = db.query(models.RFQ).filter(models.RFQ.id == data.rfq_id).first()
    if not rfq:
        raise HTTPException(404, "RFQ not found")
    if rfq.status != "open":
        raise HTTPException(400, "RFQ is not open for quotations")

    dup = db.query(models.Quotation).filter(
        models.Quotation.rfq_id    == data.rfq_id,
        models.Quotation.vendor_id == vendor_id
    ).first()
    if dup:
        raise HTTPException(400, "Already submitted — use edit instead")

    q = models.Quotation(
        rfq_id=data.rfq_id,
        vendor_id=vendor_id,
        unit_price=data.unit_price,
        total_price=data.total_price,
        delivery_days=data.delivery_days,
        notes=data.notes or "",
        status="pending",
    )
    db.add(q); db.commit(); db.refresh(q)
    log_activity(db, user.id, "CREATED", "Quotation", q.id,
                 f"Quotation for {rfq.rfq_number} — ₹{q.total_price}")
    return q


@router.get("/rfq/{rfq_id}", response_model=list[schemas.QuotationOut])
def quotes_for_rfq(rfq_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Quotation).filter(models.Quotation.rfq_id == rfq_id).all()


@router.get("/compare/{rfq_id}")
def compare_quotations(
    rfq_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    rfq = db.query(models.RFQ).filter(models.RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(404, "RFQ not found")

    quotes     = db.query(models.Quotation).filter(models.Quotation.rfq_id == rfq_id).all()
    prices     = [q.total_price   for q in quotes if q.total_price]
    deliveries = [q.delivery_days for q in quotes if q.delivery_days]

    return {
        "rfq": {
            "id": rfq.id, "rfq_number": rfq.rfq_number,
            "title": rfq.title, "status": rfq.status,
            "items": rfq.items or [],
            "deadline": rfq.deadline.isoformat() if rfq.deadline else None,
        },
        "min_price":    min(prices)     if prices     else None,
        "min_delivery": min(deliveries) if deliveries else None,
        "quotations": [
            {
                "id":              q.id,
                "vendor_id":       q.vendor_id,
                "vendor_name":     q.vendor.name             if q.vendor else "—",
                "vendor_rating":   getattr(q.vendor, "rating",   4.2) or 4.2,
                "vendor_category": getattr(q.vendor, "category", "—") or "—",
                "unit_price":      q.unit_price,
                "total_price":     q.total_price,
                "delivery_days":   q.delivery_days,
                "notes":           q.notes or "",
                "status":          q.status,
                "submitted_at":    q.submitted_at.isoformat() if q.submitted_at else None,
            }
            for q in quotes
        ],
    }


@router.patch("/{quotation_id}/select")
def select_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    q = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not q:
        raise HTTPException(404, "Not found")
    if q.status == "selected":
        raise HTTPException(400, "Already selected")

    # Reject all others for this RFQ
    db.query(models.Quotation).filter(
        models.Quotation.rfq_id == q.rfq_id,
        models.Quotation.id    != quotation_id
    ).update({"status": "rejected"})

    q.status = "selected"
    db.commit()
    db.refresh(q)
    log_activity(db, user.id, "UPDATED", "Quotation", q.id,
                 f"Quotation #{q.id} selected as winner — ₹{q.total_price}")
    return {"id": q.id, "status": q.status, "rfq_id": q.rfq_id}


@router.get("/{quotation_id}", response_model=schemas.QuotationOut)
def get_quotation(quotation_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not q: raise HTTPException(404, "Not found")
    return q

@router.put("/{quotation_id}", response_model=schemas.QuotationOut)
def update_quotation(
    quotation_id: int,
    data: schemas.QuotationUpdate,
    db: Session = Depends(get_db),
    user        = Depends(get_current_user)
):
    q = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not q: raise HTTPException(404, "Not found")
    if q.status != "pending": raise HTTPException(400, "Only pending quotations can be edited")
    for k, val in data.model_dump(exclude_none=True).items():
        setattr(q, k, val)
    db.commit(); db.refresh(q)
    log_activity(db, user.id, "UPDATED", "Quotation", q.id, f"Quotation #{q.id} updated")
    return q