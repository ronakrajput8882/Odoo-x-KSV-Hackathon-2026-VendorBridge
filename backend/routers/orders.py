from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
from log_utils import log_activity
from datetime import datetime
import models, os, smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.units import mm

router = APIRouter(prefix="/api/orders", tags=["Orders"])

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "ronakrajput0905@gmail.com"
SMTP_PASS = "eeee"
PDF_DIR   = "pdfs"
os.makedirs(PDF_DIR, exist_ok=True)


def gen_po_number(db):
    count = db.query(models.PurchaseOrder).count() + 1
    return f"PO-{datetime.now().year}-{count:04d}"

def gen_inv_number(db):
    count = db.query(models.Invoice).count() + 1
    return f"INV-{datetime.now().year}-{count:04d}"


def build_pdf(invoice_id: int, db: Session) -> str:
    inv    = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    po     = inv.purchase_order
    q      = po.quotation
    rfq    = q.rfq
    vendor = q.vendor

    path = os.path.join(PDF_DIR, f"invoice_{inv.invoice_number}.pdf")
    doc  = SimpleDocTemplate(path, pagesize=A4,
                             leftMargin=20*mm, rightMargin=20*mm,
                             topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    bold  = ParagraphStyle("bold",  parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)
    title = ParagraphStyle("title", parent=styles["Normal"], fontName="Helvetica-Bold",
                            fontSize=20, textColor=colors.HexColor("#1e3a5f"))

    elems = []
    elems += [
        Paragraph("VendorBridge", title),
        Paragraph("Procurement & Vendor Management ERP", small),
        Spacer(1, 5*mm),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563eb")),
        Spacer(1, 4*mm),
    ]

    meta = [
        ["INVOICE", "", "PO NUMBER", ""],
        [inv.invoice_number, "", po.po_number, ""],
        ["DATE", "", "STATUS", ""],
        [inv.created_at.strftime("%d %b %Y") if inv.created_at else "—", "", inv.status.upper(), ""],
    ]
    t = Table(meta, colWidths=[50*mm, 40*mm, 50*mm, 40*mm])
    t.setStyle(TableStyle([
        ("FONTNAME",  (0,0), (-1,-1), "Helvetica"),
        ("FONTNAME",  (0,0), (0,0),   "Helvetica-Bold"),
        ("FONTNAME",  (2,0), (2,0),   "Helvetica-Bold"),
        ("FONTNAME",  (0,2), (0,2),   "Helvetica-Bold"),
        ("FONTNAME",  (2,2), (2,2),   "Helvetica-Bold"),
        ("FONTSIZE",  (0,0), (-1,-1), 9),
        ("TEXTCOLOR", (0,0), (-1,-1), colors.HexColor("#374151")),
    ]))
    elems += [t, Spacer(1, 6*mm)]

    info = [[
        Paragraph(f"<b>Vendor</b><br/>{vendor.name if vendor else '—'}<br/>"
                  f"{vendor.contact_email or ''}<br/>{vendor.gst_number or ''}", styles["Normal"]),
        Paragraph(f"<b>RFQ Reference</b><br/>{rfq.rfq_number if rfq else '—'}<br/>"
                  f"{rfq.title if rfq else '—'}", styles["Normal"]),
    ]]
    t2 = Table(info, colWidths=[90*mm, 90*mm])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ("BOX",        (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING",    (0,0), (-1,-1), 8),
    ]))
    elems += [t2, Spacer(1, 6*mm)]

    items = rfq.items or [] if rfq else []
    rows  = [["#", "Item", "Qty", "Unit"]]
    for i, item in enumerate(items, 1):
        rows.append([str(i), item.get("name",""), str(item.get("qty","")), item.get("unit","")])
    t3 = Table(rows, colWidths=[10*mm, 100*mm, 30*mm, 40*mm])
    t3.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR",     (0,0), (-1,0),  colors.white),
        ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#e2e8f0")),
        ("PADDING",       (0,0), (-1,-1), 6),
    ]))
    elems += [Paragraph("<b>Items</b>", bold), Spacer(1,2*mm), t3, Spacer(1,6*mm)]

    # ← use tax_rate + tax_amount from model
    subtotal = float(inv.subtotal or 0)
    tax_amt  = float(inv.tax_amount or 0)
    total    = float(inv.total or 0)
    tax_rate = float(inv.tax_rate or 18)

    totals = [
        ["Subtotal",        f"\u20b9{subtotal:,.2f}"],
        [f"GST ({tax_rate:.0f}%)", f"\u20b9{tax_amt:,.2f}"],
        ["TOTAL",           f"\u20b9{total:,.2f}"],
    ]
    t4 = Table(totals, colWidths=[130*mm, 50*mm])
    t4.setStyle(TableStyle([
        ("FONTNAME",   (0,0), (-1,-1), "Helvetica"),
        ("FONTNAME",   (0,2), (-1,2),  "Helvetica-Bold"),
        ("FONTSIZE",   (0,0), (-1,-1), 10),
        ("FONTSIZE",   (0,2), (-1,2),  12),
        ("ALIGN",      (1,0), (1,-1),  "RIGHT"),
        ("BACKGROUND", (0,2), (-1,2),  colors.HexColor("#2563eb")),
        ("TEXTCOLOR",  (0,2), (-1,2),  colors.white),
        ("LINEABOVE",  (0,2), (-1,2),  1, colors.HexColor("#2563eb")),
        ("PADDING",    (0,0), (-1,-1), 6),
    ]))
    elems += [t4, Spacer(1,6*mm)]

    elems.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    elems.append(Paragraph("Generated by VendorBridge ERP", small))
    doc.build(elems)
    return path


def send_invoice_email(to_email: str, inv_number: str, pdf_path: str):
    try:
        msg = MIMEMultipart()
        msg["From"]    = SMTP_USER
        msg["To"]      = to_email
        msg["Subject"] = f"Invoice {inv_number} — VendorBridge"
        msg.attach(MIMEText(f"Please find attached invoice {inv_number}.\n\nRegards,\nVendorBridge ERP", "plain"))
        with open(pdf_path, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{os.path.basename(pdf_path)}"')
            msg.attach(part)
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_USER, to_email, msg.as_string())
    except Exception as e:
        print(f"Email error: {e}")


@router.get("/")
def list_orders(db: Session = Depends(get_db), _=Depends(get_current_user)):
    pos = db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.created_at.desc()).all()
    return [
        {
            "id": p.id, "po_number": p.po_number, "status": p.status,
            "created_at":  p.created_at,
            "vendor":      p.quotation.vendor.name if p.quotation and p.quotation.vendor else "—",
            "rfq_number":  p.quotation.rfq.rfq_number if p.quotation and p.quotation.rfq else "—",
            "rfq_title":   p.quotation.rfq.title if p.quotation and p.quotation.rfq else "—",
            "total_price": p.quotation.total_price if p.quotation else 0,
            "invoice": {
                "id":             p.invoice.id,
                "invoice_number": p.invoice.invoice_number,
                "status":         p.invoice.status,
                "total":          p.invoice.total,
                "sent":           p.invoice.sent_to_email is not None,  # ← fixed
            } if p.invoice else None,
        }
        for p in pos
    ]


@router.post("/create-po/{quotation_id}")
def create_po(quotation_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not q: raise HTTPException(404, "Quotation not found")
    existing = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.quotation_id == quotation_id).first()
    if existing: raise HTTPException(400, "PO already exists")
    po = models.PurchaseOrder(quotation_id=quotation_id, po_number=gen_po_number(db), status="issued")
    db.add(po); db.commit(); db.refresh(po)
    log_activity(db, user.id, "CREATED", "PurchaseOrder", po.id, f"PO {po.po_number} created")
    return {"id": po.id, "po_number": po.po_number, "status": po.status}


@router.post("/create-invoice/{po_id}")
def create_invoice(
    po_id: int,
    payload: dict = {},
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po: raise HTTPException(404, "PO not found")
    if po.invoice: raise HTTPException(400, "Invoice already exists")
    tax_rate = float(payload.get("tax_percent", 18))
    sub      = float(po.quotation.total_price or 0)
    tax_amt  = round(sub * tax_rate / 100, 2)
    total    = round(sub + tax_amt, 2)
    inv = models.Invoice(
        po_id=po_id,
        invoice_number=gen_inv_number(db),
        tax_rate=tax_rate,       # ← correct field
        subtotal=sub,
        tax_amount=tax_amt,      # ← correct field
        total=total,
        status="generated",
        sent_to_email=None,      # ← correct field
    )
    db.add(inv); db.commit(); db.refresh(inv)
    log_activity(db, user.id, "CREATED", "Invoice", inv.id, f"Invoice {inv.invoice_number} generated")
    return {"id": inv.id, "invoice_number": inv.invoice_number, "total": inv.total, "status": inv.status}


@router.get("/invoice/{invoice_id}/pdf")
def download_pdf(invoice_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    path = build_pdf(invoice_id, db)
    return FileResponse(path, media_type="application/pdf",
                        filename=f"invoice_{inv.invoice_number}.pdf")


@router.post("/invoice/{invoice_id}/send-email")
def send_email(invoice_id: int, background_tasks: BackgroundTasks,
               db: Session = Depends(get_db), user=Depends(get_current_user)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv: raise HTTPException(404, "Invoice not found")
    vendor = inv.purchase_order.quotation.vendor
    if not vendor or not vendor.contact_email:
        raise HTTPException(400, "Vendor has no email")
    path = build_pdf(invoice_id, db)
    background_tasks.add_task(send_invoice_email, vendor.contact_email, inv.invoice_number, path)
    inv.sent_to_email = vendor.contact_email  # ← correct field
    db.commit()
    log_activity(db, user.id, "SENT", "Invoice", inv.id,
                 f"Invoice {inv.invoice_number} emailed to {vendor.contact_email}")
    return {"message": f"Invoice sent to {vendor.contact_email}"}