'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  const { data: session } = useSession();
  const resultId = searchParams.get('resultId');
  const uploadId = searchParams.get('uploadId');

  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(session?.user?.email || '');
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
      const res = await fetch('/api/auth/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resultId,
        }),
      });

      if (res.ok) {
        setEmailSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send report');
      }
    } catch (err) {
      console.error('Failed to submit email:', err);
      setError('Failed to send report. Please try again.');
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

  // Determine verdict display with simple language
  let verdictConfig: {
    icon: string;
    text: string;
    explanation: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    simpleAnswer: string;
    simpleExplanation: string[];
    whatToDo: string[];
  };

  if (result.verdict === 'LIKELY_POSITIVE_EDGE') {
    verdictConfig = {
      icon: '✅',
      text: 'Likely positive edge',
      explanation: 'This setup shows statistically stable profitability.',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      simpleAnswer: 'YES - Your strategy appears to work!',
      simpleExplanation: [
        'Your trading results are statistically significant',
        'You\'re making money on average per trade',
        'The results are unlikely to be just luck',
      ],
      whatToDo: [
        'Keep trading this strategy',
        'Consider increasing position size gradually',
        'Continue tracking performance over time',
      ],
    };
  } else if (result.verdict === 'LIKELY_NEGATIVE_EDGE') {
    verdictConfig = {
      icon: '🟠',
      text: 'Likely losing strategy',
      explanation: 'This setup shows a consistent negative expectancy.',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800',
      simpleAnswer: 'NO - Your strategy is losing money',
      simpleExplanation: [
        'You\'re losing money on average per trade',
        'The results show a consistent negative pattern',
        'This strategy needs to be fixed or stopped',
      ],
      whatToDo: [
        'Stop trading this strategy as-is',
        'Review your risk management',
        'Consider different entry/exit rules',
      ],
    };
  } else {
    verdictConfig = {
      icon: '🔴',
      text: 'Not statistically reliable',
      explanation: 'The results could be due to random chance.',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      simpleAnswer: 'UNCLEAR - Not enough evidence yet',
      simpleExplanation: [
        'The results could be due to random luck',
        'Not enough trades to be statistically confident',
        'Can\'t tell if your strategy really works or not',
      ],
      whatToDo: [
        'Collect more trades (aim for 50-100+)',
        'Keep tracking your results',
        'Don\'t increase risk until you have more data',
      ],
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Main Verdict - Hero Section */}
        <div className="text-center mb-8">
          <div className={`inline-block p-8 rounded-2xl ${verdictConfig.bgColor} border-2 ${verdictConfig.borderColor} mb-6`}>
            <div className="text-6xl mb-4">{verdictConfig.icon}</div>
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${verdictConfig.textColor}`}>
              {verdictConfig.simpleAnswer}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Based on {result.metrics.totalTrades} trades
            </p>
          </div>
        </div>

        {/* Quick Action Box */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">What you should do:</h2>
          <ul className="space-y-2">
            {verdictConfig.whatToDo.map((item, idx) => (
              <li key={idx} className="text-gray-700 flex items-start gap-2">
                <span className="text-gray-400 mt-1">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Key Metrics Grid - Simple & Scannable */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">💰</div>
              <div className="text-xs text-gray-600 mb-1">Expected Value</div>
              <div className={`text-xl font-bold ${result.metrics.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.metrics.expectedValue >= 0 ? '+' : ''}{result.metrics.expectedValue.toFixed(2)}R
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-xs text-gray-600 mb-1">Win Rate</div>
              <div className="text-xl font-bold text-gray-900">
                {(result.metrics.winRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">⚖️</div>
              <div className="text-xs text-gray-600 mb-1">Profit Factor</div>
              <div className="text-xl font-bold text-gray-900">
                {result.metrics.profitFactor.toFixed(2)}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">🎲</div>
              <div className="text-xs text-gray-600 mb-1">Randomness</div>
              <div className={`text-xl font-bold ${result.probabilityRandom < 0.2 ? 'text-green-600' : 'text-red-600'}`}>
                {(result.probabilityRandom * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Stability Check */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Stability Check</h2>
          {result.stabilityCheck.degradation && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800 font-medium">
                ⚠️ Performance degraded in second half
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">First Half EV</div>
              <div className={`text-xl font-bold ${result.stabilityCheck.firstHalf.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.stabilityCheck.firstHalf.expectedValue >= 0 ? '+' : ''}
                {result.stabilityCheck.firstHalf.expectedValue.toFixed(2)}R
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Second Half EV</div>
              <div className={`text-xl font-bold ${result.stabilityCheck.secondHalf.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.stabilityCheck.secondHalf.expectedValue >= 0 ? '+' : ''}
                {result.stabilityCheck.secondHalf.expectedValue.toFixed(2)}R
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Areas to Improve */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Strengths</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              {result.metrics.expectedValue > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Making money on average (+{result.metrics.expectedValue.toFixed(2)}R)</span>
                </li>
              )}
              {result.metrics.profitFactor >= 1.2 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Wins bigger than losses (PF: {result.metrics.profitFactor.toFixed(2)})</span>
                </li>
              )}
              {result.metrics.winRate >= 0.5 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Good win rate ({(result.metrics.winRate * 100).toFixed(0)}%)</span>
                </li>
              )}
              {result.probabilityRandom < 0.2 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Statistically reliable</span>
                </li>
              )}
              {result.metrics.totalTrades >= 50 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Enough data ({result.metrics.totalTrades} trades)</span>
                </li>
              )}
              {!result.stabilityCheck.degradation && result.metrics.expectedValue > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Performance stayed consistent over time</span>
                </li>
              )}
              {result.metrics.winRate < 0.5 && result.metrics.profitFactor < 1.2 && result.metrics.totalTrades < 30 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>You're tracking your trades - that's the first step!</span>
                </li>
              )}
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Areas to Improve</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              {result.metrics.expectedValue < 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Losing money on average ({result.metrics.expectedValue.toFixed(2)}R)</span>
                </li>
              )}
              {result.metrics.profitFactor < 1.0 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Losses bigger than wins</span>
                </li>
              )}
              {result.metrics.profitFactor >= 1.0 && result.metrics.profitFactor < 1.2 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Risk/reward ratio is weak - wins barely exceed losses</span>
                </li>
              )}
              {result.metrics.winRate < 0.4 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Low win rate ({(result.metrics.winRate * 100).toFixed(0)}%)</span>
                </li>
              )}
              {result.probabilityRandom >= 0.5 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Results may be random ({(result.probabilityRandom * 100).toFixed(0)}% chance) - need more trades</span>
                </li>
              )}
              {result.metrics.totalTrades < 50 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Not enough trades ({result.metrics.totalTrades}) - aim for 50-100+</span>
                </li>
              )}
              {result.stabilityCheck.degradation && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Performance got worse over time - strategy may have stopped working</span>
                </li>
              )}
              {result.metrics.winRate >= 0.6 && result.metrics.profitFactor < 1.0 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>High win rate but still losing - losses are too big when you do lose</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Trade Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Trade Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600 mb-1">Winning Trades</div>
              <div className="text-green-600 font-semibold text-lg">{result.metrics.winningTrades}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Losing Trades</div>
              <div className="text-red-600 font-semibold text-lg">{result.metrics.losingTrades}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Average Win</div>
              <div className="text-green-600 font-semibold text-lg">${result.metrics.averageWin.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Average Loss</div>
              <div className="text-red-600 font-semibold text-lg">${Math.abs(result.metrics.averageLoss).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Email Report */}
        {!emailSubmitted && session?.user?.email && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <form onSubmit={handleEmailSubmit}>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                📧 Send full report to {session.user.email}
              </button>
            </form>
          </div>
        )}

        {!emailSubmitted && !session?.user?.email && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <Link
              href="/login"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-center"
            >
              Sign in to get full report
            </Link>
          </div>
        )}

        {emailSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm text-center">
              ✅ Report sent! Check your email.
            </p>
          </div>
        )}

        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Analyze another strategy →
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
