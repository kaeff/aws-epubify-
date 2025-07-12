# Troubleshooting Guide

This guide covers common issues and their solutions for the AWS Epubify project.

## 🔧 GitHub Actions / CI/CD Issues

### Issue: "package-lock.json not found" in GitHub Actions

**Error Message:**
```
Error: Dependencies lock file is not found in /home/runner/work/aws-epubify/aws-epubify. Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock
```

**Solution:**
This occurs when the `package-lock.json` file is missing from the repository. Fix it by:

1. **Generate the lock file locally:**
   ```bash
   npm install
   git add package-lock.json
   git commit -m "Add package-lock.json"
   git push
   ```

2. **Alternative: Use the fallback workflow:**
   - The project includes `.github/workflows/deploy-fallback.yml` that handles missing lock files
   - Trigger it manually from GitHub Actions tab

3. **Update your workflow to be more robust:**
   ```yaml
   - name: Install dependencies
     run: |
       if [ -f package-lock.json ]; then
         npm ci
       else
         npm install
       fi
   ```

### Issue: Vercel deployment fails

**Common Solutions:**
1. **Check environment variables:**
   ```bash
   # Required secrets in GitHub:
   VERCEL_TOKEN
   ORG_ID  
   PROJECT_ID
   BACKEND_URL
   ```

2. **Verify Vercel project setup:**
   - Ensure project is linked to correct GitHub repository
   - Check build settings in Vercel dashboard

## 🐳 Docker Issues

### Issue: Docker build fails

**Solution:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild with no cache
docker-compose build --no-cache

# Check logs
docker-compose logs [service-name]
```

### Issue: Redis connection failed

**Solutions:**
1. **Check if Redis is running:**
   ```bash
   docker-compose ps redis
   ```

2. **Check Redis logs:**
   ```bash
   docker-compose logs redis
   ```

3. **Verify environment variables:**
   ```bash
   REDIS_HOST=redis
   CELERY_BROKER_URL=redis://redis:6379/0
   ```

## 🔌 Backend API Issues

### Issue: CORS errors in frontend

**Solutions:**
1. **Check backend URL configuration:**
   ```javascript
   // next.config.js
   async rewrites() {
     return [
       {
         source: '/api/:path*',
         destination: 'http://localhost:8000/:path*',
       },
     ];
   }
   ```

2. **Verify CORS settings in FastAPI:**
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Configure for production
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

### Issue: Celery worker not processing tasks

**Solutions:**
1. **Check worker logs:**
   ```bash
   docker-compose logs celery
   ```

2. **Verify Redis connection:**
   ```bash
   docker-compose exec redis redis-cli ping
   ```

3. **Restart worker:**
   ```bash
   docker-compose restart celery
   ```

## 📦 Frontend Issues

### Issue: Build fails with TypeScript errors

**Solutions:**
1. **Install missing dependencies:**
   ```bash
   npm install --save-dev @types/react @types/react-dom
   ```

2. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

3. **Check TypeScript configuration:**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "skipLibCheck": true,
       // ... other options
     }
   }
   ```

### Issue: Tailwind styles not working

**Solutions:**
1. **Verify Tailwind setup:**
   ```javascript
   // tailwind.config.js
   module.exports = {
     content: [
       './app/**/*.{js,ts,jsx,tsx}',
       // ... other paths
     ],
   }
   ```

2. **Check CSS imports:**
   ```css
   /* app/globals.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

## 🌐 Deployment Issues

### Issue: Environment variables not working

**Solutions:**
1. **Vercel environment variables:**
   - Add variables in Vercel dashboard
   - Ensure they're available for the correct environment (production/preview)

2. **Check variable names:**
   ```bash
   # Frontend
   BACKEND_URL=https://api.yourdomain.com

   # Backend
   REDIS_HOST=your-redis-host
   CELERY_BROKER_URL=redis://your-redis-host:6379/0
   ```

### Issue: 404 errors on routes

**Solutions:**
1. **Check Next.js routing:**
   ```
   app/
   ├── page.tsx          # /
   ├── about/
   │   └── page.tsx      # /about
   ```

2. **Verify Vercel configuration:**
   ```json
   // vercel.json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://your-backend.com/:path*"
       }
     ]
   }
   ```

## 🔍 General Debugging

### Getting Help

1. **Check application logs:**
   ```bash
   # Local development
   docker-compose logs -f [service-name]
   
   # Vercel
   # Check function logs in Vercel dashboard
   
   # Railway
   # Check service logs in Railway dashboard
   ```

2. **Test API endpoints:**
   ```bash
   # Health check
   curl http://localhost:8000/health
   
   # API documentation
   # Visit http://localhost:8000/docs
   ```

3. **Common log locations:**
   - Frontend: Browser console and Vercel logs
   - Backend: Docker logs or hosting platform logs
   - Celery: Worker service logs
   - Redis: Redis service logs

### Performance Issues

1. **Monitor resource usage:**
   ```bash
   # Docker stats
   docker stats
   
   # Check memory usage
   docker-compose exec backend ps aux
   ```

2. **Optimize builds:**
   ```bash
   # Next.js bundle analysis
   npm run build
   npx @next/bundle-analyzer
   ```

## 📞 Still Need Help?

If you're still experiencing issues:

1. **Search existing issues:** Check [GitHub Issues](https://github.com/your-username/aws-epubify/issues)
2. **Create detailed bug report:** Include error messages, logs, and steps to reproduce
3. **Check documentation:** Review [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md)
4. **Community support:** Consider posting in relevant community forums

## 🚀 Quick Fixes

```bash
# Nuclear option - reset everything
docker-compose down -v
docker system prune -a
rm -rf node_modules package-lock.json .next
npm install
docker-compose up --build

# Restart specific service
docker-compose restart [service-name]

# View real-time logs
docker-compose logs -f

# Clean npm cache
npm cache clean --force
```