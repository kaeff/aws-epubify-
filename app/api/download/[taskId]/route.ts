import { NextRequest, NextResponse } from 'next/server';
import { tasks } from '../../lib/tasks';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId;
    
    if (!taskId) {
      return NextResponse.json(
        { detail: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get task from storage
    const task = tasks.get(taskId);
    
    if (!task) {
      return NextResponse.json(
        { detail: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.status !== 'completed') {
      return NextResponse.json(
        { detail: 'Conversion not completed yet' },
        { status: 400 }
      );
    }

    if (!task.epubBuffer) {
      return NextResponse.json(
        { detail: 'EPUB file not found' },
        { status: 404 }
      );
    }

    // Return the EPUB file
    const filename = `${task.title.replace(/[^a-zA-Z0-9]/g, '-')}.epub`;
    
    return new NextResponse(task.epubBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': task.epubBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Failed to download file:', error);
    return NextResponse.json(
      { detail: 'Failed to download file' },
      { status: 500 }
    );
  }
}