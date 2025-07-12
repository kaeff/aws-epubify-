from celery import Celery
import os
import json
import redis
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import subprocess
import tempfile
import shutil
from urllib.parse import urljoin, urlparse
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Celery configuration
celery_app = Celery(
    "aws_epubify",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

# Redis client
redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, db=0)

def update_task_status(task_id: str, status: str, progress: int = 0, message: str = ""):
    """Update task status in Redis"""
    try:
        # Get existing task data
        task_data = redis_client.get(f"task:{task_id}")
        if task_data:
            task_info = json.loads(task_data)
        else:
            task_info = {}
        
        # Update fields
        task_info.update({
            "status": status,
            "progress": progress,
            "message": message,
            "updated_at": datetime.now().isoformat()
        })
        
        # Save back to Redis
        redis_client.setex(
            f"task:{task_id}",
            timedelta(hours=24),
            json.dumps(task_info)
        )
        
        logger.info(f"Task {task_id}: {status} - {message} ({progress}%)")
        
    except Exception as e:
        logger.error(f"Failed to update task status: {str(e)}")

def extract_documentation_links(url: str) -> list:
    """Extract all documentation links from the index page"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        links = []
        
        # Find all links that look like documentation pages
        for link in soup.find_all('a', href=True):
            href = link['href']
            # Convert relative URLs to absolute
            absolute_url = urljoin(url, href)
            
            # Filter for documentation-like URLs
            if (absolute_url.startswith(('https://docs.aws.amazon.com', 'https://aws.amazon.com/documentation')) and
                not absolute_url.endswith(('.pdf', '.zip', '.tar.gz')) and
                '#' not in absolute_url):
                links.append(absolute_url)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_links = []
        for link in links:
            if link not in seen:
                seen.add(link)
                unique_links.append(link)
        
        return unique_links[:50]  # Limit to first 50 pages for demo
        
    except Exception as e:
        logger.error(f"Failed to extract links: {str(e)}")
        return []

def create_epub_with_pywebdoc(task_id: str, url: str, title: str) -> str:
    """Create EPUB using PyWebDoc2Epub library"""
    try:
        # Create output directory
        output_dir = "output"
        os.makedirs(output_dir, exist_ok=True)
        
        # Output file path
        output_file = os.path.join(output_dir, f"{task_id}.epub")
        
        # Use PyWebDoc2Epub to convert
        # Note: This is a simplified approach. In production, you'd want to use the actual library
        # For now, we'll create a basic EPUB structure
        
        update_task_status(task_id, "processing", 20, "Extracting documentation links...")
        
        # Extract links from the documentation index
        links = extract_documentation_links(url)
        
        if not links:
            raise Exception("No documentation links found")
        
        update_task_status(task_id, "processing", 40, f"Found {len(links)} pages to convert...")
        
        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download and process each page
            chapters = []
            for i, link in enumerate(links):
                try:
                    update_task_status(task_id, "processing", 40 + (i * 40 // len(links)), f"Processing page {i+1}/{len(links)}...")
                    
                    response = requests.get(link, timeout=30)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Extract title
                    page_title = soup.find('title')
                    if page_title:
                        page_title = page_title.get_text().strip()
                    else:
                        page_title = f"Chapter {i+1}"
                    
                    # Extract main content
                    content = soup.find('main') or soup.find('article') or soup.find('body')
                    if content:
                        chapters.append({
                            'title': page_title,
                            'content': str(content),
                            'url': link
                        })
                    
                except Exception as e:
                    logger.warning(f"Failed to process {link}: {str(e)}")
                    continue
            
            # Create a simple EPUB structure
            epub_content = create_simple_epub(title, chapters)
            
            # Save EPUB file
            with open(output_file, 'wb') as f:
                f.write(epub_content)
        
        update_task_status(task_id, "processing", 90, "Finalizing EPUB...")
        
        return output_file
        
    except Exception as e:
        logger.error(f"Failed to create EPUB: {str(e)}")
        raise

def create_simple_epub(title: str, chapters: list) -> bytes:
    """Create a simple EPUB file structure"""
    import zipfile
    import io
    
    # Create in-memory ZIP file
    epub_buffer = io.BytesIO()
    
    with zipfile.ZipFile(epub_buffer, 'w', zipfile.ZIP_DEFLATED) as epub:
        # Add mimetype
        epub.writestr('mimetype', 'application/epub+zip')
        
        # Add META-INF/container.xml
        container_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>'''
        epub.writestr('META-INF/container.xml', container_xml)
        
        # Add content.opf
        content_opf = f'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="uid">aws-epubify-{datetime.now().strftime('%Y%m%d%H%M%S')}</dc:identifier>
        <dc:title>{title}</dc:title>
        <dc:creator>AWS Epubify</dc:creator>
        <dc:language>en</dc:language>
        <dc:date>{datetime.now().strftime('%Y-%m-%d')}</dc:date>
    </metadata>
    <manifest>
        <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        {' '.join([f'<item id="chapter{i}" href="chapter{i}.xhtml" media-type="application/xhtml+xml"/>' for i in range(len(chapters))])}
    </manifest>
    <spine>
        <itemref idref="toc"/>
        {' '.join([f'<itemref idref="chapter{i}"/>' for i in range(len(chapters))])}
    </spine>
</package>'''
        epub.writestr('OEBPS/content.opf', content_opf)
        
        # Add table of contents
        toc_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Table of Contents</title>
</head>
<body>
    <nav epub:type="toc">
        <h1>Table of Contents</h1>
        <ol>
            {' '.join([f'<li><a href="chapter{i}.xhtml">{chapters[i]["title"]}</a></li>' for i in range(len(chapters))])}
        </ol>
    </nav>
</body>
</html>'''
        epub.writestr('OEBPS/toc.xhtml', toc_content)
        
        # Add chapters
        for i, chapter in enumerate(chapters):
            chapter_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>{chapter["title"]}</title>
</head>
<body>
    <h1>{chapter["title"]}</h1>
    {chapter["content"]}
</body>
</html>'''
            epub.writestr(f'OEBPS/chapter{i}.xhtml', chapter_content)
    
    epub_buffer.seek(0)
    return epub_buffer.read()

@celery_app.task
def convert_to_epub(task_id: str, url: str, title: Optional[str] = None):
    """Celery task to convert documentation to EPUB"""
    try:
        update_task_status(task_id, "processing", 0, "Starting conversion...")
        
        # Validate URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise ValueError("Invalid URL provided")
        
        # Set default title if not provided
        if not title:
            title = f"AWS Documentation - {parsed_url.netloc}"
        
        update_task_status(task_id, "processing", 10, "Preparing conversion...")
        
        # Create EPUB
        output_file = create_epub_with_pywebdoc(task_id, url, title)
        
        # Update task as completed
        update_task_status(task_id, "completed", 100, "Conversion completed successfully!")
        
        return {"status": "success", "file": output_file}
        
    except Exception as e:
        error_msg = f"Conversion failed: {str(e)}"
        logger.error(error_msg)
        update_task_status(task_id, "failed", 0, error_msg)
        return {"status": "error", "message": error_msg}

if __name__ == "__main__":
    # Start the worker
    celery_app.start()