'use client';

import React, { useState } from 'react';
import { BookOpen, Download, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';

interface ConversionStatus {
  task_id: string;
  status: string;
  progress: number;
  message: string;
  download_url?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConversionStatus(null);
    setIsConverting(true);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to start conversion');
      }

      // Start polling for status
      pollStatus(data.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsConverting(false);
    }
  };

  const pollStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/status/${taskId}`);
      const status = await response.json();

      setConversionStatus(status);

      if (status.status === 'completed') {
        setIsConverting(false);
      } else if (status.status === 'failed') {
        setError(status.message || 'Conversion failed');
        setIsConverting(false);
      } else if (status.status === 'processing' || status.status === 'pending') {
        // Continue polling
        setTimeout(() => pollStatus(taskId), 2000);
      }
    } catch (err) {
      setError('Failed to check conversion status');
      setIsConverting(false);
    }
  };

  const handleDownload = async () => {
    if (!conversionStatus?.task_id) return;

    try {
      const response = await fetch(`/api/download/${conversionStatus.task_id}`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conversionStatus.task_id}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-aws-orange mr-3" />
            <h1 className="text-3xl font-bold text-aws-blue">AWS Epubify</h1>
          </div>
          <p className="text-gray-600">
            Convert AWS documentation to EPUB format for offline reading
          </p>
        </div>

        {/* Conversion Form */}
        <div className="card mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Documentation URL *
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.aws.amazon.com/s3/latest/userguide/"
                className="input-field"
                required
                disabled={isConverting}
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the URL of the AWS documentation index page you want to convert
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                EPUB Title (Optional)
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="AWS S3 User Guide"
                className="input-field"
                disabled={isConverting}
              />
            </div>

            <button
              type="submit"
              disabled={isConverting || !url.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isConverting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Convert to EPUB
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Status Display */}
        {conversionStatus && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(conversionStatus.status)}
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {conversionStatus.status.charAt(0).toUpperCase() + conversionStatus.status.slice(1)}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {conversionStatus.progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-aws-orange h-2 rounded-full transition-all duration-300"
                  style={{ width: `${conversionStatus.progress}%` }}
                ></div>
              </div>

              {/* Status Message */}
              <p className="text-sm text-gray-600">{conversionStatus.message}</p>

              {/* Download Button */}
              {conversionStatus.status === 'completed' && (
                <button
                  onClick={handleDownload}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download EPUB
                </button>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Find the AWS documentation section you want to convert</li>
            <li>Copy the URL of the main index or table of contents page</li>
            <li>Paste the URL above and optionally provide a custom title</li>
            <li>Click "Convert to EPUB" and wait for the process to complete</li>
            <li>Download your EPUB file when ready</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Example URLs:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• https://docs.aws.amazon.com/s3/latest/userguide/</li>
              <li>• https://docs.aws.amazon.com/ec2/latest/userguide/</li>
              <li>• https://docs.aws.amazon.com/lambda/latest/dg/</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}