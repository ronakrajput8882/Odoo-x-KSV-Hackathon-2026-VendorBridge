from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
from log_utils import log_activity
import models, schemas

router = APIRouter(prefix="/api/vendors", tags=["Vendors"])


@router.get("/", response_model=list[schemas.VendorOut])
def list_vendors(
    search: str = Query(default=""),
    status: str = Query(default=""),
    category: str = Query(default=""),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    q = db.query(models.Vendor)
    if search:
        q = q.filter(
            models.Vendor.name.ilike(f"%{search}%") |
            models.Vendor.contact_email.ilike(f"%{search}%") |
            models.Vendor.gst_number.ilike(f"%{search}%")
        )
    if status:
        q = q.filter(models.Vendor.status == status)
    if category:
        q = q.filter(models.Vendor.category == category)
    return q.order_by(models.Vendor.created_at.desc()).all()


@router.post("/", response_model=schemas.VendorOut, status_code=201)
def create_vendor(
    vendor: schemas.VendorCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    db_vendor = models.Vendor(**vendor.model_dump())
    db.add(db_vendor)
    db.commit()
    db.refresh(db_vendor)
    log_activity(db, user.id, "CREATED", "Vendor", db_vendor.id, f"Vendor '{db_vendor.name}' created")
    return db_vendor


@router.get("/{vendor_id}", response_model=schemas.VendorOut)
def get_vendor(vendor_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    v = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return v


@router.put("/{vendor_id}", response_model=schemas.VendorOut)
def update_vendor(
    vendor_id: int,
    data: schemas.VendorUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    v = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for k, val in data.model_dump(exclude_none=True).items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    log_activity(db, user.id, "UPDATED", "Vendor", v.id, f"Vendor '{v.name}' updated")
    return v


@router.patch("/{vendor_id}/toggle-status", response_model=schemas.VendorOut)
def toggle_status(vendor_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    v = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    v.status = "inactive" if v.status == "active" else "active"
    db.commit()
    db.refresh(v)
    log_activity(db, user.id, "UPDATED", "Vendor", v.id, f"Vendor '{v.name}' set to {v.status}")
    return v


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(vendor_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    v = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(v)
    db.commit()
    log_activity(db, user.id, "DELETED", "Vendor", vendor_id, f"Vendor '{v.name}' deleted")


@router.get("/meta/categories")
def get_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(models.Vendor.category).distinct().all()
    return [r[0] for r in rows if r[0]]