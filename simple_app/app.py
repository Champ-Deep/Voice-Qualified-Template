#!/usr/bin/env python3
"""
Lightweight Flask backend for lead management
"""

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import sqlite3
import uuid
import datetime
import requests
import json
import os

app = Flask(__name__)
CORS(app)

# Configuration
DATABASE = 'leads.db'
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY', '67cc697e61daf8be54313f64690b5f4975757e265fdd50ca0b10ec0e8e21d62b')

def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DATABASE)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS leads (
            lead_id TEXT PRIMARY KEY,
            phone TEXT NOT NULL,
            company TEXT NOT NULL,
            email TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def generate_lead_id():
    """Generate unique lead ID"""
    prefix = "00Q"
    unique_id = str(uuid.uuid4()).replace("-", "")[:12]
    return f"{prefix}ez{unique_id}EAC"

def send_to_elevenlabs(lead_data):
    """Send lead data to ElevenLabs API"""
    try:
        payload = {
            "agent_id": "agent_3501kf4e3ak0eqkrxg1rttttk881",
            "agent_phone_number_id": "phnum_4901kg4yjvgpetqbeknvhgm1stk4",
            "to_number": "+919098474926",
            "conversation_initiation_client_data": {
                "type": "conversation_initiation_client_data",
                "dynamic_variables": {
                    "lead_name": lead_data['company'],
                    "leadId": lead_data['lead_id'],
                    "company": lead_data['company'],
                    "email": lead_data['email']
                }
            }
        }
        
        headers = {
            "Authorization": f"Bearer {ELEVENLABS_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Replace with actual ElevenLabs endpoint
        # response = requests.post("https://api.elevenlabs.io/v1/conversations", 
        #                         json=payload, headers=headers, timeout=10)
        
        # For now, just log the payload
        print("ElevenLabs payload:", json.dumps(payload, indent=2))
        return True
        
    except Exception as e:
        print(f"ElevenLabs error: {e}")
        return False

@app.route('/')
def home():
    """Serve the frontend"""
    return render_template_string('''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lead Management System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 20px; }
        h1 { color: #333; margin-bottom: 20px; text-align: center; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
        input:focus { outline: none; border-color: #007bff; box-shadow: 0 0 5px rgba(0,123,255,0.3); }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; }
        button:hover { background: #0056b3; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .alert { padding: 15px; border-radius: 4px; margin-bottom: 15px; }
        .alert-success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .alert-error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .lead-list { margin-top: 20px; }
        .lead-item { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 15px; margin-bottom: 10px; }
        .lead-item h3 { color: #007bff; margin-bottom: 5px; }
        .lead-item p { margin: 3px 0; color: #666; }
        .loading { text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🚀 Lead Management System</h1>
            
            <div id="message"></div>
            
            <form id="leadForm">
                <div class="form-group">
                    <label for="phone">📱 Phone Number *</label>
                    <input type="tel" id="phone" name="phone" required placeholder="Enter phone number">
                </div>
                
                <div class="form-group">
                    <label for="company">🏢 Company Name *</label>
                    <input type="text" id="company" name="company" required placeholder="Enter company name">
                </div>
                
                <div class="form-group">
                    <label for="email">📧 Email Address *</label>
                    <input type="email" id="email" name="email" required placeholder="Enter email address">
                </div>
                
                <button type="submit" id="submitBtn">Create Lead</button>
            </form>
        </div>
        
        <div class="card">
            <h2>📋 Recent Leads</h2>
            <div id="leadsList" class="lead-list">
                <div class="loading">Loading leads...</div>
            </div>
        </div>
    </div>

    <script>
        const API_URL = '';
        
        function showMessage(text, type = 'success') {
            const messageDiv = document.getElementById('message');
            messageDiv.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
            setTimeout(() => { messageDiv.innerHTML = ''; }, 5000);
        }
        
        async function loadLeads() {
            try {
                const response = await fetch('/api/leads');
                const leads = await response.json();
                const leadsDiv = document.getElementById('leadsList');
                
                if (leads.length === 0) {
                    leadsDiv.innerHTML = '<p style="text-align:center;color:#666;">No leads yet. Create your first lead!</p>';
                    return;
                }
                
                leadsDiv.innerHTML = leads.map(lead => `
                    <div class="lead-item">
                        <h3>Lead ID: ${lead.lead_id}</h3>
                        <p><strong>Company:</strong> ${lead.company}</p>
                        <p><strong>Email:</strong> ${lead.email}</p>
                        <p><strong>Phone:</strong> ${lead.phone}</p>
                        <p><strong>Created:</strong> ${new Date(lead.created_at).toLocaleString()}</p>
                    </div>
                `).join('');
            } catch (error) {
                document.getElementById('leadsList').innerHTML = '<p style="color:red;">Error loading leads</p>';
            }
        }
        
        document.getElementById('leadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const formData = new FormData(e.target);
            
            const leadData = {
                phone: formData.get('phone'),
                company: formData.get('company'),
                email: formData.get('email')
            };
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Lead...';
            
            try {
                const response = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(leadData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showMessage(`✅ Lead created successfully! Lead ID: ${result.lead_id}`, 'success');
                    e.target.reset();
                    loadLeads();
                } else {
                    showMessage(`❌ Error: ${result.error}`, 'error');
                }
            } catch (error) {
                showMessage('❌ Network error. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Lead';
            }
        });
        
        // Load leads on page load
        loadLeads();
    </script>
</body>
</html>
    ''')

@app.route('/api/leads', methods=['GET'])
def get_leads():
    """Get all leads"""
    try:
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM leads ORDER BY created_at DESC LIMIT 50')
        leads = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(leads)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leads', methods=['POST'])
def create_lead():
    """Create a new lead"""
    try:
        data = request.json
        lead_id = generate_lead_id()
        
        # Validate required fields
        required_fields = ['phone', 'company', 'email']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Insert into database
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO leads (lead_id, phone, company, email)
            VALUES (?, ?, ?, ?)
        ''', (lead_id, data['phone'], data['company'], data['email']))
        conn.commit()
        conn.close()
        
        # Send to ElevenLabs
        lead_data = {
            'lead_id': lead_id,
            'phone': data['phone'],
            'company': data['company'],
            'email': data['email']
        }
        send_to_elevenlabs(lead_data)
        
        return jsonify({
            'lead_id': lead_id,
            'message': 'Lead created successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.datetime.now().isoformat()})

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    print("🚀 Starting Lead Management System...")
    print("📊 Database: SQLite (leads.db)")
    print(f"🌐 Frontend: http://0.0.0.0:{port}")
    print(f"📡 API: http://0.0.0.0:{port}/api")
    app.run(host='0.0.0.0', port=port, debug=False)