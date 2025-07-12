# AWS Epubify Deployment Guide

This guide covers deployment options for the AWS Epubify web application.

## Architecture Overview

The application consists of:
- **Frontend**: Next.js React application
- **Backend**: FastAPI Python application
- **Worker**: Celery background worker for EPUB processing
- **Database**: Redis for task queuing and status tracking

## Deployment Options

### 1. Vercel (Frontend) + Railway/Render (Backend)

#### Frontend Deployment on Vercel

1. **Connect GitHub Repository**
   - Log in to [Vercel](https://vercel.com)
   - Click "New Project" and import your GitHub repository
   - Configure the project settings:
     - Framework Preset: Next.js
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `.next`

2. **Environment Variables**
   Set the following environment variables in Vercel:
   ```
   BACKEND_URL=https://your-backend-url.com
   NODE_ENV=production
   ```

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your frontend

#### Backend Deployment on Railway

1. **Create Railway Account**
   - Sign up at [Railway](https://railway.app)
   - Connect your GitHub repository

2. **Deploy Services**
   - **Redis Service**: Add Redis from Railway's templates
   - **Backend API**: Deploy from your repository's `backend` folder
   - **Celery Worker**: Deploy another instance of the backend as a worker

3. **Environment Variables**
   Set these for both backend and worker:
   ```
   REDIS_HOST=redis-service-url
   CELERY_BROKER_URL=redis://redis-service-url:6379/0
   CELERY_RESULT_BACKEND=redis://redis-service-url:6379/0
   ```

4. **Configure Start Commands**
   - **Backend**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Worker**: `celery -A celery_worker worker --loglevel=info`

### 2. Docker Compose (Self-Hosted)

#### Prerequisites
- Docker and Docker Compose installed
- A server with at least 2GB RAM

#### Deployment Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/aws-epubify.git
   cd aws-epubify
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

3. **Build and Deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

4. **Setup Reverse Proxy** (Optional)
   Configure Nginx or Traefik to handle SSL and routing.

### 3. AWS ECS (Production)

#### Prerequisites
- AWS CLI configured
- ECS CLI installed
- ECR repositories created

#### Deployment Steps

1. **Build and Push Images**
   ```bash
   # Build frontend
   docker build -t aws-epubify-frontend .
   docker tag aws-epubify-frontend:latest your-account.dkr.ecr.region.amazonaws.com/aws-epubify-frontend:latest
   docker push your-account.dkr.ecr.region.amazonaws.com/aws-epubify-frontend:latest

   # Build backend
   docker build -t aws-epubify-backend ./backend
   docker tag aws-epubify-backend:latest your-account.dkr.ecr.region.amazonaws.com/aws-epubify-backend:latest
   docker push your-account.dkr.ecr.region.amazonaws.com/aws-epubify-backend:latest
   ```

2. **Create ECS Task Definitions**
   - Create task definitions for frontend, backend, and worker
   - Configure with appropriate CPU/memory resources

3. **Setup ECS Services**
   - Create ECS cluster
   - Deploy services with load balancer
   - Configure auto-scaling

4. **Setup ElastiCache Redis**
   - Create Redis cluster
   - Configure security groups

## GitHub Actions Setup

### Required Secrets

Add these secrets to your GitHub repository:

#### For Vercel Deployment
```
VERCEL_TOKEN=your-vercel-token
ORG_ID=your-vercel-org-id
PROJECT_ID=your-vercel-project-id
TEAM_ID=your-vercel-team-id (optional)
BACKEND_URL=https://your-backend-url.com
```

#### For Railway Deployment
```
RAILWAY_TOKEN=your-railway-token
RAILWAY_SERVICE_ID=your-service-id
```

### Workflow Configuration

The GitHub Actions workflow in `.github/workflows/deploy.yml` will:
1. Build the Next.js application
2. Deploy to Vercel automatically on push to main branch
3. Run tests and linting (if configured)

## Environment Variables Reference

### Frontend (.env)
```
BACKEND_URL=https://your-backend-api-url.com
NODE_ENV=production
```

### Backend (.env)
```
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
CELERY_BROKER_URL=redis://your-redis-host:6379/0
CELERY_RESULT_BACKEND=redis://your-redis-host:6379/0
```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CORS**: Configure CORS properly for your domain
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Validate all user inputs
5. **Environment Variables**: Keep sensitive data in environment variables

## Monitoring and Logging

### Recommended Tools
- **Frontend**: Vercel Analytics, Sentry
- **Backend**: DataDog, New Relic, or AWS CloudWatch
- **Redis**: Redis monitoring tools
- **Celery**: Flower for task monitoring

### Health Checks
- Frontend: Vercel provides built-in health checks
- Backend: `/health` endpoint available
- Redis: Use Redis CLI or monitoring tools

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure BACKEND_URL is correctly configured
   - Check CORS middleware settings in FastAPI

2. **Celery Worker Not Processing**
   - Verify Redis connection
   - Check worker logs for errors
   - Ensure worker is running

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs for specific errors

4. **EPUB Generation Fails**
   - Check if URLs are accessible
   - Verify internet connectivity from worker
   - Review worker logs for specific errors

### Getting Help
- Check the GitHub Issues for known problems
- Review application logs for error details
- Ensure all services are running and accessible

## Scaling Considerations

1. **Frontend**: Vercel handles scaling automatically
2. **Backend**: Use multiple instances behind a load balancer
3. **Workers**: Scale Celery workers based on queue size
4. **Redis**: Use Redis Cluster for high availability

## Backup and Recovery

1. **Code**: Stored in GitHub repository
2. **Generated EPUBs**: Configure persistent storage
3. **Redis Data**: Regular backups if persistence is enabled
4. **Configuration**: Store in version control or secure storage