# Eleven Labs Voice Agent Lead Management System

A React-based frontend application with Express.js backend for lead capture that generates unique lead IDs stored in Redis cache, initiates AI voice calls via Eleven Labs API, and receives post-call transcripts through webhook callbacks.

## Features

- 📞 Automated AI voice calls via Eleven Labs Conversational AI
- 🆔 Unique lead ID generation and Redis caching
- 📝 Real-time call status tracking
- 📄 Post-call transcript display
- 🐳 Fully Dockerized application (frontend + backend + Redis)
- 🔒 Secure webhook handling with signature verification

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (State Management)

### Backend
- Express.js + TypeScript
- Redis (ioredis)
- Webhook handling

### Infrastructure
- Docker & Docker Compose
- Nginx (Frontend reverse proxy)
- Redis (Data caching)

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Eleven Labs API Key
- Redis (included in Docker setup)

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   cd /home/hemang/Desktop/template_Calling_V1
   ```

2. **Set up environment variables**

   Copy the example env file and add your API key:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Eleven Labs API key:
   ```env
   VITE_ELEVEN_LABS_API_KEY=your_api_key_here
   ```

3. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - Frontend (React) on http://localhost:3000
   - Backend (Express) on http://localhost:3001
   - Redis on port 6379

4. **Access the application**

   Open your browser and go to: http://localhost:3000

## Local Development (Without Docker)

### Frontend Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

   Frontend will run on http://localhost:3000

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Redis (if not using Docker)**
   ```bash
   docker run --name redis -p 6379:6379 -d redis:alpine
   # OR install and start Redis locally
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Backend will run on http://localhost:3001

## Project Structure

```
template_Calling_V1/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── LeadForm/
│   │   ├── LeadDisplay/
│   │   ├── TranscriptViewer/
│   │   └── CallStatus/
│   ├── services/                 # API services
│   │   ├── redisService.ts
│   │   ├── elevenLabsService.ts
│   │   └── webhookService.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useLeadGeneration.ts
│   │   ├── useTranscript.ts
│   │   └── useCallStatus.ts
│   ├── utils/                    # Utility functions
│   │   ├── leadIdGenerator.ts
│   │   └── validation.ts
│   ├── types/                    # TypeScript types
│   │   └── index.ts
│   ├── App.tsx                   # Main App component
│   └── main.tsx                  # Entry point
├── backend/                      # Backend source
│   ├── src/
│   │   └── server.ts            # Express server
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml            # Docker orchestration
├── Dockerfile.frontend           # Frontend Docker build
├── Dockerfile.backend            # Backend Docker build
├── nginx.conf                    # Nginx configuration
├── package.json                  # Frontend dependencies
└── README.md
```

## Environment Variables

### Frontend (.env)
```env
VITE_ELEVEN_LABS_API_URL=https://api.elevenlabs.io/v1
VITE_ELEVEN_LABS_API_KEY=your_api_key_here
VITE_AGENT_ID=agent_3501kf4e3ak0eqkrxg1rttttk881
VITE_PHONE_NUMBER_ID=phnum_4901kg4yjvgpetqbeknvhgm1stk4
VITE_REDIS_URL=redis://redis:6379
VITE_WEBHOOK_URL=http://localhost:3001/api/webhook
```

### Backend (backend/.env)
```env
PORT=3001
REDIS_URL=redis://redis:6379
FRONTEND_URL=http://localhost:3000
WEBHOOK_SECRET=your_webhook_secret_here
NODE_ENV=development
```

## API Endpoints

### Backend Endpoints

- `GET /health` - Health check endpoint
- `POST /api/webhook` - Webhook endpoint for Eleven Labs callbacks

## Docker Commands

### Build and start all services
```bash
docker-compose up -d
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f redis
```

### Stop all services
```bash
docker-compose down
```

### Rebuild services
```bash
docker-compose up -d --build
```

### Remove all containers and volumes
```bash
docker-compose down -v
```

## How It Works

1. **Lead Submission**: User fills out the lead form with name, company, email, and phone number
2. **Lead ID Generation**: System generates a unique lead ID (e.g., `lead_a1b2c3d4`)
3. **Redis Storage**: Lead data is saved to Redis with 24-hour TTL
4. **API Call Initiation**: System calls Eleven Labs API to initiate voice call
5. **Status Tracking**: Call status is polled and updated in real-time
6. **Webhook Callback**: After call completion, Eleven Labs sends transcript via webhook
7. **Transcript Display**: Transcript is fetched from Redis and displayed to user

## Call Status Flow

```
idle → initiating → initiated → in_progress → completed
                                            → failed
```

## Development

### Frontend Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend Scripts
```bash
npm run dev      # Start development server with watch mode
npm run build    # Compile TypeScript
npm run start    # Start production server
```

## Production Deployment

1. **Update environment variables** with production values
2. **Build and deploy using Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Configure webhook URL** in Eleven Labs dashboard to point to:
   ```
   https://your-domain.com/api/webhook
   ```

## Troubleshooting

### Redis Connection Issues
- Ensure Redis is running: `docker-compose ps`
- Check Redis logs: `docker-compose logs redis`
- Verify Redis URL in environment variables

### Frontend Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build`

### Backend Issues
- Check backend logs: `docker-compose logs backend`
- Verify environment variables are set correctly
- Test webhook endpoint: `curl http://localhost:3001/health`

## Security Considerations

- API keys are stored in environment variables
- Webhook signature verification (optional)
- CORS configuration for frontend-backend communication
- Helmet.js for security headers
- Input validation on all forms

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.
