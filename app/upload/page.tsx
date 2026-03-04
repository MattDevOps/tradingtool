'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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
      
      // Store symbols in sessionStorage for temp uploads (no DB)
      if (data.symbols && Array.isArray(data.symbols)) {
        const symbolsWithCounts = data.symbols.map((symbol: string) => {
          // Count occurrences in trades (we have tradeCount but not per-symbol)
          // For now, we'll fetch from API which handles DB case
          return { symbol, count: 0 }; // Will be updated by API
        });
        sessionStorage.setItem(`upload-${data.uploadId}-symbols`, JSON.stringify(symbolsWithCounts));
      }
      
      // Redirect to rule builder with upload ID
      router.push(`/rule-builder?uploadId=${data.uploadId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Strategy Reality Check"
                width={180}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Upload Your Trade History
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Export your ThinkOrSwim account statement and we'll automatically detect your trades
          </p>
        </div>
        
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/50 rounded-xl shadow-soft">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <p className="text-sm text-indigo-900">
              <span className="font-semibold">Currently supports ThinkOrSwim trade statements.</span> More brokers coming soon.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-xl shadow-soft">
            <div className="flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <div className="flex-1">
                <p className="text-red-800 font-semibold mb-1">Upload Error</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {detectionResult && (
          <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-soft">
            <div className="flex items-start gap-4">
              <div className="text-3xl">✅</div>
              <div className="flex-1">
                <p className="font-bold text-green-900 mb-3 text-lg">File processed successfully!</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-green-700 font-medium">Detected columns:</span>
                    <span className="text-green-800 font-semibold">Symbol · Open time · Close time · Side · P&L</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-700 font-medium">Trades found:</span>
                    <span className="text-green-800 font-bold text-xl">{detectionResult.tradeCount}</span>
                  </div>
                  {detectionResult.dateRange && (
                    <div className="flex items-center gap-2">
                      <span className="text-green-700 font-medium">Date range:</span>
                      <span className="text-green-800 font-semibold">
                        {new Date(detectionResult.dateRange.start).toLocaleDateString()} - {new Date(detectionResult.dateRange.end).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm text-green-700">
                    Redirecting to strategy builder...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 md:p-12 shadow-soft mb-6">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
              file
                ? 'border-indigo-400 bg-gradient-to-br from-indigo-50/50 to-purple-50/50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50/30 hover:to-purple-50/30'
            }`}
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
              <div className="space-y-4">
                <div className="text-6xl mb-4">📄</div>
                <div>
                  <p className="text-xl font-bold text-gray-900 mb-2">{file.name}</p>
                  <p className="text-sm text-gray-600 font-medium">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setDetectionResult(null);
                  }}
                  className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-semibold underline"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl mb-4">📁</div>
                <div>
                  <p className="text-xl font-bold text-gray-900 mb-2">
                    Drag & drop your CSV file here
                  </p>
                  <p className="text-gray-600 mb-6">or click to browse</p>
                  <button 
                    type="button"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Choose File
                  </button>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">How to export from ThinkOrSwim:</p>
                  <p className="text-sm text-gray-600">
                    Monitor → Account Statement → Export CSV
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Button */}
        {file && !detectionResult && (
          <div className="text-center">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Upload & Analyze</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </div>
        )}

        {uploading && !detectionResult && (
          <div className="mt-6 text-center">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-500 border-t-transparent"></div>
              <p className="text-gray-700 font-medium">Scanning your file and detecting trades...</p>
            </div>
          </div>
        )}

        {/* Help Section */}
        {!file && !uploading && (
          <div className="mt-12 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-semibold text-gray-900 mb-2">What we analyze:</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Closed trades with entry and exit times</li>
                  <li>Profit and loss for each trade</li>
                  <li>Trade direction (long/short)</li>
                  <li>Symbols and instruments traded</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
