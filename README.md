# Lead Management System

A comprehensive full-stack lead management system with React frontend, Python FastAPI backend, PostgreSQL database, and ElevenLabs API integration for automated voice calls.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React         │    │   FastAPI       │    │   PostgreSQL    │    │   ElevenLabs    │
│   Frontend      │◄──►│   Backend       │◄──►│   Database      │    │   Voice API     │
│   (Port 3000)   │    │   (Port 8000)   │    │   (Port 5432)   │    │   (External)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
lead-management-system/
├── frontend/                 # React application
│   ├── src/
│   │   ├── App.js           # Main application component
│   │   ├── index.js         # Application entry point
│   │   └── *.css            # Styling files
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   └── Dockerfile           # Frontend container config
├── backend/                 # Python FastAPI backend
│   ├── main.py             # FastAPI application entry
│   ├── models.py           # Database and API models
│   ├── database.py         # Database connection setup
│   ├── services/           # Business logic services
│   │   ├── lead_service.py    # Lead management logic
│   │   └── elevenlabs_service.py # ElevenLabs integration
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile         # Backend container config
├── database/              # Database setup
│   └── init.sql          # Database initialization script
├── docker-compose.yml    # Multi-service orchestration
├── .env                  # Environment variables
├── Makefile             # Common commands
└── test_system.py       # System integration tests
```

## 🚀 Features

- **Lead Data Collection**: Form-based input for phone, company name, and email
- **Dynamic Lead ID Generation**: Automatic unique ID creation (Salesforce-style format)
- **PostgreSQL Persistence**: Robust data storage with indexing and triggers
- **ElevenLabs Integration**: Automatic voice call initiation with lead data
- **RESTful API**: Complete CRUD operations for lead management
- **Docker Containerization**: Fully containerized for easy deployment
- **Real-time Updates**: Live lead list updates after form submission
- **Responsive UI**: Modern, mobile-friendly React interface

## 🛠️ Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git for cloning the repository

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd lead-management-system

# Copy environment template and configure
cp .env.example .env
# Edit .env file with your ElevenLabs API key
```

### 2. Start the System
```bash
# Build and start all services
docker-compose up --build

# Or use the Makefile
make setup
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Database**: localhost:5432 (PostgreSQL)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# ElevenLabs API Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Database Configuration
POSTGRES_USER=leads_user
POSTGRES_PASSWORD=leads_password
POSTGRES_DB=leads_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Application URLs
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### ElevenLabs Integration

The system sends the following JSON structure to ElevenLabs API when a lead is created:

```json
{
  "agent_id": "agent_3501kf4e3ak0eqkrxg1rttttk881",
  "agent_phone_number_id": "phnum_4901kg4yjvgpetqbeknvhgm1stk4",
  "to_number": "+919098474926",
  "conversation_initiation_client_data": {
    "type": "conversation_initiation_client_data",
    "dynamic_variables": {
      "lead_name": "Company Name",
      "leadId": "00Qez000001KsjdEAC",
      "company": "Company Name",
      "email": "email@example.com"
    }
  }
}
```

## 📝 API Endpoints

### Leads Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/leads` | Create a new lead |
| GET | `/leads` | Get all leads (with pagination) |
| GET | `/leads/{lead_id}` | Get specific lead by ID |
| DELETE | `/leads/{lead_id}` | Delete a lead |
| GET | `/health` | Health check endpoint |

### Example API Usage

```bash
# Create a new lead
curl -X POST http://localhost:8000/leads \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "company": "Test Company",
    "email": "test@example.com"
  }'

# Get all leads
curl http://localhost:8000/leads

# Get specific lead
curl http://localhost:8000/leads/00Qez000001KsjdEAC
```