import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { parse } from 'node-html-parser';
import { tasks, type TaskInfo } from '../lib/tasks';

interface ConversionRequest {
  url: string;
  title?: string;
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
    
    updateStatus('processing', 10, 'Extracting documentation links...');
    
    // Extract links from documentation
    const links = await extractDocumentationLinks(url);
    
    if (links.length === 0) {
      throw new Error('No documentation links found');
    }
    
    updateStatus('processing', 20, `Found ${links.length} pages to convert...`);
    
    // Process each page
    const chapters = [];
    for (let i = 0; i < links.length; i++) {
      updateStatus('processing', 20 + (i * 60 / links.length), `Processing page ${i + 1}/${links.length}...`);
      
      try {
        const chapter = await processPage(links[i]);
        if (chapter) {
          chapters.push(chapter);
        }
      } catch (error) {
        console.warn(`Failed to process ${links[i]}:`, error);
        continue;
      }
    }
    
    updateStatus('processing', 80, 'Creating EPUB file...');
    
    // Create EPUB
    const epubBuffer = await createEpub(title || 'AWS Documentation', chapters);
    
    updateStatus('processing', 90, 'Finalizing...');
    
    // Store the EPUB data (in a real app, you'd save to storage)
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

async function extractDocumentationLinks(url: string): Promise<string[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AWS-Epubify/1.0)',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  
  const html = await response.text();
  const root = parse(html);
  
  const links: string[] = [];
  const seen = new Set<string>();
  
  const linkElements = root.querySelectorAll('a[href]');
  
  for (const element of linkElements) {
    const href = element.getAttribute('href');
    if (!href) continue;
    
    // Convert relative URLs to absolute
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, url).toString();
    } catch {
      continue;
    }
    
    // Filter for documentation-like URLs
    if (
      (absoluteUrl.startsWith('https://docs.aws.amazon.com') || 
       absoluteUrl.startsWith('https://aws.amazon.com/documentation')) &&
      !absoluteUrl.endsWith('.pdf') &&
      !absoluteUrl.endsWith('.zip') &&
      !absoluteUrl.endsWith('.tar.gz') &&
      !absoluteUrl.includes('#') &&
      !seen.has(absoluteUrl)
    ) {
      seen.add(absoluteUrl);
      links.push(absoluteUrl);
    }
  }
  
  // Limit to first 50 pages for demo
  return links.slice(0, 50);
}

async function processPage(url: string): Promise<{ title: string; content: string; url: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AWS-Epubify/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    
    const html = await response.text();
    const root = parse(html);
    
    // Extract title
    const titleElement = root.querySelector('title') || root.querySelector('h1');
    const pageTitle = titleElement?.innerText?.trim() || 'Untitled';
    
    // Extract main content
    let contentElement = root.querySelector('main') || 
                        root.querySelector('article') || 
                        root.querySelector('[role="main"]');
    
    if (!contentElement) {
      // Fallback to body content, but try to remove navigation and other non-content elements
      const body = root.querySelector('body');
      if (body) {
        const elementsToRemove = body.querySelectorAll('nav, header, footer, .navbar, .sidebar, .breadcrumb');
                 elementsToRemove.forEach((el: any) => el.remove());
        contentElement = body;
      }
    }
    
    if (!contentElement) {
      return null;
    }
    
    const content = contentElement.innerHTML;
    
    if (!content) {
      return null;
    }
    
    return {
      title: pageTitle,
      content: content,
      url: url,
    };
  } catch (error) {
    console.warn(`Failed to process page ${url}:`, error);
    return null;
  }
}

async function createEpub(title: string, chapters: Array<{ title: string; content: string; url: string }>): Promise<Buffer> {
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
  
  // Add content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="uid">aws-epubify-${Date.now()}</dc:identifier>
        <dc:title>${escapeXml(title)}</dc:title>
        <dc:creator>AWS Epubify</dc:creator>
        <dc:language>en</dc:language>
        <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    </metadata>
    <manifest>
        <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
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
  
  // Add chapters
  chapters.forEach((chapter, i) => {
    const chapterContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeXml(chapter.title)}</title>
</head>
<body>
    <h1>${escapeXml(chapter.title)}</h1>
    ${chapter.content}
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