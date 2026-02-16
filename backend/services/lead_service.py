from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from models import Lead, LeadCreate

class LeadService:
    """Service for handling lead operations"""
    
    def generate_lead_id(self) -> str:
        """Generate a unique lead ID"""
        # Create a custom lead ID format similar to Salesforce format
        prefix = "00Q"  # Standard lead prefix
        unique_id = str(uuid.uuid4()).replace("-", "")[:12]
        return f"{prefix}ez{unique_id}EAC"
    
    def create_lead(self, db: Session, lead_data: LeadCreate) -> Lead:
        """Create a new lead"""
        # Generate unique lead ID
        lead_id = self.generate_lead_id()
        
        # Create lead object
        db_lead = Lead(
            lead_id=lead_id,
            phone=lead_data.phone,
            company=lead_data.company,
            email=lead_data.email
        )
        
        # Save to database
        db.add(db_lead)
        db.commit()
        db.refresh(db_lead)
        
        return db_lead
    
    def get_lead(self, db: Session, lead_id: str) -> Optional[Lead]:
        """Get a lead by ID"""
        return db.query(Lead).filter(Lead.lead_id == lead_id).first()
    
    def get_leads(self, db: Session, skip: int = 0, limit: int = 100) -> List[Lead]:
        """Get all leads with pagination"""
        return db.query(Lead).order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    
    def update_lead(self, db: Session, lead_id: str, lead_data: LeadCreate) -> Optional[Lead]:
        """Update a lead"""
        db_lead = self.get_lead(db, lead_id)
        if db_lead:
            db_lead.phone = lead_data.phone
            db_lead.company = lead_data.company
            db_lead.email = lead_data.email
            db_lead.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(db_lead)
        return db_lead
    
    def delete_lead(self, db: Session, lead_id: str) -> bool:
        """Delete a lead"""
        db_lead = self.get_lead(db, lead_id)
        if db_lead:
            db.delete(db_lead)
            db.commit()
            return True
        return False