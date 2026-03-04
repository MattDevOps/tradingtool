'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface StrategyResult {
  metrics: {
    winRate: number;
    expectedValue: number;
    profitFactor: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
  };
  probabilityRandom: number;
  verdict: 'LIKELY_REAL_EDGE' | 'NOT_STATISTICALLY_RELIABLE';
  stabilityCheck: {
    firstHalf: any;
    secondHalf: any;
    degradation: boolean;
  };
}

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultId = searchParams.get('resultId');
  const uploadId = searchParams.get('uploadId');

  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => {
    if (!resultId || !uploadId) {
      router.push('/upload');
      return;
    }

    // Fetch result from API
    fetch(`/api/results/${resultId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setResult(data);
        }
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [resultId, uploadId, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !resultId) return;

    try {
      await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          email,
        }),
      });

      setEmailSubmitted(true);
    } catch (err) {
      console.error('Failed to submit email:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error || 'Failed to load results'}</p>
            <button
              onClick={() => router.push('/upload')}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-lg"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isRealEdge = result.verdict === 'LIKELY_REAL_EDGE';
  const verdictColor = isRealEdge ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const verdictText = isRealEdge ? '✅ Likely real edge' : '❌ Not statistically reliable';

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

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Strategy Analysis Results
        </h1>

        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Expected value:</span>
              <span className="text-2xl font-bold text-primary">
                {result.metrics.expectedValue >= 0 ? '+' : ''}
                {result.metrics.expectedValue.toFixed(2)}R
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Win rate:</span>
              <span className="text-xl font-semibold">
                {(result.metrics.winRate * 100).toFixed(1)}%
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Profit factor:</span>
              <span className="text-xl font-semibold">
                {result.metrics.profitFactor.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Probability of randomness:</span>
              <span className="text-xl font-semibold">
                {(result.probabilityRandom * 100).toFixed(1)}%
              </span>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className={`p-4 rounded-lg border-2 ${verdictColor}`}>
                <p className="text-xl font-bold text-center">{verdictText}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Stability Check:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">First half:</span>
                  <span className="ml-2 font-semibold">
                    {result.stabilityCheck.firstHalf.expectedValue >= 0 ? '+' : ''}
                    {result.stabilityCheck.firstHalf.expectedValue.toFixed(2)}R
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Second half:</span>
                  <span className="ml-2 font-semibold">
                    {result.stabilityCheck.secondHalf.expectedValue >= 0 ? '+' : ''}
                    {result.stabilityCheck.secondHalf.expectedValue.toFixed(2)}R
                  </span>
                </div>
              </div>
              {result.stabilityCheck.degradation && (
                <p className="text-sm text-orange-600 mt-2">
                  ⚠️ Performance degraded in second half
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 text-sm text-gray-600">
              <p>Total trades analyzed: {result.metrics.totalTrades}</p>
              <p>Winning trades: {result.metrics.winningTrades} | Losing trades: {result.metrics.losingTrades}</p>
            </div>
          </div>
        </div>

        {!emailSubmitted && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-4">
              Enter your email to unlock full report / PDF download
            </p>
            <form onSubmit={handleEmailSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Submit
              </button>
            </form>
          </div>
        )}

        {emailSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">Thank you! Check your email for the full report.</p>
          </div>
        )}

        <div className="text-center">
          <a
            href="/"
            className="text-primary hover:underline"
          >
            Check another strategy →
          </a>
        </div>
      </main>
    </div>
  );
}
