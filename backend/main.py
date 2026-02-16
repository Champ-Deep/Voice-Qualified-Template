from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
from dotenv import load_dotenv

from database import get_db, init_db
from models import Lead, LeadCreate, LeadResponse
from services.lead_service import LeadService
from services.elevenlabs_service import ElevenLabsService

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Lead Management API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
lead_service = LeadService()
elevenlabs_service = ElevenLabsService()

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Lead Management API is running"}

@app.post("/leads", response_model=LeadResponse)
async def create_lead(lead_data: LeadCreate, db: Session = Depends(get_db)):
    """Create a new lead"""
    try:
        # Create lead in database
        lead = lead_service.create_lead(db, lead_data)
        
        # Send data to ElevenLabs (async, don't block response)
        try:
            await elevenlabs_service.send_lead_data(lead)
        except Exception as e:
            # Log error but don't fail the lead creation
            print(f"ElevenLabs integration error: {e}")
        
        return lead
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/leads", response_model=List[LeadResponse])
async def get_leads(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all leads"""
    leads = lead_service.get_leads(db, skip=skip, limit=limit)
    return leads

@app.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, db: Session = Depends(get_db)):
    """Get a specific lead by ID"""
    lead = lead_service.get_lead(db, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@app.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, db: Session = Depends(get_db)):
    """Delete a lead"""
    success = lead_service.delete_lead(db, lead_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)