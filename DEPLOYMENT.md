# Deployment Guide

## 🐳 Docker Commands

### Using Make (Recommended)
```bash
make help          # Show all available commands
make build         # Build all Docker images
make up            # Start all services
make down          # Stop all services
make restart       # Restart all services
make logs          # View logs from all services
make logs-backend  # View backend logs only
make logs-frontend # View frontend logs only
make logs-db       # View database logs only
make clean         # Stop services and remove volumes
make shell-backend # Open shell in backend container
make shell-db      # Open PostgreSQL shell
make status        # Show service status
```

### Using Docker Compose Directly
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

## 🧪 Testing

Run the system test script:
```bash
# Make sure the system is running first
docker-compose up -d

# Run tests
python test_system.py
```

The test script will verify:
- ✅ Backend health endpoint
- ✅ Frontend accessibility
- ✅ Lead creation functionality
- ✅ Lead retrieval functionality
- ✅ Database connectivity

## 🚨 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Find process using port 3000, 8000, or 5432
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Kill the process or change ports in docker-compose.yml
```

**2. Database Connection Issues**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database service
docker-compose restart postgres
```

**3. ElevenLabs API Issues**
- Verify your API key in `.env` file
- Check the ElevenLabs service logs in backend container
- Ensure the API endpoint URL is correct

**4. Frontend Not Loading**
```bash
# Check if frontend container is running
docker-compose ps frontend

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```