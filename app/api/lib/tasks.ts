import { Buffer } from 'buffer';

interface TaskInfo {
  task_id: string;
  url: string;
  title: string;
  status: string;
  progress: number;
  message: string;
  created_at: string;
  updated_at?: string;
  download_url?: string;
  epubBuffer?: Buffer;
}

// In-memory storage for tasks (in production, you'd use a database or Vercel KV)
export const tasks = new Map<string, TaskInfo>();

export type { TaskInfo };