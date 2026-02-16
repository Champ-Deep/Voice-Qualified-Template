#!/bin/bash

echo "🚀 Starting Eleven Labs Voice Agent Application"
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your API keys."
    echo ""
fi

# Build and start all services
echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Application is running!"
echo ""
echo "📍 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   Redis:     localhost:6379"
echo ""
echo "📝 To view logs:"
echo "   All services:    docker-compose logs -f"
echo "   Frontend only:   docker-compose logs -f frontend"
echo "   Backend only:    docker-compose logs -f backend"
echo "   Redis only:      docker-compose logs -f redis"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose down"
echo ""
