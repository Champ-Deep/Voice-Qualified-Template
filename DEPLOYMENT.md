# Deployment Guide

## Application Architecture

This application consists of three main components running in Docker containers:

1. **Frontend (React + Vite)** - Port 3000
2. **Backend (Express.js)** - Port 3001
3. **Redis** - Port 6379

## Quick Start

### Option 1: Using the Start Script (Recommended)

```bash
./start.sh
```

This will automatically:
- Build all Docker images
- Start all services
- Display service status and access information

### Option 2: Manual Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Environment Configuration

### Frontend Environment Variables (.env)

The application uses the following configuration:

```env
VITE_ELEVEN_LABS_API_URL=https://api.elevenlabs.io/v1
VITE_ELEVEN_LABS_API_KEY=67cc697e61daf8be54313f64690b5f4975757e265fdd50ca0b10ec0e8e21d62b
VITE_AGENT_ID=agent_3501kf4e3ak0eqkrxg1rttttk881
VITE_PHONE_NUMBER_ID=phnum_4901kg4yjvgpetqbeknvhgm1stk4
VITE_REDIS_URL=redis://redis:6379
VITE_WEBHOOK_URL=http://localhost:3001/api/webhook
```

### Backend Environment Variables (backend/.env)

```env
PORT=3001
REDIS_URL=redis://redis:6379
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Accessing the Application

Once running, you can access:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Backend Health Check**: http://localhost:3001/health
- **Redis**: localhost:6379

## Development Workflow

### Local Development (Without Docker)

#### Frontend
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

#### Backend
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Redis (Standalone)
```bash
# Using Docker
docker run --name redis -p 6379:6379 -d redis:alpine

# OR using local Redis installation
redis-server
```

### With Docker (Development Mode)

Use the development compose file for hot-reload:

```bash
docker-compose -f docker-compose.dev.yml up
```

## Docker Commands Reference

### View Running Containers
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f redis
```

### Rebuild Containers
```bash
docker-compose up -d --build
```

### Stop Services
```bash
docker-compose down
```

### Remove All Data (including volumes)
```bash
docker-compose down -v
```

### Access Container Shell
```bash
# Frontend
docker exec -it eleven-labs-frontend sh

# Backend
docker exec -it eleven-labs-backend sh

# Redis CLI
docker exec -it eleven-labs-redis redis-cli
```

## Production Deployment

### Prerequisites
- Docker & Docker Compose installed on server
- Domain name configured (optional)
- SSL certificate (for HTTPS)
- Eleven Labs API key

### Steps

1. **Clone repository to server**
   ```bash
   git clone <repository-url>
   cd template_Calling_V1
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Update docker-compose.yml**
   - Change `FRONTEND_URL` to production domain
   - Configure webhook URL to public endpoint
   - Set `NODE_ENV=production`

4. **Build and deploy**
   ```bash
   docker-compose up -d
   ```

5. **Configure reverse proxy (Nginx/Apache)**

   Example Nginx configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

6. **Configure Eleven Labs Webhook**
   - Go to Eleven Labs dashboard
   - Set webhook URL to: `https://your-domain.com/api/webhook`
   - Configure signature verification (optional)

## Monitoring

### Health Checks

```bash
# Frontend (should return nginx page)
curl http://localhost:3000/health

# Backend
curl http://localhost:3001/health

# Redis
docker exec eleven-labs-redis redis-cli ping
```

### View Redis Data

```bash
# Connect to Redis CLI
docker exec -it eleven-labs-redis redis-cli

# List all keys
KEYS *

# Get lead data
GET lead:lead_abc123

# Get call status
HGETALL lead:status:lead_abc123

# Get transcript
GET transcript:lead_abc123
```

## Troubleshooting

### Frontend Not Loading

1. Check if container is running:
   ```bash
   docker-compose ps frontend
   ```

2. Check logs:
   ```bash
   docker-compose logs frontend
   ```

3. Verify build:
   ```bash
   docker-compose up -d --build frontend
   ```

### Backend API Errors

1. Check backend logs:
   ```bash
   docker-compose logs backend
   ```

2. Verify Redis connection:
   ```bash
   docker exec eleven-labs-backend sh -c "nc -zv redis 6379"
   ```

3. Test health endpoint:
   ```bash
   curl http://localhost:3001/health
   ```

### Redis Connection Issues

1. Check if Redis is running:
   ```bash
   docker-compose ps redis
   ```

2. Test Redis connection:
   ```bash
   docker exec -it eleven-labs-redis redis-cli ping
   ```

3. Check Redis logs:
   ```bash
   docker-compose logs redis
   ```

### Port Conflicts

If ports are already in use, modify docker-compose.yml:

```yaml
frontend:
  ports:
    - "8080:80"  # Change from 3000

backend:
  ports:
    - "8001:3001"  # Change from 3001
```

## Backup and Restore

### Backup Redis Data

```bash
# Create backup
docker exec eleven-labs-redis redis-cli SAVE
docker cp eleven-labs-redis:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb
```

### Restore Redis Data

```bash
# Stop Redis
docker-compose stop redis

# Copy backup file
docker cp backup-20240101.rdb eleven-labs-redis:/data/dump.rdb

# Start Redis
docker-compose start redis
```

## Performance Optimization

### Frontend
- Enable gzip compression (already configured in nginx.conf)
- Use CDN for static assets
- Optimize images
- Enable browser caching

### Backend
- Use Redis connection pooling
- Implement rate limiting
- Enable compression middleware
- Use PM2 for process management in production

### Redis
- Configure maxmemory policy
- Enable AOF persistence for critical data
- Monitor memory usage

## Security Checklist

- [ ] API keys stored in environment variables (not committed to git)
- [ ] CORS configured with specific origins
- [ ] Helmet.js enabled for security headers
- [ ] Webhook signature verification enabled
- [ ] Redis password protection (if needed)
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured
- [ ] Input validation on all forms
- [ ] Docker containers running as non-root users

## Scaling

### Horizontal Scaling

Use Docker Swarm or Kubernetes for multi-instance deployment:

```bash
# Docker Swarm example
docker swarm init
docker stack deploy -c docker-compose.yml eleven-labs-stack
```

### Load Balancing

Configure Nginx or HAProxy to distribute traffic across multiple backend instances.

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Check service health endpoints
4. Review Redis data structure
5. Test API endpoints manually

## Maintenance

### Regular Tasks

- Monitor disk space (Redis data)
- Review and rotate logs
- Update Docker images
- Backup Redis data
- Monitor API rate limits
- Review security updates

### Updates

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```
