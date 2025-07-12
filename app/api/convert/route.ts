import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { parse } from 'node-html-parser';
import { tasks, type TaskInfo } from '../lib/tasks';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { Buffer } from 'buffer';

interface ConversionRequest {
  url: string;
  title?: string;
}

interface PageContent {
  title: string;
  content: string;
  url: string;
  cleanedContent: string;
  excerpt: string;
}

// Helper function to get consistent headers for HTML requests
function getHtmlRequestHeaders(): HeadersInit {
  return {
    'User-Agent': 'Mozilla/5.0 (compatible; AWS-Epubify/1.0)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ConversionRequest = await request.json();
    
    if (!body.url) {
      return NextResponse.json(
        { detail: 'URL is required' },
        { status: 400 }
      );
    }

    // Generate unique task ID
    const task_id = uuidv4();
    
    // Create task info
    const taskInfo: TaskInfo = {
      task_id,
      url: body.url,
      title: body.title || 'AWS Documentation',
      status: 'pending',
      progress: 0,
      message: 'Conversion queued',
      created_at: new Date().toISOString(),
    };
    
    // Store task info
    tasks.set(task_id, taskInfo);
    
    // Start background conversion (fire and forget)
    convertToEpub(task_id, body.url, body.title).catch((error: unknown) => {
      console.error(`Conversion failed for task ${task_id}:`, error);
      const task = tasks.get(task_id);
      if (task) {
        task.status = 'failed';
        task.message = `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        tasks.set(task_id, task);
      }
    });
    
    return NextResponse.json({
      task_id,
      message: 'Conversion started'
    });
    
  } catch (error) {
    console.error('Failed to start conversion:', error);
    return NextResponse.json(
      { detail: 'Failed to start conversion' },
      { status: 500 }
    );
  }
}

async function convertToEpub(taskId: string, url: string, title?: string): Promise<void> {
  const updateStatus = (status: string, progress: number, message: string) => {
    const task = tasks.get(taskId);
    if (task) {
      task.status = status;
      task.progress = progress;
      task.message = message;
      task.updated_at = new Date().toISOString();
      tasks.set(taskId, task);
    }
  };

  try {
    updateStatus('processing', 0, 'Starting conversion...');
    
    // Validate URL
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol || !parsedUrl.hostname) {
      throw new Error('Invalid URL provided');
    }
    
    updateStatus('processing', 10, 'Analyzing documentation structure...');
    
    // Extract links from documentation with improved AWS documentation structure understanding
    const links = await extractAwsDocumentationLinks(url);
    
    if (links.length === 0) {
      throw new Error('No documentation links found');
    }
    
    updateStatus('processing', 20, `Found ${links.length} pages to convert...`);
    
    // Process each page with readability.js
    const chapters: PageContent[] = [];
    for (let i = 0; i < links.length; i++) {
      updateStatus('processing', 20 + (i * 60 / links.length), `Processing page ${i + 1}/${links.length}...`);
      
      try {
        const chapter = await processPageWithReadability(links[i]);
        if (chapter) {
          chapters.push(chapter);
        }
      } catch (error) {
        console.warn(`Failed to process ${links[i]}:`, error);
        continue;
      }
    }
    
    updateStatus('processing', 80, 'Creating EPUB file...');
    
    // Create EPUB with cleaned content
    const epubBuffer = await createEpub(title || 'AWS Documentation', chapters);
    
    updateStatus('processing', 90, 'Finalizing...');
    
    // Store the EPUB data
    const task = tasks.get(taskId);
    if (task) {
      task.download_url = `/api/download/${taskId}`;
      task.epubBuffer = epubBuffer;
      tasks.set(taskId, task);
    }
    
    updateStatus('completed', 100, 'Conversion completed successfully!');
    
  } catch (error) {
    console.error('Conversion error:', error);
    updateStatus('failed', 0, `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractAwsDocumentationLinks(url: string): Promise<string[]> {
  const response = await fetch(url, {
    headers: getHtmlRequestHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  // Check if we're getting HTML content (not RSS/XML)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('xml') && !contentType.includes('html')) {
    console.warn(`Received XML/RSS content instead of HTML for ${url}. Content-Type: ${contentType}`);
  }
  
  const html = await response.text();
  const root = parse(html);
  
  const links: string[] = [];
  const seen = new Set<string>();
  
  // Add the main page first
  if (!seen.has(url)) {
    seen.add(url);
    links.push(url);
  }
  
  // Look for AWS-specific table of contents patterns
  const tocSelectors = [
    '[data-testid="toc"]',
    '.toc',
    '#toc',
    '[id*="table-of-contents"]',
    '[class*="table-of-contents"]',
    '[data-testid="nav-tree"]',
    '.nav-tree',
    '[role="navigation"]',
    '.awsui-side-navigation',
    '.awsui-navigation',
    '#sidebar',
    '.sidebar',
    '.navigation',
    '.nav',
    '.menu'
  ];
  
  // Try to find structured navigation
  for (const selector of tocSelectors) {
    const tocElement = root.querySelector(selector);
    if (tocElement) {
      const tocLinks = extractLinksFromElement(tocElement, url);
      for (const link of tocLinks) {
        if (!seen.has(link) && isValidAwsDocumentationLink(link)) {
          seen.add(link);
          links.push(link);
        }
      }
      break; // Use the first valid TOC we find
    }
  }
  
  // If no structured TOC found, look for all documentation links
  if (links.length === 1) {
    const linkElements = root.querySelectorAll('a[href]');
    
    for (const element of linkElements) {
      const href = element.getAttribute('href');
      if (!href) continue;
      
      let absoluteUrl: string;
      try {
        absoluteUrl = new URL(href, url).toString();
      } catch {
        continue;
      }
      
      if (isValidAwsDocumentationLink(absoluteUrl) && !seen.has(absoluteUrl)) {
        seen.add(absoluteUrl);
        links.push(absoluteUrl);
      }
    }
  }
  
  // Limit to reasonable number of pages
  return links.slice(0, 100);
}

function extractLinksFromElement(element: any, baseUrl: string): string[] {
  const links: string[] = [];
  const linkElements = element.querySelectorAll('a[href]');
  
  for (const linkEl of linkElements) {
    const href = linkEl.getAttribute('href');
    if (!href) continue;
    
    try {
      const absoluteUrl = new URL(href, baseUrl).toString();
      if (isValidAwsDocumentationLink(absoluteUrl)) {
        links.push(absoluteUrl);
      }
    } catch {
      continue;
    }
  }
  
  return links;
}

function isValidAwsDocumentationLink(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Check if it's an AWS documentation URL
    if (!parsedUrl.hostname.includes('aws.amazon.com') && 
        !parsedUrl.hostname.includes('docs.aws.amazon.com') &&
        !parsedUrl.hostname.includes('wa.aws.amazon.com')) {
      return false;
    }
    
    // Exclude certain file types and fragments
    if (parsedUrl.pathname.match(/\.(pdf|zip|tar\.gz|jpg|jpeg|png|gif|svg|css|js)$/i)) {
      return false;
    }
    
    // Exclude fragment-only links
    if (parsedUrl.hash && parsedUrl.pathname === new URL(url).pathname && !parsedUrl.search) {
      return false;
    }
    
    // Exclude API references unless they're part of the main documentation
    if (parsedUrl.pathname.includes('/api/') && !parsedUrl.pathname.includes('/latest/')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

async function processPageWithReadability(url: string): Promise<PageContent | null> {
  try {
    const response = await fetch(url, {
      headers: getHtmlRequestHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    // Check if we're getting HTML content (not RSS/XML)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('xml') && !contentType.includes('html')) {
      console.warn(`Received XML/RSS content instead of HTML for ${url}. Content-Type: ${contentType}`);
      // Skip processing RSS/XML content
      return null;
    }
    
    const html = await response.text();
    
    // Use JSDOM to create a DOM for Readability
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Use Readability to clean the content
    const reader = new Readability(document);
    const article = reader.parse();
    
    if (!article || !article.content) {
      console.warn(`No readable content found for ${url}`);
      return null;
    }
    
    // Extract title - prefer readability title, fallback to document title
    const title = article.title || 
                  document.querySelector('title')?.textContent?.trim() || 
                  document.querySelector('h1')?.textContent?.trim() || 
                  'Untitled Page';
    
    // Clean and validate content
    const cleanedContent = article.content.trim();
    if (!cleanedContent || cleanedContent.length < 100) {
      console.warn(`Content too short for ${url}`);
      return null;
    }
    
    return {
      title: title,
      content: html, // Keep original for reference
      url: url,
      cleanedContent: cleanedContent,
      excerpt: article.excerpt || ''
    };
    
  } catch (error) {
    console.warn(`Failed to process page ${url}:`, error);
    return null;
  }
}

async function createEpub(title: string, chapters: PageContent[]): Promise<Buffer> {
  const zip = new JSZip();
  
  // Add mimetype
  zip.file('mimetype', 'application/epub+zip');
  
  // Add META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);
  
  // Add basic CSS for better formatting
  const cssContent = `
body {
    font-family: Georgia, serif;
    font-size: 16px;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    color: #333;
}

h1, h2, h3, h4, h5, h6 {
    font-family: Arial, sans-serif;
    color: #2c3e50;
    margin-top: 30px;
    margin-bottom: 15px;
}

h1 {
    font-size: 2.2em;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
}

h2 {
    font-size: 1.8em;
    border-bottom: 1px solid #bdc3c7;
    padding-bottom: 5px;
}

h3 {
    font-size: 1.4em;
}

p {
    margin-bottom: 15px;
}

code {
    background-color: #f8f9fa;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
}

pre {
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
    border-left: 4px solid #3498db;
}

blockquote {
    border-left: 4px solid #3498db;
    padding-left: 20px;
    margin: 20px 0;
    font-style: italic;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

th, td {
    border: 1px solid #ddd;
    padding: 12px;
    text-align: left;
}

th {
    background-color: #f2f2f2;
    font-weight: bold;
}

ul, ol {
    padding-left: 25px;
}

li {
    margin-bottom: 5px;
}

.highlight {
    background-color: #fff3cd;
    padding: 10px;
    border-radius: 5px;
    border-left: 4px solid #ffc107;
}
`;
  zip.file('OEBPS/styles.css', cssContent);
  
  // Add content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="uid">aws-epubify-${Date.now()}</dc:identifier>
        <dc:title>${escapeXml(title)}</dc:title>
        <dc:creator>AWS Epubify</dc:creator>
        <dc:language>en</dc:language>
        <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
        <dc:description>AWS Documentation converted to EPUB format using AWS Epubify</dc:description>
    </metadata>
    <manifest>
        <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="css" href="styles.css" media-type="text/css"/>
        ${chapters.map((_, i) => `<item id="chapter${i}" href="chapter${i}.xhtml" media-type="application/xhtml+xml"/>`).join('\n        ')}
    </manifest>
    <spine>
        <itemref idref="toc"/>
        ${chapters.map((_, i) => `<itemref idref="chapter${i}"/>`).join('\n        ')}
    </spine>
</package>`;
  zip.file('OEBPS/content.opf', contentOpf);
  
  // Add table of contents
  const tocContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>Table of Contents</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
    <nav epub:type="toc">
        <h1>Table of Contents</h1>
        <ol>
            ${chapters.map((chapter, i) => `<li><a href="chapter${i}.xhtml">${escapeXml(chapter.title)}</a></li>`).join('\n            ')}
        </ol>
    </nav>
</body>
</html>`;
  zip.file('OEBPS/toc.xhtml', tocContent);
  
  // Add chapters with cleaned content
  chapters.forEach((chapter, i) => {
    const chapterContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeXml(chapter.title)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
    <h1>${escapeXml(chapter.title)}</h1>
    ${chapter.cleanedContent}
    <div style="margin-top: 40px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; font-size: 0.9em; color: #666;">
        <p><strong>Source:</strong> <a href="${chapter.url}">${chapter.url}</a></p>
    </div>
</body>
</html>`;
    zip.file(`OEBPS/chapter${i}.xhtml`, chapterContent);
  });
  
  // Generate the zip file
  const epubBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return epubBuffer;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}