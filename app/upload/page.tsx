'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setDetectionResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setError(null);
      setDetectionResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setDetectionResult(data);
      
      // Redirect to rule builder with upload ID
      router.push(`/rule-builder?uploadId=${data.uploadId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-gray-900">
              Strategy Reality Check
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Upload Your Trade History
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {detectionResult && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <span className="text-2xl mr-3">✅</span>
              <div className="flex-1">
                <p className="font-semibold text-green-900 mb-2">We detected:</p>
                <p className="text-green-800 mb-2">
                  Symbol · Open time · Close time · Side · P&L
                </p>
                <p className="text-green-700 font-semibold">
                  {detectionResult.tradeCount} closed trades found
                </p>
                <p className="text-sm text-green-600 mt-2">
                  Date range: {new Date(detectionResult.dateRange.start).toLocaleDateString()} - {new Date(detectionResult.dateRange.end).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {file ? (
            <div>
              <div className="text-4xl mb-4">📄</div>
              <p className="text-lg font-semibold text-gray-900 mb-2">{file.name}</p>
              <p className="text-sm text-gray-600">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-4">📁</div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Drag & drop CSV file here
              </p>
              <p className="text-gray-600 mb-4">or click to browse</p>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors">
                Choose File
              </button>
            </div>
          )}
        </div>

        {file && !detectionResult && (
          <div className="mt-6 text-center">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload & Detect Columns'}
            </button>
          </div>
        )}

        {uploading && (
          <div className="mt-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-gray-600 mt-2">Scanning your file...</p>
          </div>
        )}
      </main>
    </div>
  );
}
