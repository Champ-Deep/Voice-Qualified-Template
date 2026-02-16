#!/usr/bin/env python3
"""
Test script for the Lead Management System
"""

import requests
import json
import time

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_backend_health():
    """Test backend health endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend health check passed")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")
        return False

def test_create_lead():
    """Test creating a new lead"""
    lead_data = {
        "phone": "+1234567890",
        "company": "Test Company",
        "email": "test@example.com"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/leads", 
            json=lead_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Lead created successfully: {data['lead_id']}")
            return data['lead_id']
        else:
            print(f"❌ Failed to create lead: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Failed to create lead: {e}")
        return None

def test_get_leads():
    """Test getting all leads"""
    try:
        response = requests.get(f"{BACKEND_URL}/leads", timeout=5)
        if response.status_code == 200:
            leads = response.json()
            print(f"✅ Retrieved {len(leads)} leads")
            return True
        else:
            print(f"❌ Failed to get leads: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Failed to get leads: {e}")
        return False

def test_get_specific_lead(lead_id):
    """Test getting a specific lead"""
    if not lead_id:
        return False
        
    try:
        response = requests.get(f"{BACKEND_URL}/leads/{lead_id}", timeout=5)
        if response.status_code == 200:
            lead = response.json()
            print(f"✅ Retrieved lead: {lead['lead_id']}")
            return True
        else:
            print(f"❌ Failed to get lead {lead_id}: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Failed to get lead {lead_id}: {e}")
        return False

def test_frontend_accessibility():
    """Test if frontend is accessible"""
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is accessible")
            return True
        else:
            print(f"❌ Frontend not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend not accessible: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Lead Management System")
    print("=" * 50)
    
    # Wait a bit for services to start
    print("⏳ Waiting for services to start...")
    time.sleep(5)
    
    tests_passed = 0
    total_tests = 0
    
    # Test backend health
    total_tests += 1
    if test_backend_health():
        tests_passed += 1
    
    # Test frontend accessibility
    total_tests += 1
    if test_frontend_accessibility():
        tests_passed += 1
    
    # Test creating a lead
    total_tests += 1
    lead_id = test_create_lead()
    if lead_id:
        tests_passed += 1
    
    # Test getting all leads
    total_tests += 1
    if test_get_leads():
        tests_passed += 1
    
    # Test getting specific lead
    total_tests += 1
    if test_get_specific_lead(lead_id):
        tests_passed += 1
    
    # Summary
    print("=" * 50)
    print(f"📊 Tests completed: {tests_passed}/{total_tests} passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! The system is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    exit(main())