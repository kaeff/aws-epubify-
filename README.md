# AWS Epubify

Convert AWS documentation to EPUB format for offline reading.

## 🚀 Features

- **Web-based Interface**: Clean, modern UI built with Next.js and Tailwind CSS
- **Real-time Progress**: Live updates on conversion progress
- **Smart Content Extraction**: Automatically discovers and processes documentation pages
- **EPUB Generation**: Creates properly formatted EPUB files with table of contents
- **Serverless Architecture**: Fully serverless, running on Vercel
- **No Dependencies**: No need for external services like Redis or databases

## 🏗️ Architecture

This application runs entirely on **Vercel** using Next.js:

- **Frontend**: Next.js 14 with React and Tailwind CSS
- **Backend**: Next.js API routes (serverless functions)
- **Processing**: Web scraping and EPUB generation in serverless functions
- **Storage**: In-memory task storage (upgradeable to Vercel KV for production)
- **Deployment**: Vercel with automatic deployments

## �️ Technology Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Web Scraping**: Cheerio
- **EPUB Generation**: JSZip
- **Deployment**: Vercel
- **Package Manager**: npm

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd aws-epubify
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## 🚀 Deployment

### Deploy to Vercel

1. **Connect to Vercel**:
   - Push your code to GitHub/GitLab/Bitbucket
   - Import the project in Vercel
   - Deploy automatically

2. **Or use Vercel CLI**:
   ```bash
   npm install -g vercel
   vercel
   ```

The app will automatically deploy with the correct serverless function configuration.

## 📚 Usage

1. **Enter Documentation URL**: Paste the URL of an AWS documentation index page
2. **Optional Title**: Provide a custom title for your EPUB
3. **Convert**: Click "Convert to EPUB" and wait for processing
4. **Download**: Download your EPUB file when conversion is complete

### Example URLs
- `https://docs.aws.amazon.com/s3/latest/userguide/`
- `https://docs.aws.amazon.com/ec2/latest/userguide/`
- `https://docs.aws.amazon.com/lambda/latest/dg/`

## ⚙️ Configuration

### Vercel Function Timeouts

The `vercel.json` configuration includes:
- **Convert endpoint**: 300 seconds (5 minutes) for processing
- **Status endpoint**: 30 seconds for quick status checks
- **Download endpoint**: 60 seconds for file delivery

### Environment Variables

No environment variables are required for basic functionality. For production use with larger documentation sets, consider:

- **Vercel KV**: For persistent task storage
- **Vercel Blob**: For file storage
- **Custom timeout limits**: Based on your documentation size

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── convert/
│   │   │   └── route.ts          # Conversion endpoint
│   │   ├── status/
│   │   │   └── [taskId]/
│   │   │       └── route.ts      # Status checking
│   │   └── download/
│   │       └── [taskId]/
│   │           └── route.ts      # File download
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main application
├── public/                       # Static assets
├── vercel.json                   # Vercel configuration
├── package.json                  # Dependencies
├── tailwind.config.js           # Tailwind configuration
└── tsconfig.json                # TypeScript configuration
```

## 🔧 API Endpoints

### POST `/api/convert`
Start a new conversion job.

**Request**:
```json
{
  "url": "https://docs.aws.amazon.com/s3/latest/userguide/",
  "title": "AWS S3 User Guide" // optional
}
```

**Response**:
```json
{
  "task_id": "uuid-here",
  "message": "Conversion started"
}
```

### GET `/api/status/[taskId]`
Check conversion status.

**Response**:
```json
{
  "task_id": "uuid-here",
  "status": "processing", // pending, processing, completed, failed
  "progress": 45,
  "message": "Processing page 10/20...",
  "download_url": "/api/download/uuid-here" // when completed
}
```

### GET `/api/download/[taskId]`
Download the generated EPUB file.

**Response**: EPUB file download

## 🎯 Performance Considerations

- **Page Limit**: Limited to 50 pages per conversion for optimal performance
- **Timeout Handling**: 5-minute timeout for conversion processes
- **Memory Management**: Efficient streaming and chunked processing
- **Caching**: Static assets cached by Vercel's CDN

## 🛡️ Error Handling

- **Invalid URLs**: Validates AWS documentation URLs
- **Network Timeouts**: Graceful handling of slow responses
- **Processing Failures**: Detailed error messages and status updates
- **Resource Limits**: Automatic fallbacks for large documentation sets

## 🔄 Upgrading to Production

For production use with high traffic or large documentation sets:

1. **Add Vercel KV** for persistent task storage
2. **Use Vercel Blob** for file storage
3. **Implement rate limiting**
4. **Add authentication** if needed
5. **Monitor function usage** and optimize timeouts

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS for providing comprehensive documentation
- Vercel for serverless hosting platform
- Next.js team for the excellent framework
- Contributors and community feedback