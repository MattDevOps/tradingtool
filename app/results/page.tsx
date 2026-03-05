'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Strategy Reality Check"
                width={400}
                height={100}
                className="h-16 md:h-20 lg:h-24 w-auto"
                style={{ mixBlendMode: 'multiply' }}
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
            {/* Simple Answer Box - Most Prominent */}
            <div className={`p-8 rounded-xl border-2 ${verdictConfig.bgColor} ${verdictConfig.borderColor} shadow-lg mb-6`}>
              <div className="text-center mb-6">
                <p className={`text-5xl mb-4`}>
                  {verdictConfig.icon}
                </p>
                <p className={`text-4xl md:text-5xl font-bold mb-4 ${verdictConfig.textColor}`}>
                  {verdictConfig.simpleAnswer}
                </p>
                <div className="inline-block px-4 py-2 bg-white/60 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700">
                    Based on <span className="text-indigo-600">{result.metrics.totalTrades}</span> trades
                  </p>
                </div>
              </div>

              {/* Simple Explanation */}
              <div className="bg-white/60 rounded-xl p-6 mb-4">
                <p className="font-bold text-gray-900 mb-3 text-lg">What this means:</p>
                <ul className="space-y-2 text-left">
                  {verdictConfig.simpleExplanation.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What to Do */}
              <div className="bg-white/60 rounded-xl p-6">
                <p className="font-bold text-gray-900 mb-3 text-lg">What you should do:</p>
                <ul className="space-y-2 text-left">
                  {verdictConfig.whatToDo.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-indigo-600 mt-1">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Technical Verdict Box - For those who want details */}
            <div className={`p-6 rounded-xl border ${verdictConfig.bgColor} ${verdictConfig.borderColor} shadow-sm mb-6`}>
              <div className="text-center">
                <p className={`text-sm font-semibold uppercase tracking-wide ${verdictConfig.textColor} mb-2`}>
                  Technical Verdict
                </p>
                <p className={`text-xl font-bold ${verdictConfig.textColor}`}>
                  {verdictConfig.text}
                </p>
                <p className={`text-sm ${verdictConfig.textColor} opacity-90 mt-2`}>
                  {verdictConfig.explanation}
                </p>
              </div>
            </div>

            {/* Key Metrics - With Detailed Explanations */}
            <div className="space-y-4 pt-4">
              {/* Expected Value */}
              <div className="bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200/50 p-5">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <span className="text-gray-800 font-semibold">Expected Value (EV):</span>
                  </div>
                  <span className={`text-3xl font-bold ${result.metrics.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.metrics.expectedValue >= 0 ? '+' : ''}
                    {result.metrics.expectedValue.toFixed(2)}R
                  </span>
                </div>
                <div className="ml-11 space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong className="text-gray-800">What it means:</strong> How much you make (or lose) on average per trade, normalized by your average loss.
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong className="text-gray-800">What "R" means:</strong> "R" = your average loss. So +0.50R means you make 50% of your average loss per trade.
                  </p>
                  {result.metrics.expectedValue >= 0.5 ? (
                    <p className="text-sm text-green-700 font-medium bg-green-50 p-2 rounded">
                      ✅ <strong>Excellent!</strong> You're making good money per trade. This is a strong edge.
                    </p>
                  ) : result.metrics.expectedValue >= 0.2 ? (
                    <p className="text-sm text-blue-700 font-medium bg-blue-50 p-2 rounded">
                      ✅ <strong>Good!</strong> You're profitable, but could be better. Consider improving your win rate or risk/reward.
                    </p>
                  ) : result.metrics.expectedValue >= 0 ? (
                    <p className="text-sm text-yellow-700 font-medium bg-yellow-50 p-2 rounded">
                      ⚠️ <strong>Barely profitable.</strong> You're making money but very slowly. Your losses might be too big compared to wins.
                    </p>
                  ) : (
                    <p className="text-sm text-red-700 font-medium bg-red-50 p-2 rounded">
                      ❌ <strong>Losing money.</strong> You're losing on average per trade. Your strategy needs major changes.
                    </p>
                  )}
                </div>
              </div>

              {/* Win Rate */}
              <div className="bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200/50 p-5">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <span className="text-gray-800 font-semibold">Win Rate:</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {(result.metrics.winRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="ml-11 space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong className="text-gray-800">What it means:</strong> Percentage of trades that were winners.
                  </p>
                  {result.metrics.winRate >= 0.6 ? (
                    <p className="text-sm text-green-700 font-medium bg-green-50 p-2 rounded">
                      ✅ <strong>High win rate!</strong> You win most trades. But check your profit factor - are your losses bigger than wins?
                    </p>
                  ) : result.metrics.winRate >= 0.5 ? (
                    <p className="text-sm text-blue-700 font-medium bg-blue-50 p-2 rounded">
                      ✅ <strong>Good win rate.</strong> You win more than you lose. Make sure your average win is bigger than average loss.
                    </p>
                  ) : result.metrics.winRate >= 0.4 ? (
                    <p className="text-sm text-yellow-700 font-medium bg-yellow-50 p-2 rounded">
                      ⚠️ <strong>Low win rate.</strong> You lose more often than you win. You need bigger wins to compensate (check profit factor).
                    </p>
                  ) : (
                    <p className="text-sm text-red-700 font-medium bg-red-50 p-2 rounded">
                      ❌ <strong>Very low win rate.</strong> You're losing most trades. This strategy likely doesn't work.
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    <p>Winning trades: <span className="text-green-600 font-semibold">{result.metrics.winningTrades}</span> | 
                    Losing trades: <span className="text-red-600 font-semibold">{result.metrics.losingTrades}</span></p>
                  </div>
                </div>
              </div>

              {/* Profit Factor */}
              <div className="bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200/50 p-5">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚖️</span>
                    <span className="text-gray-800 font-semibold">Profit Factor:</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {result.metrics.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="ml-11 space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong className="text-gray-800">What it means:</strong> Total profits ÷ total losses. Shows if your wins are bigger than losses.
                  </p>
                  {result.metrics.profitFactor >= 2.0 ? (
                    <p className="text-sm text-green-700 font-medium bg-green-50 p-2 rounded">
                      ✅ <strong>Excellent!</strong> Your wins are much bigger than losses. This is a strong pattern.
                    </p>
                  ) : result.metrics.profitFactor >= 1.5 ? (
                    <p className="text-sm text-blue-700 font-medium bg-blue-50 p-2 rounded">
                      ✅ <strong>Good!</strong> Your wins are noticeably bigger than losses. Keep this up.
                    </p>
                  ) : result.metrics.profitFactor >= 1.2 ? (
                    <p className="text-sm text-yellow-700 font-medium bg-yellow-50 p-2 rounded">
                      ⚠️ <strong>Marginal.</strong> Your wins are only slightly bigger than losses. Consider cutting losses faster or letting winners run more.
                    </p>
                  ) : result.metrics.profitFactor >= 1.0 ? (
                    <p className="text-sm text-orange-700 font-medium bg-orange-50 p-2 rounded">
                      ⚠️ <strong>Barely breaking even.</strong> Your wins and losses are about equal. You need better risk/reward.
                    </p>
                  ) : (
                    <p className="text-sm text-red-700 font-medium bg-red-50 p-2 rounded">
                      ❌ <strong>Losing pattern.</strong> Your losses are bigger than wins. This is why you're losing money.
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    <p>Average win: <span className="text-green-600 font-semibold">${result.metrics.averageWin.toFixed(2)}</span> | 
                    Average loss: <span className="text-red-600 font-semibold">${Math.abs(result.metrics.averageLoss).toFixed(2)}</span></p>
                  </div>
                </div>
              </div>

              {/* Probability of Randomness */}
              <div className="bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl border border-gray-200/50 p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🎲</span>
                      <span className="text-gray-800 font-semibold">Probability of Randomness:</span>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 ml-4">
                    {(result.probabilityRandom * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="ml-11 space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong className="text-gray-800">What it means:</strong> Chance that your results are just luck, not a real edge. Lower is better.
                  </p>
                  {result.probabilityRandom < 0.1 ? (
                    <p className="text-sm text-green-700 font-medium bg-green-50 p-2 rounded">
                      ✅ <strong>Very reliable!</strong> Less than 10% chance it's luck. Your edge is statistically strong.
                    </p>
                  ) : result.probabilityRandom < 0.2 ? (
                    <p className="text-sm text-blue-700 font-medium bg-blue-50 p-2 rounded">
                      ✅ <strong>Reliable.</strong> Less than 20% chance it's luck. This looks like a real edge.
                    </p>
                  ) : result.probabilityRandom < 0.5 ? (
                    <p className="text-sm text-yellow-700 font-medium bg-yellow-50 p-2 rounded">
                      ⚠️ <strong>Uncertain.</strong> 20-50% chance it's luck. Need more trades to be confident.
                    </p>
                  ) : (
                    <p className="text-sm text-red-700 font-medium bg-red-50 p-2 rounded">
                      ❌ <strong>Very uncertain.</strong> More than 50% chance it's just luck. Can't tell if your strategy works.
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Note:</strong> Below 20% usually indicates a real edge. You need more trades to be confident.
                  </p>
                </div>
              </div>

              {/* Trade Count Feedback */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 rounded-xl border-2 border-blue-200/50 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📈</span>
                  <span className="text-gray-800 font-semibold">Are You Trading Enough?</span>
                </div>
                <div className="space-y-2">
                  {result.metrics.totalTrades >= 100 ? (
                    <p className="text-sm text-green-700 font-medium">
                      ✅ <strong>Yes!</strong> With {result.metrics.totalTrades} trades, you have enough data for reliable analysis.
                    </p>
                  ) : result.metrics.totalTrades >= 50 ? (
                    <p className="text-sm text-blue-700 font-medium">
                      ✅ <strong>Good amount.</strong> {result.metrics.totalTrades} trades is decent, but 100+ would be more reliable.
                    </p>
                  ) : result.metrics.totalTrades >= 30 ? (
                    <p className="text-sm text-yellow-700 font-medium">
                      ⚠️ <strong>Getting there.</strong> {result.metrics.totalTrades} trades is okay, but aim for 50-100+ for better confidence.
                    </p>
                  ) : (
                    <p className="text-sm text-orange-700 font-medium">
                      ⚠️ <strong>Not enough yet.</strong> With only {result.metrics.totalTrades} trades, it's hard to tell if your strategy really works. Aim for at least 50-100 trades.
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Why it matters:</strong> More trades = more confidence. With fewer trades, results could be random luck.
                  </p>
                </div>
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

            {/* What You Did Well / What Needs Improvement */}
            <div className="pt-6 border-t-2 border-gray-200">
              <div className="grid md:grid-cols-2 gap-6">
                {/* What You Did Well */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200/50 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">✅</span>
                    <h3 className="text-lg font-bold text-green-900">What You Did Well</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.metrics.winRate >= 0.5 && (
                      <li className="text-sm text-green-800 flex items-start gap-2">
                        <span>•</span>
                        <span>You win more trades than you lose ({((result.metrics.winRate * 100).toFixed(1))}% win rate)</span>
                      </li>
                    )}
                    {result.metrics.profitFactor >= 1.2 && (
                      <li className="text-sm text-green-800 flex items-start gap-2">
                        <span>•</span>
                        <span>Your average win (${result.metrics.averageWin.toFixed(2)}) is bigger than average loss (${Math.abs(result.metrics.averageLoss).toFixed(2)})</span>
                      </li>
                    )}
                    {result.metrics.expectedValue > 0 && (
                      <li className="text-sm text-green-800 flex items-start gap-2">
                        <span>•</span>
                        <span>You're making money on average per trade (+{result.metrics.expectedValue.toFixed(2)}R)</span>
                      </li>
                    )}
                    {result.probabilityRandom < 0.3 && (
                      <li className="text-sm text-green-800 flex items-start gap-2">
                        <span>•</span>
                        <span>Your results are statistically reliable (not just luck)</span>
                      </li>
                    )}
                    {result.metrics.totalTrades >= 50 && (
                      <li className="text-sm text-green-800 flex items-start gap-2">
                        <span>•</span>
                        <span>You have enough trades ({result.metrics.totalTrades}) for meaningful analysis</span>
                      </li>
                    )}
                    {!result.stabilityCheck.degradation && result.metrics.expectedValue > 0 && (
                      <li className="text-sm text-green-800 flex items-start gap-2">
                        <span>•</span>
                        <span>Your performance stayed consistent over time</span>
                      </li>
                    )}
                    {result.metrics.winRate < 0.5 && result.metrics.profitFactor < 1.2 && result.metrics.totalTrades < 30 && (
                      <li className="text-sm text-green-800 flex items-start gap-2">
                        <span>•</span>
                        <span>You're tracking your trades - that's the first step to improvement!</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* What Needs Improvement */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200/50 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="text-lg font-bold text-orange-900">What Needs Improvement</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.metrics.expectedValue < 0 && (
                      <li className="text-sm text-orange-800 flex items-start gap-2">
                        <span>•</span>
                        <span>You're losing money on average ({result.metrics.expectedValue.toFixed(2)}R per trade)</span>
                      </li>
                    )}
                    {result.metrics.profitFactor < 1.0 && (
                      <li className="text-sm text-orange-800 flex items-start gap-2">
                        <span>•</span>
                        <span>Your losses (${Math.abs(result.metrics.averageLoss).toFixed(2)}) are bigger than wins (${result.metrics.averageWin.toFixed(2)})</span>
                      </li>
                    )}
                    {result.metrics.profitFactor >= 1.0 && result.metrics.profitFactor < 1.2 && (
                      <li className="text-sm text-orange-800 flex items-start gap-2">
                        <span>•</span>
                        <span>Your risk/reward ratio is weak - wins barely exceed losses</span>
                      </li>
                    )}
                    {result.metrics.winRate < 0.4 && (
                      <li className="text-sm text-orange-800 flex items-start gap-2">
                        <span>•</span>
                        <span>You're losing too many trades (only {((result.metrics.winRate * 100).toFixed(1))}% win rate)</span>
                      </li>
                    )}
                    {result.probabilityRandom >= 0.5 && (
                      <li className="text-sm text-orange-800 flex items-start gap-2">
                        <span>•</span>
                        <span>Results could be random luck ({(result.probabilityRandom * 100).toFixed(1)}% chance) - need more trades</span>
                      </li>
                    )}
                    {result.metrics.totalTrades < 50 && (
                      <li className="text-sm text-orange-800 flex items-start gap-2">
                        <span>•</span>
                        <span>Not enough trades ({result.metrics.totalTrades}) - aim for 50-100+ for reliable results</span>
                      </li>
                    )}
                    {result.stabilityCheck.degradation && (
                      <li className="text-sm text-orange-800 flex items-start gap-2">
                        <span>•</span>
                        <span>Performance got worse over time - strategy may have stopped working</span>
                      </li>
                    )}
                    {result.metrics.winRate >= 0.6 && result.metrics.profitFactor < 1.0 && (
                      <li className="text-sm text-orange-800 flex items-start gap-2">
                        <span>•</span>
                        <span>High win rate but still losing - your losses are too big when you do lose</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
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
        {!emailSubmitted && session?.user?.email && (
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-soft p-8 mb-6">
            <div className="text-center mb-6">
              <span className="text-4xl mb-3 block">📧</span>
              <p className="text-xl font-bold text-gray-900 mb-2">
                Get your full report
              </p>
              <p className="text-sm text-gray-600">
                Detailed breakdown delivered to {session.user.email}
              </p>
            </div>
            <form onSubmit={handleEmailSubmit} className="flex gap-3 mb-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Send Report to {session.user.email}
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

        {!emailSubmitted && !session?.user?.email && (
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-soft p-8 mb-6">
            <div className="text-center mb-6">
              <span className="text-4xl mb-3 block">📧</span>
              <p className="text-xl font-bold text-gray-900 mb-2">
                Get your full report
              </p>
              <p className="text-sm text-gray-600">
                Sign in to receive your detailed report via email
              </p>
            </div>
            <div className="flex gap-3 mb-4">
              <Link
                href="/login"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 text-center"
              >
                Sign In to Get Report
              </Link>
            </div>
            <p className="text-xs text-gray-600 text-center">
              Don't have an account?{' '}
              <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 underline font-semibold">
                Sign up →
              </Link>
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
