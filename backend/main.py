from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models  
from routers import auth, dashboard, vendors, rfq, quotations, approvals,orders,logs
from routers import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="VendorBridge API", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(vendors.router)
app.include_router(rfq.router)
app.include_router(quotations.router)
app.include_router(approvals.router)
app.include_router(orders.router)
app.include_router(logs.router)
# Placeholder routers (to be added screen by screen)
# app.include_router(vendors.router)
# app.include_router(rfq.router)
# app.include_router(quotations.router)
# app.include_router(approvals.router)
# app.include_router(orders.router)
# app.include_router(logs.router)


@app.get("/")
def root():
    return {"message": "VendorBridge API running 🚀"}
