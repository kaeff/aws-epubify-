#!/bin/bash

echo "🚀 Setting up AWS Epubify Development Environment"

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

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your configuration."
fi

# Create output directory for backend
mkdir -p backend/output

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build and start services
echo "🐳 Building and starting Docker services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Available services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:8000"
echo "  - Redis: localhost:6379"
echo ""
echo "📚 To view logs:"
echo "  docker-compose logs -f [service_name]"
echo ""
echo "🛑 To stop services:"
echo "  docker-compose down"
echo ""
echo "🔧 To rebuild services:"
echo "  docker-compose up --build"