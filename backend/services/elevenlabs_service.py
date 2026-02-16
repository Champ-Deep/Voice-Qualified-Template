import requests
import os
import asyncio
import json
from typing import Optional
from dotenv import load_dotenv

from models import Lead, ElevenLabsRequestData

load_dotenv()

class ElevenLabsService:
    """Service for ElevenLabs API integration"""
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        self.base_url = "https://api.elevenlabs.io/v1"  # Update with actual ElevenLabs endpoint
        self.default_phone = "+919098474926"
        
    async def send_lead_data(self, lead: Lead, phone_number: Optional[str] = None) -> bool:
        """Send lead data to ElevenLabs API"""
        try:
            # Use provided phone number or default
            target_phone = phone_number or self.default_phone
            
            # Create the request data using the exact structure you provided
            request_data = {
                "agent_id": "agent_3501kf4e3ak0eqkrxg1rttttk881",
                "agent_phone_number_id": "phnum_4901kg4yjvgpetqbeknvhgm1stk4",
                "to_number": target_phone,
                "conversation_initiation_client_data": {
                    "type": "conversation_initiation_client_data",
                    "dynamic_variables": {
                        "lead_name": lead.company,  # Using company name as lead name
                        "leadId": lead.lead_id,
                        "company": lead.company,
                        "email": lead.email
                    }
                }
            }
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json"
            }
            
            # Add API key to headers if available
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            # Log the request for debugging
            print(f"Sending request to ElevenLabs for lead {lead.lead_id}")
            print(f"Request data: {json.dumps(request_data, indent=2)}")
            
            # Make the HTTP request (replace with actual ElevenLabs endpoint)
            # For now, we'll simulate the request
            response = await self._make_request(request_data, headers)
            
            if response and response.get("success", True):
                print(f"Successfully sent lead {lead.lead_id} to ElevenLabs")
                return True
            else:
                print(f"Failed to send lead {lead.lead_id} to ElevenLabs: {response}")
                return False
                
        except Exception as e:
            print(f"Error sending lead {lead.lead_id} to ElevenLabs: {str(e)}")
            return False
    
    async def _make_request(self, data: dict, headers: dict) -> Optional[dict]:
        """Make HTTP request to ElevenLabs API"""
        try:
            # Replace this URL with the actual ElevenLabs conversation API endpoint
            # For now, we'll use a placeholder
            endpoint = f"{self.base_url}/conversations"  # Update with correct endpoint
            
            # Use asyncio to run the synchronous request in a thread
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(endpoint, json=data, headers=headers, timeout=30)
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"ElevenLabs API error: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text}
                
        except requests.exceptions.RequestException as e:
            print(f"Request error: {str(e)}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def test_connection(self) -> bool:
        """Test connection to ElevenLabs API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Test endpoint (update with actual ElevenLabs test endpoint)
            response = requests.get(f"{self.base_url}/user", headers=headers, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"ElevenLabs connection test failed: {str(e)}")
            return False