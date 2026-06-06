from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ──────────────── AUTH ────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "officer"   # admin | officer | vendor | manager

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ──────────────── VENDOR ────────────────

class VendorCreate(BaseModel):
    name: str
    category: Optional[str] = None
    gst_number: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    gst_number: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None

class VendorOut(BaseModel):
    id: int
    name: str
    category: Optional[str]
    gst_number: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    address: Optional[str]
    status: str
    rating: float
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────── RFQ ────────────────

class RFQItem(BaseModel):
    name: str
    qty: int
    unit: str

class RFQCreate(BaseModel):
    title: str
    description: Optional[str] = None
    items: List[RFQItem]
    deadline: datetime
    vendor_ids: List[int] = []

class RFQOut(BaseModel):
    id: int
    rfq_number: str
    title: str
    description: Optional[str]
    items: Any
    deadline: datetime
    status: str
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────── QUOTATION ────────────────

class QuotationCreate(BaseModel):
    rfq_id: int
    vendor_id: Optional[int] = None
    unit_price: float
    total_price: float
    delivery_days: int
    notes: Optional[str] = None
    
class QuotationUpdate(BaseModel):
    unit_price:    Optional[float] = None
    total_price:   Optional[float] = None
    delivery_days: Optional[int]   = None
    notes:         Optional[str]   = None
    
class QuotationOut(BaseModel):
    id: int
    rfq_id: int
    vendor_id: int
    unit_price: float
    total_price: float
    delivery_days: int
    notes: Optional[str]
    status: str
    submitted_at: datetime
    vendor: VendorOut

    class Config:
        from_attributes = True


# ──────────────── APPROVAL ────────────────

class ApprovalCreate(BaseModel):
    quotation_id: int

class ApprovalAction(BaseModel):
    status: str     # approved | rejected
    remarks: Optional[str] = None

class ApprovalOut(BaseModel):
    id: int
    quotation_id: int
    approver_id: int
    status: str
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────── PURCHASE ORDER ────────────────

class POOut(BaseModel):
    id: int
    po_number: str
    quotation_id: int
    status: str
    created_at: datetime
    quotation: QuotationOut

    class Config:
        from_attributes = True


# ──────────────── INVOICE ────────────────

class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    po_id: int
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    status: str
    sent_to_email: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class SendInvoiceRequest(BaseModel):
    email: EmailStr


# ──────────────── ACTIVITY LOG ────────────────

class LogOut(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: int
    description: str
    timestamp: datetime
    user: UserOut

    class Config:
        from_attributes = True
