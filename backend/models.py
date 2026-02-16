from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

Base = declarative_base()

class Lead(Base):
    __tablename__ = "leads"
    
    lead_id = Column(String, primary_key=True)
    phone = Column(String(20), nullable=False)
    company = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Pydantic models for API
class LeadCreate(BaseModel):
    phone: str
    company: str
    email: EmailStr

class LeadResponse(BaseModel):
    lead_id: str
    phone: str
    company: str
    email: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ElevenLabsRequestData(BaseModel):
    """Model for ElevenLabs API request structure"""
    agent_id: str = "agent_3501kf4e3ak0eqkrxg1rttttk881"
    agent_phone_number_id: str = "phnum_4901kg4yjvgpetqbeknvhgm1stk4"
    to_number: str
    conversation_initiation_client_data: dict
    
    @classmethod
    def from_lead(cls, lead: Lead, to_number: str = "+919098474926"):
        """Create ElevenLabs request data from Lead object"""
        return cls(
            to_number=to_number,
            conversation_initiation_client_data={
                "type": "conversation_initiation_client_data",
                "dynamic_variables": {
                    "lead_name": lead.company,  # Using company as lead name
                    "leadId": lead.lead_id,
                    "company": lead.company,
                    "email": lead.email
                }
            }
        )