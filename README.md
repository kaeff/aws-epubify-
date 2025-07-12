# AWS Epubify

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Faws-epubify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern web application that converts AWS documentation to EPUB format for offline reading. Simply provide a link to the documentation index page, and the application will generate a comprehensive EPUB file containing all subpages as chapters with embedded images.

![AWS Epubify Screenshot](https://via.placeholder.com/800x600/232F3E/FFFFFF?text=AWS+Epubify+Screenshot)

## 🚀 Features

- **Easy Conversion**: Just paste the AWS documentation URL and get your EPUB
- **Complete Coverage**: Automatically extracts all subpages as chapters
- **Embedded Images**: All images are embedded in the EPUB file
- **Real-time Progress**: Live progress tracking during conversion
- **Modern UI**: Clean, responsive design with AWS-inspired styling
- **Background Processing**: Celery-powered background workers for efficient processing
- **RESTful API**: FastAPI backend with comprehensive API documentation

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Vercel** - Deployment platform

### Backend
- **FastAPI** - High-performance Python web framework
- **Celery** - Distributed task queue
- **Redis** - In-memory data store for queuing
- **BeautifulSoup** - HTML parsing
- **Requests** - HTTP library
- **EbookLib** - EPUB generation

### Infrastructure
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Railway/Render** - Backend deployment options

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker** and Docker Compose (for local development)
- **Redis** (for background task processing)

## 🏃 Quick Start

### Option 1: Using Setup Script (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/aws-epubify.git
cd aws-epubify

# Run the setup script
./setup.sh
```

The setup script will:
- Install all dependencies
- Set up environment variables
- Start all services with Docker Compose
- Open the application at http://localhost:3000

### Option 2: Manual Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/your-username/aws-epubify.git
   cd aws-epubify
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🌐 Deployment

### Vercel (Frontend)

1. **Connect GitHub Repository**
   - Import your repository on [Vercel](https://vercel.com)
   - Set environment variables:
     ```
     BACKEND_URL=https://your-backend-url.com
     NODE_ENV=production
     ```

2. **Deploy**
   - Push to main branch triggers automatic deployment
   - Or deploy manually through Vercel dashboard

### Railway (Backend)

1. **Deploy Services**
   - **Redis**: Add from Railway templates
   - **Backend API**: Deploy from `/backend` folder
   - **Worker**: Deploy another instance as Celery worker

2. **Configure Environment Variables**
   ```
   REDIS_HOST=redis-service-url
   CELERY_BROKER_URL=redis://redis-service-url:6379/0
   CELERY_RESULT_BACKEND=redis://redis-service-url:6379/0
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🔧 API Documentation

The backend provides a comprehensive REST API:

- `POST /convert` - Start EPUB conversion
- `GET /status/{task_id}` - Check conversion status
- `GET /download/{task_id}` - Download completed EPUB
- `DELETE /task/{task_id}` - Delete conversion task
- `GET /health` - Health check endpoint

Visit `/docs` on your backend URL for interactive API documentation.

## 📚 Usage

1. **Enter Documentation URL**
   - Navigate to the AWS documentation section you want to convert
   - Copy the URL of the main index or table of contents page
   - Examples:
     - `https://docs.aws.amazon.com/s3/latest/userguide/`
     - `https://docs.aws.amazon.com/ec2/latest/userguide/`
     - `https://docs.aws.amazon.com/lambda/latest/dg/`

2. **Start Conversion**
   - Paste the URL in the application
   - Optionally provide a custom title
   - Click "Convert to EPUB"

3. **Monitor Progress**
   - Watch real-time progress updates
   - See detailed status messages
   - Progress bar shows completion percentage

4. **Download EPUB**
   - Download button appears when conversion is complete
   - EPUB file includes all chapters and embedded images

## 🧪 Development

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd backend
pytest
```

### Project Structure

```
aws-epubify/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page component
├── backend/               # FastAPI backend
│   ├── main.py           # Main application
│   ├── celery_worker.py  # Celery worker
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Backend Docker image
├── .github/workflows/    # GitHub Actions
├── docker-compose.yml    # Local development
├── vercel.json          # Vercel configuration
└── DEPLOYMENT.md        # Deployment guide
```

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `BACKEND_URL` is correctly set
   - Check CORS middleware configuration

2. **Conversion Failures**
   - Verify the URL is accessible
   - Check worker logs for specific errors
   - Ensure Redis is running

3. **Build Failures**
   - Check Node.js version compatibility
   - Clear `node_modules` and reinstall dependencies

For more troubleshooting tips, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [PyWebDoc2Epub](https://github.com/brignoni/py-webdoc-2-ebook) - Core conversion library
- [AWS Documentation](https://docs.aws.amazon.com/) - Source of documentation
- [Vercel](https://vercel.com/) - Frontend deployment platform
- [Railway](https://railway.app/) - Backend deployment platform

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md) for common solutions
2. Review the [Issues](https://github.com/your-username/aws-epubify/issues) page
3. Check the [Deployment Guide](DEPLOYMENT.md) for deployment-specific issues
4. Create a new issue with detailed information if the problem persists

---

Made with ❤️ for the AWS community