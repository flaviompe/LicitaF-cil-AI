from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn

from database import get_db, engine, Base
from models import User, ProcurementMonitor, Document, Notification
from schemas import UserCreate, UserResponse, MonitorCreate, MonitorResponse
from ai_legal import LegalAI
from ocr_processor import OCRProcessor
from notification_service import NotificationService
from procurement_monitor import ProcurementMonitorService

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Plataforma de Licitações Públicas com IA Jurídica",
    description="Sistema inteligente para monitoramento e participação em licitações públicas",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
legal_ai = LegalAI()
ocr_processor = OCRProcessor()
notification_service = NotificationService()
monitor_service = ProcurementMonitorService()

@app.get("/")
async def root():
    return {"message": "Plataforma de Licitações Públicas - API Online"}

@app.post("/api/v1/monitors", response_model=MonitorResponse)
async def create_monitor(
    monitor: MonitorCreate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    return await monitor_service.create_monitor(monitor, db)

@app.get("/api/v1/monitors", response_model=List[MonitorResponse])
async def get_monitors(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    return await monitor_service.get_all_monitors(db)

@app.post("/api/v1/documents/analyze")
async def analyze_document(
    file_url: str,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    text = await ocr_processor.extract_text(file_url)
    analysis = await legal_ai.analyze_document(text)
    return {"analysis": analysis, "extracted_text": text}

@app.post("/api/v1/legal/consult")
async def legal_consultation(
    question: str,
    context: Optional[str] = None,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    response = await legal_ai.legal_consultation(question, context)
    return {"response": response}

@app.post("/api/v1/documents/generate")
async def generate_legal_document(
    document_type: str,
    context: str,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    document = await legal_ai.generate_legal_document(document_type, context)
    return {"document": document}

@app.get("/api/v1/opportunities")
async def get_opportunities(
    region: Optional[str] = None,
    category: Optional[str] = None,
    value_min: Optional[float] = None,
    value_max: Optional[float] = None,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    opportunities = await monitor_service.get_opportunities(
        region, category, value_min, value_max, db
    )
    return {"opportunities": opportunities}

@app.post("/api/v1/notifications/send")
async def send_notification(
    message: str,
    channel: str,
    recipient: str,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    background_tasks.add_task(
        notification_service.send_notification, message, channel, recipient
    )
    return {"status": "notification_scheduled"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)