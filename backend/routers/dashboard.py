from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
import models

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return {
        "total_vendors":      db.query(models.Vendor).count(),
        "active_rfqs":        db.query(models.RFQ).filter(models.RFQ.status == "open").count(),
        "pending_approvals":  db.query(models.Approval).filter(models.Approval.status == "pending").count(),
        "total_pos":          db.query(models.PurchaseOrder).count(),
        "total_invoices":     db.query(models.Invoice).count(),
    }

@router.get("/recent-pos")
def recent_pos(db: Session = Depends(get_db), _=Depends(get_current_user)):
    pos = (
        db.query(models.PurchaseOrder)
        .order_by(models.PurchaseOrder.created_at.desc())
        .limit(5).all()
    )
    return [
        {
            "id": p.id,
            "po_number": p.po_number,
            "status": p.status,
            "created_at": p.created_at,
            "vendor": p.quotation.vendor.name if p.quotation and p.quotation.vendor else "—",
            "total": p.quotation.total_price if p.quotation else 0,
        }
        for p in pos
    ]

@router.get("/recent-rfqs")
def recent_rfqs(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rfqs = (
        db.query(models.RFQ)
        .order_by(models.RFQ.created_at.desc())
        .limit(5).all()
    )
    return [
        {
            "id": r.id,
            "rfq_number": r.rfq_number,
            "title": r.title,
            "status": r.status,
            "deadline": r.deadline,
            "quotes": len(r.quotations),
        }
        for r in rfqs
    ]