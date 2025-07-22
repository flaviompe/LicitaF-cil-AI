from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    company_name: str
    cnpj: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class MonitorBase(BaseModel):
    name: str
    keywords: List[str]
    regions: List[str]
    categories: List[str]
    min_value: Optional[float] = None
    max_value: Optional[float] = None

class MonitorCreate(MonitorBase):
    pass

class MonitorResponse(MonitorBase):
    id: int
    is_active: bool
    created_at: datetime
    owner_id: int
    
    class Config:
        from_attributes = True

class ProcurementBase(BaseModel):
    title: str
    description: Optional[str] = None
    organ: str
    modality: str
    category: Optional[str] = None
    estimated_value: Optional[float] = None
    opening_date: Optional[datetime] = None
    closing_date: Optional[datetime] = None
    region: Optional[str] = None

class ProcurementResponse(ProcurementBase):
    id: int
    status: str
    external_id: Optional[str] = None
    source_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class DocumentAnalysis(BaseModel):
    document_type: str
    key_requirements: List[str]
    legal_risks: List[str]
    compliance_score: float
    missing_documents: List[str]
    recommendations: List[str]

class LegalConsultationRequest(BaseModel):
    question: str
    context: Optional[str] = None

class LegalConsultationResponse(BaseModel):
    response: str
    legal_references: List[Dict[str, str]]
    confidence_score: float
    created_at: datetime

class NotificationRequest(BaseModel):
    message: str
    channel: str
    recipient: str