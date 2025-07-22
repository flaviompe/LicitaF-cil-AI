from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    company_name = Column(String, nullable=False)
    cnpj = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    monitors = relationship("ProcurementMonitor", back_populates="owner")
    documents = relationship("Document", back_populates="owner")

class ProcurementMonitor(Base):
    __tablename__ = "procurement_monitors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    keywords = Column(JSON)
    regions = Column(JSON)
    categories = Column(JSON)
    min_value = Column(Float)
    max_value = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="monitors")

class Procurement(Base):
    __tablename__ = "procurements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    organ = Column(String, nullable=False)
    modality = Column(String, nullable=False)
    category = Column(String)
    estimated_value = Column(Float)
    opening_date = Column(DateTime)
    closing_date = Column(DateTime)
    region = Column(String)
    status = Column(String, default="open")
    external_id = Column(String, unique=True)
    source_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    document_type = Column(String, nullable=False)
    content = Column(Text)
    file_path = Column(String)
    analysis_result = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="documents")

class LegalConsultation(Base):
    __tablename__ = "legal_consultations"
    
    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    context = Column(Text)
    response = Column(Text, nullable=False)
    legal_references = Column(JSON)
    confidence_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)
    channel = Column(String, nullable=False)
    recipient = Column(String, nullable=False)
    status = Column(String, default="pending")
    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))