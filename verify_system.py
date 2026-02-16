#!/usr/bin/env python3
"""
System verification script - checks if all components are properly set up
"""

import json
import uuid
import os
import subprocess
import time

def check_docker():
    """Check if Docker is available"""
    try:
        result = subprocess.run(['docker', '--version'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ Docker is available")
            return True
        else:
            print("❌ Docker is not working properly")
            return False
    except Exception as e:
        print(f"❌ Docker check failed: {e}")
        return False

def check_docker_compose():
    """Check if Docker Compose is available"""
    try:
        result = subprocess.run(['docker', 'compose', 'version'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ Docker Compose is available")
            return True
        else:
            print("❌ Docker Compose is not working")
            return False
    except Exception as e:
        print(f"❌ Docker Compose check failed: {e}")
        return False

def check_database():
    """Check if PostgreSQL database is running"""
    try:
        result = subprocess.run([
            'docker', 'exec', 'lead_postgres', 
            'psql', '-U', 'leads_user', '-d', 'leads_db', '-c', 'SELECT 1;'
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0 and '1' in result.stdout:
            print("✅ PostgreSQL database is running and accessible")
            return True
        else:
            print("❌ PostgreSQL database connection failed")
            print(f"Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        return False

def check_files():
    """Check if all required files exist"""
    required_files = [
        'docker-compose.yml',
        '.env',
        'backend/main.py',
        'backend/requirements.txt',
        'backend/models.py',
        'backend/database.py',
        'backend/services/lead_service.py',
        'backend/services/elevenlabs_service.py',
        'frontend/package.json',
        'frontend/src/App.js',
        'database/init.sql'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if not missing_files:
        print("✅ All required files are present")
        return True
    else:
        print(f"❌ Missing files: {', '.join(missing_files)}")
        return False

def check_env_file():
    """Check if .env file has required variables"""
    try:
        with open('.env', 'r') as f:
            env_content = f.read()
        
        required_vars = ['ELEVENLABS_API_KEY', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']
        missing_vars = []
        
        for var in required_vars:
            if f'{var}=' not in env_content:
                missing_vars.append(var)
        
        if not missing_vars:
            print("✅ Environment file is properly configured")
            # Check if ElevenLabs API key is set
            if 'ELEVENLABS_API_KEY=67cc697e61daf8be54313f64690b5f4975757e265fdd50ca0b10ec0e8e21d62b' in env_content:
                print("✅ ElevenLabs API key is configured")
            return True
        else:
            print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
            return False
    except Exception as e:
        print(f"❌ Environment file check failed: {e}")
        return False

def generate_lead_id():
    """Generate a sample lead ID"""
    prefix = "00Q"
    unique_id = str(uuid.uuid4()).replace("-", "")[:12]
    return f"{prefix}ez{unique_id}EAC"

def show_elevenlabs_payload():
    """Show sample ElevenLabs payload"""
    lead_id = generate_lead_id()
    payload = {
        "agent_id": "agent_3501kf4e3ak0eqkrxg1rttttk881",
        "agent_phone_number_id": "phnum_4901kg4yjvgpetqbeknvhgm1stk4",
        "to_number": "+919098474926",
        "conversation_initiation_client_data": {
            "type": "conversation_initiation_client_data",
            "dynamic_variables": {
                "lead_name": "Sample Company",
                "leadId": lead_id,
                "company": "Sample Company",
                "email": "sample@example.com"
            }
        }
    }
    
    print("\n📞 Sample ElevenLabs API Payload:")
    print(json.dumps(payload, indent=2))
    return True

def main():
    """Run system verification"""
    print("🔍 Lead Management System Verification")
    print("=" * 50)
    
    checks = [
        ("Docker Installation", check_docker),
        ("Docker Compose", check_docker_compose),
        ("Required Files", check_files),
        ("Environment Configuration", check_env_file),
        ("Database Connection", check_database),
    ]
    
    passed = 0
    total = len(checks)
    
    for check_name, check_func in checks:
        print(f"\n🔄 Checking {check_name}...")
        if check_func():
            passed += 1
        time.sleep(0.5)  # Small delay for readability
    
    # Show ElevenLabs payload format
    print(f"\n🎯 ElevenLabs Integration Format...")
    show_elevenlabs_payload()
    
    # Summary
    print("\n" + "=" * 50)
    print(f"📊 Verification Results: {passed}/{total} checks passed")
    
    if passed == total:
        print("🎉 System is ready! You can now start the application with:")
        print("   docker compose up --build")
        print("\n🌐 Access URLs:")
        print("   Frontend: http://localhost:3000")
        print("   Backend:  http://localhost:8000")
        print("   API Docs: http://localhost:8000/docs")
        return 0
    else:
        print("⚠️  Some checks failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    exit(main())