import { NextRequest, NextResponse } from 'next/server';
import { tasks } from '../../lib/tasks';

interface ConversionStatus {
  task_id: string;
  status: string;
  progress: number;
  message: string;
  download_url?: string;
}

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

    // Return status information
    const status: ConversionStatus = {
      task_id: task.task_id,
      status: task.status,
      progress: task.progress,
      message: task.message,
      download_url: task.download_url,
    };

    return NextResponse.json(status);
    
  } catch (error) {
    console.error('Failed to get status:', error);
    return NextResponse.json(
      { detail: 'Failed to get status' },
      { status: 500 }
    );
  }
}