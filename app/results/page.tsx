'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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
  verdict: 'LIKELY_POSITIVE_EDGE' | 'LIKELY_NEGATIVE_EDGE' | 'NOT_STATISTICALLY_RELIABLE';
  stabilityCheck: {
    firstHalf: {
      expectedValue: number;
    };
    secondHalf: {
      expectedValue: number;
    };
    degradation: boolean;
  };
}

function ResultsContent() {
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
              className="mt-4 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine verdict display
  let verdictConfig: {
    icon: string;
    text: string;
    explanation: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
  };

  if (result.verdict === 'LIKELY_POSITIVE_EDGE') {
    verdictConfig = {
      icon: '✅',
      text: 'Likely positive edge',
      explanation: 'This setup shows statistically stable profitability.',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
    };
  } else if (result.verdict === 'LIKELY_NEGATIVE_EDGE') {
    verdictConfig = {
      icon: '🟠',
      text: 'Likely losing strategy',
      explanation: 'This setup shows a consistent negative expectancy.',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800',
    };
  } else {
    verdictConfig = {
      icon: '🔴',
      text: 'Not statistically reliable',
      explanation: 'The results could be due to random chance.',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
    };
  }

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
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Your strategy check
          </h1>
          <p className="text-lg text-gray-600">
            Statistical analysis of your trading strategy
          </p>
        </div>

        {/* Main Results Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-soft p-8 md:p-10 mb-6">
          <div className="space-y-8">
            {/* Verdict Box - Prominent at top */}
            <div className={`p-8 rounded-xl border-2 ${verdictConfig.bgColor} ${verdictConfig.borderColor} shadow-lg`}>
              <div className="text-center">
                <p className={`text-4xl mb-3`}>
                  {verdictConfig.icon}
                </p>
                <p className={`text-3xl font-bold mb-3 ${verdictConfig.textColor}`}>
                  {verdictConfig.text}
                </p>
                <p className={`text-base ${verdictConfig.textColor} opacity-90 mb-4`}>
                  {verdictConfig.explanation}
                </p>
                <div className="inline-block px-4 py-2 bg-white/60 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700">
                    Based on <span className="text-indigo-600">{result.metrics.totalTrades}</span> trades
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics - Better visual hierarchy */}
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center py-4 px-4 bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <span className="text-gray-800 font-semibold">Expected value:</span>
                </div>
                <span className={`text-3xl font-bold ${result.metrics.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.metrics.expectedValue >= 0 ? '+' : ''}
                  {result.metrics.expectedValue.toFixed(2)}R
                </span>
              </div>

              <div className="flex justify-between items-center py-4 px-4 bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <span className="text-gray-800 font-semibold">Win rate:</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {(result.metrics.winRate * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between items-center py-4 px-4 bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚖️</span>
                  <span className="text-gray-800 font-semibold">Profit factor:</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {result.metrics.profitFactor.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-start py-4 px-4 bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200/50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🎲</span>
                    <span className="text-gray-800 font-semibold">Probability of randomness:</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-11">
                    Lower is better. Below 20% usually indicates a real edge.
                  </p>
                </div>
                <span className="text-2xl font-bold text-gray-900 ml-4">
                  {(result.probabilityRandom * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Stability Check - Better styling */}
            <div className="pt-6 border-t-2 border-gray-200">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">📈</span>
                <p className="text-lg font-bold text-gray-800">Stability Check</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200/50 shadow-sm">
                  <span className="text-xs font-semibold text-gray-700 block mb-2 uppercase tracking-wide">First half EV</span>
                  <span className={`text-2xl font-bold ${result.stabilityCheck.firstHalf.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.stabilityCheck.firstHalf.expectedValue >= 0 ? '+' : ''}
                    {result.stabilityCheck.firstHalf.expectedValue.toFixed(2)}R
                  </span>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200/50 shadow-sm">
                  <span className="text-xs font-semibold text-gray-700 block mb-2 uppercase tracking-wide">Second half EV</span>
                  <span className={`text-2xl font-bold ${result.stabilityCheck.secondHalf.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.stabilityCheck.secondHalf.expectedValue >= 0 ? '+' : ''}
                    {result.stabilityCheck.secondHalf.expectedValue.toFixed(2)}R
                  </span>
                </div>
              </div>
              {result.stabilityCheck.degradation && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4 shadow-soft">
                  <p className="text-sm text-orange-800 font-semibold flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    Performance degraded in second half
                  </p>
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex gap-6 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">Winning trades:</span>{' '}
                  <span className="text-green-600 font-semibold">{result.metrics.winningTrades}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Losing trades:</span>{' '}
                  <span className="text-red-600 font-semibold">{result.metrics.losingTrades}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Gate */}
        {!emailSubmitted && (
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-soft p-8 mb-6">
            <div className="text-center mb-6">
              <span className="text-4xl mb-3 block">📧</span>
              <p className="text-xl font-bold text-gray-900 mb-2">
                Get your full report
              </p>
              <p className="text-sm text-gray-600">
                PDF + detailed breakdown delivered to your inbox
              </p>
            </div>
            <form onSubmit={handleEmailSubmit} className="flex gap-3 mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-medium transition-all shadow-sm"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get Report
              </button>
            </form>
            <p className="text-xs text-gray-600 text-center">
              Want deeper journaling and performance tracking?{' '}
              <a href="https://insighttrader.io" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline font-semibold">
                Try InsightTrader →
              </a>
            </p>
          </div>
        )}

        {emailSubmitted && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 mb-6 shadow-soft">
            <p className="text-green-800 font-semibold text-center flex items-center justify-center gap-2">
              <span className="text-xl">✅</span>
              Thank you! Check your email for the full report.
            </p>
          </div>
        )}

        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold hover:underline transition-colors"
          >
            Check another strategy →
          </a>
        </div>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
