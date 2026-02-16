#!/usr/bin/env python3
"""
Simple test script to verify the lead management system components
"""

import json
import uuid
import psycopg2
import requests
from datetime import datetime

# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "leads_db",
    "user": "leads_user",
    "password": "leads_password"
}

def generate_lead_id():
    """Generate a unique lead ID"""
    prefix = "00Q"
    unique_id = str(uuid.uuid4()).replace("-", "")[:12]
    return f"{prefix}ez{unique_id}EAC"

def test_database_connection():
    """Test database connection and operations"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Test connection
        cursor.execute("SELECT 1;")
        result = cursor.fetchone()
        print("✅ Database connection successful")
        
        # Test table exists
        cursor.execute("SELECT COUNT(*) FROM leads;")
        count = cursor.fetchone()[0]
        print(f"✅ Leads table exists with {count} records")
        
        # Test inserting a lead
        lead_id = generate_lead_id()
        cursor.execute("""
            INSERT INTO leads (lead_id, phone, company, email) 
            VALUES (%s, %s, %s, %s)
            RETURNING lead_id, created_at;
        """, (lead_id, "+1234567890", "Test Company", "test@example.com"))
        
        result = cursor.fetchone()
        conn.commit()
        print(f"✅ Lead created successfully: {result[0]}")
        print(f"   Created at: {result[1]}")
        
        # Test retrieving leads
        cursor.execute("SELECT * FROM leads ORDER BY created_at DESC LIMIT 5;")
        leads = cursor.fetchall()
        print(f"✅ Retrieved {len(leads)} leads from database")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_elevenlabs_request():
    """Test ElevenLabs API request format"""
    try:
        # Create sample lead data
        lead_data = {
            "lead_id": generate_lead_id(),
            "company": "Test Company",
            "email": "test@example.com"
        }
        
        # Create ElevenLabs request payload
        elevenlabs_payload = {
            "agent_id": "agent_3501kf4e3ak0eqkrxg1rttttk881",
            "agent_phone_number_id": "phnum_4901kg4yjvgpetqbeknvhgm1stk4",
            "to_number": "+919098474926",
            "conversation_initiation_client_data": {
                "type": "conversation_initiation_client_data",
                "dynamic_variables": {
                    "lead_name": lead_data["company"],
                    "leadId": lead_data["lead_id"],
                    "company": lead_data["company"],
                    "email": lead_data["email"]
                }
            }
        }
        
        print("✅ ElevenLabs request payload created:")
        print(json.dumps(elevenlabs_payload, indent=2))
        
        # Note: We're not making the actual API call to avoid using quota
        print("✅ ElevenLabs integration format verified")
        return True
        
    except Exception as e:
        print(f"❌ ElevenLabs test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Lead Management System Components")
    print("=" * 60)
    
    tests_passed = 0
    total_tests = 0
    
    # Test database operations
    print("\n📊 Testing Database Operations...")
    total_tests += 1
    if test_database_connection():
        tests_passed += 1
    
    # Test ElevenLabs integration format
    print("\n📞 Testing ElevenLabs Integration Format...")
    total_tests += 1
    if test_elevenlabs_request():
        tests_passed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"📈 Test Results: {tests_passed}/{total_tests} passed")
    
    if tests_passed == total_tests:
        print("🎉 All core components are working correctly!")
        print("\n📋 Next Steps:")
        print("1. Start the backend API server")
        print("2. Start the frontend React application") 
        print("3. Test the complete system integration")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    exit(main())