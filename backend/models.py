from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Text, Boolean, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String, nullable=False)
    email        = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role         = Column(String, default="officer")   # admin | officer | vendor | manager
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, server_default=func.now())

    logs         = relationship("ActivityLog", back_populates="user")


class Vendor(Base):
    __tablename__ = "vendors"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    category      = Column(String)
    gst_number    = Column(String)
    contact_name  = Column(String)
    contact_email = Column(String)
    contact_phone = Column(String)
    address       = Column(Text)
    status        = Column(String, default="active")   # active | inactive
    rating        = Column(Float, default=4.2)
    created_at    = Column(DateTime, server_default=func.now())

    quotations    = relationship("Quotation", back_populates="vendor")


class RFQ(Base):
    __tablename__ = "rfqs"

    id          = Column(Integer, primary_key=True, index=True)
    rfq_number  = Column(String, unique=True, index=True)
    title       = Column(String, nullable=False)
    description = Column(Text)
    items       = Column(JSON)          # [{"name": str, "qty": int, "unit": str}]
    deadline    = Column(DateTime)
    status      = Column(String, default="open")   # open | closed | awarded
    created_by  = Column(Integer, ForeignKey("users.id"))
    created_at  = Column(DateTime, server_default=func.now())

    creator              = relationship("User")
    quotations           = relationship("Quotation", back_populates="rfq")
    vendor_assignments   = relationship("RFQVendor", back_populates="rfq")


class RFQVendor(Base):
    """Many-to-many: RFQ ↔ Vendor assignments"""
    __tablename__ = "rfq_vendors"

    id        = Column(Integer, primary_key=True, index=True)
    rfq_id    = Column(Integer, ForeignKey("rfqs.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))

    rfq    = relationship("RFQ", back_populates="vendor_assignments")
    vendor = relationship("Vendor")


class Quotation(Base):
    __tablename__ = "quotations"

    id           = Column(Integer, primary_key=True, index=True)
    rfq_id       = Column(Integer, ForeignKey("rfqs.id"))
    vendor_id    = Column(Integer, ForeignKey("vendors.id"))
    unit_price   = Column(Float)
    total_price  = Column(Float)
    delivery_days = Column(Integer)
    notes        = Column(Text)
    status       = Column(String, default="submitted")  # submitted | selected | rejected
    submitted_at = Column(DateTime, server_default=func.now())

    rfq    = relationship("RFQ", back_populates="quotations")
    vendor = relationship("Vendor", back_populates="quotations")
    approval = relationship("Approval", back_populates="quotation", uselist=False)


class Approval(Base):
    __tablename__ = "approvals"

    id            = Column(Integer, primary_key=True, index=True)
    quotation_id  = Column(Integer, ForeignKey("quotations.id"))
    approver_id   = Column(Integer, ForeignKey("users.id"))
    status        = Column(String, default="pending")   # pending | approved | rejected
    remarks       = Column(Text)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, onupdate=func.now())

    quotation = relationship("Quotation", back_populates="approval")
    approver  = relationship("User")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id           = Column(Integer, primary_key=True, index=True)
    po_number    = Column(String, unique=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"))
    status       = Column(String, default="issued")     # issued | delivered | cancelled
    created_at   = Column(DateTime, server_default=func.now())

    quotation = relationship("Quotation")
    invoice   = relationship("Invoice", back_populates="purchase_order", uselist=False)


class Invoice(Base):
    __tablename__ = "invoices"

    id             = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True)
    po_id          = Column(Integer, ForeignKey("purchase_orders.id"))
    subtotal       = Column(Float)
    tax_rate       = Column(Float, default=18.0)        # GST 18%
    tax_amount     = Column(Float)
    total          = Column(Float)
    status         = Column(String, default="generated")  # generated | sent | paid
    sent_to_email  = Column(String, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="invoice")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"))
    action      = Column(String)        # CREATED | UPDATED | APPROVED | REJECTED | SENT
    entity_type = Column(String)        # RFQ | Quotation | PO | Invoice | Vendor
    entity_id   = Column(Integer)
    description = Column(Text)
    timestamp   = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="logs")
