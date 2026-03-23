'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface EquityCurvePoint {
  tradeNumber: number;
  cumulativeR: number;
  pnl: number;
}

interface TradeDistributionBucket {
  range: string;
  count: number;
  isPositive: boolean;
}

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
  confidence: number;
  stabilityCheck: {
    firstHalf: {
      expectedValue: number;
    };
    secondHalf: {
      expectedValue: number;
    };
    degradation: boolean;
  };
  equityCurve: EquityCurvePoint[];
  tradeDistribution: TradeDistributionBucket[];
}

// ── SVG Equity Curve Chart ──────────────────────────────────────────
function EquityCurveChart({ data }: { data: EquityCurvePoint[] }) {
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => d.cumulativeR);
  const minY = Math.min(0, ...values);
  const maxY = Math.max(0, ...values);
  const rangeY = maxY - minY || 1;

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
  const yScale = (v: number) => padding.top + chartHeight - ((v - minY) / rangeY) * chartHeight;

  // Build path
  const pathD = data.map((d, i) => {
    const x = xScale(i);
    const y = yScale(d.cumulativeR);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Area fill under the curve
  const lastIdx = data.length - 1;
  const finalValue = data[lastIdx]?.cumulativeR ?? 0;
  const isPositive = finalValue >= 0;
  const zeroY = yScale(0);

  const areaD = pathD + ` L ${xScale(lastIdx)} ${zeroY} L ${xScale(0)} ${zeroY} Z`;

  // Midpoint line for zero
  const midLabel = minY < 0 && maxY > 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const y = padding.top + frac * chartHeight;
        const val = maxY - frac * rangeY;
        return (
          <g key={frac}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-gray-400" fontSize={10}>
              {val.toFixed(1)}R
            </text>
          </g>
        );
      })}

      {/* Zero line */}
      {midLabel && (
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 4" />
      )}

      {/* Area fill */}
      <path d={areaD} fill={isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={isPositive ? '#16a34a' : '#dc2626'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* End dot */}
      {data.length > 0 && (
        <circle cx={xScale(lastIdx)} cy={yScale(finalValue)} r={4} fill={isPositive ? '#16a34a' : '#dc2626'} />
      )}

      {/* X axis label */}
      <text x={width / 2} y={height - 4} textAnchor="middle" className="fill-gray-400" fontSize={10}>
        Trade #
      </text>
    </svg>
  );
}

// ── Trade Distribution Bar Chart ────────────────────────────────────
function TradeDistributionChart({ data }: { data: TradeDistributionBucket[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-1.5">
      {data.map((bucket, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <div className="w-20 text-right text-gray-500 dark:text-gray-400 font-mono shrink-0">{bucket.range}</div>
          <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${bucket.isPositive ? 'bg-green-500' : 'bg-red-400'}`}
              style={{ width: `${(bucket.count / maxCount) * 100}%` }}
            />
          </div>
          <div className="w-6 text-gray-600 dark:text-gray-400 font-medium">{bucket.count}</div>
        </div>
      ))}
    </div>
  );
}

// ── Stability Bar Chart ─────────────────────────────────────────────
function StabilityChart({ firstHalfEV, secondHalfEV }: { firstHalfEV: number; secondHalfEV: number }) {
  const maxAbs = Math.max(Math.abs(firstHalfEV), Math.abs(secondHalfEV), 0.1);
  const barWidth = (val: number) => `${Math.min((Math.abs(val) / maxAbs) * 100, 100)}%`;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">First Half</span>
          <span className={`text-sm font-bold ${firstHalfEV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {firstHalfEV >= 0 ? '+' : ''}{firstHalfEV.toFixed(2)}R
          </span>
        </div>
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${firstHalfEV >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
            style={{ width: barWidth(firstHalfEV) }}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Second Half</span>
          <span className={`text-sm font-bold ${secondHalfEV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {secondHalfEV >= 0 ? '+' : ''}{secondHalfEV.toFixed(2)}R
          </span>
        </div>
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${secondHalfEV >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
            style={{ width: barWidth(secondHalfEV) }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Confidence Ring ─────────────────────────────────────────────────
function ConfidenceRing({ confidence, size = 120 }: { confidence: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (confidence / 100) * circumference;

  const color = confidence >= 70 ? '#16a34a' : confidence >= 40 ? '#f59e0b' : '#dc2626';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference - progress}`} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{confidence}%</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">confidence</span>
      </div>
    </div>
  );
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
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => {
    if (!resultId || !uploadId) {
      router.push('/upload');
      return;
    }

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

  const handleSendReport = async () => {
    if (!resultId) return;
    try {
      const res = await fetch('/api/auth/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId }),
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Crunching numbers...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-300">{error || 'Failed to load results'}</p>
            <button
              onClick={() => router.push('/upload')}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Verdict Config ──────────────────────────────────────────────
  let verdictConfig: {
    icon: string;
    headline: string;
    subtext: string;
    bgGradient: string;
    borderColor: string;
    textColor: string;
    badgeColor: string;
    whatToDo: string[];
  };

  if (result.verdict === 'LIKELY_POSITIVE_EDGE') {
    verdictConfig = {
      icon: '✅',
      headline: 'Your strategy likely HAS a real edge',
      subtext: 'Your results are statistically significant — this is unlikely to be luck.',
      bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30',
      borderColor: 'border-green-300 dark:border-green-700',
      textColor: 'text-green-800 dark:text-green-300',
      badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      whatToDo: [
        'Keep trading this strategy consistently',
        'Consider gradually increasing position size',
        'Continue tracking and re-test monthly',
      ],
    };
  } else if (result.verdict === 'LIKELY_NEGATIVE_EDGE') {
    verdictConfig = {
      icon: '⚠️',
      headline: 'Your strategy is losing money',
      subtext: 'The data shows a consistent negative pattern — this needs to change.',
      bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30',
      borderColor: 'border-orange-300 dark:border-orange-700',
      textColor: 'text-orange-800 dark:text-orange-300',
      badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
      whatToDo: [
        'Stop trading this strategy as-is',
        'Review your risk management and stop losses',
        'Consider different entry/exit rules or a new approach',
      ],
    };
  } else {
    verdictConfig = {
      icon: '🔍',
      headline: 'Not enough evidence yet',
      subtext: 'We can\'t tell if this is skill or luck — you need more trades.',
      bgGradient: 'from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30',
      borderColor: 'border-gray-300 dark:border-gray-700',
      textColor: 'text-gray-800 dark:text-gray-200',
      badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200',
      whatToDo: [
        'Collect more trades (aim for 50–100+)',
        'Keep tracking your results consistently',
        'Don\'t increase risk until you have more data',
      ],
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            ← Back to home
          </Link>
          <Link
            href={`/rule-builder?uploadId=${uploadId}`}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            Test another strategy →
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* ── HERO VERDICT ─────────────────────────────────────────── */}
        <div className={`bg-gradient-to-br ${verdictConfig.bgGradient} border-2 ${verdictConfig.borderColor} rounded-2xl p-8 md:p-10 mb-8 text-center`}>
          <div className="text-6xl mb-4">{verdictConfig.icon}</div>
          <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${verdictConfig.textColor}`}>
            {verdictConfig.headline}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 max-w-xl mx-auto">
            {verdictConfig.subtext}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <ConfidenceRing confidence={result.confidence} />
            <div className="text-left space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${verdictConfig.badgeColor}`}>
                  {result.metrics.totalTrades} trades analyzed
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Expected Value: <span className={`font-bold ${result.metrics.expectedValue >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {result.metrics.expectedValue >= 0 ? '+' : ''}{result.metrics.expectedValue.toFixed(2)}R
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Win Rate: <span className="font-bold text-gray-900 dark:text-gray-100">{(result.metrics.winRate * 100).toFixed(1)}%</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Profit Factor: <span className="font-bold text-gray-900 dark:text-gray-100">{result.metrics.profitFactor.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── WHAT TO DO NEXT ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span>💡</span> What you should do next
          </h2>
          <ul className="space-y-2">
            {verdictConfig.whatToDo.map((item, idx) => (
              <li key={idx} className="text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5 font-bold">{idx + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── EQUITY CURVE ─────────────────────────────────────────── */}
        {result.equityCurve && result.equityCurve.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <span>📈</span> Equity Curve
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Cumulative performance in R-multiples across all trades</p>
            <EquityCurveChart data={result.equityCurve} />
          </div>
        )}

        {/* ── KEY METRICS GRID ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span>📊</span> Key Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Value</div>
              <div className={`text-xl font-bold ${result.metrics.expectedValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.metrics.expectedValue >= 0 ? '+' : ''}{result.metrics.expectedValue.toFixed(2)}R
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">avg $ per trade (in risk units)</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Win Rate</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {(result.metrics.winRate * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">% of trades that were profitable</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit Factor</div>
              <div className={`text-xl font-bold ${result.metrics.profitFactor >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                {result.metrics.profitFactor.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">total wins ÷ total losses</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Luck Probability</div>
              <div className={`text-xl font-bold ${result.probabilityRandom < 0.2 ? 'text-green-600' : result.probabilityRandom < 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                {(result.probabilityRandom * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">chance results are random</div>
            </div>
          </div>
        </div>

        {/* ── TRADE DISTRIBUTION ───────────────────────────────────── */}
        {result.tradeDistribution && result.tradeDistribution.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <span>📊</span> Trade Distribution
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">How your trades are distributed by size (in R-multiples)</p>
            <TradeDistributionChart data={result.tradeDistribution} />
          </div>
        )}

        {/* ── STRATEGY STABILITY ───────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
            <span>📉</span> Strategy Stability
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Comparing first half vs second half of your trades</p>
          {result.stabilityCheck.degradation && (
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                ⚠️ Performance got worse in the second half — your strategy may be degrading
              </p>
            </div>
          )}
          {!result.stabilityCheck.degradation && result.metrics.expectedValue > 0 && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                ✅ Performance stayed consistent — good sign of a stable strategy
              </p>
            </div>
          )}
          <StabilityChart
            firstHalfEV={result.stabilityCheck.firstHalf.expectedValue}
            secondHalfEV={result.stabilityCheck.secondHalf.expectedValue}
          />
        </div>

        {/* ── STRENGTHS & WEAKNESSES ───────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>💪</span> What You Did Well
            </h2>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {result.metrics.expectedValue > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Making money on average (+{result.metrics.expectedValue.toFixed(2)}R per trade)</span>
                </li>
              )}
              {result.metrics.profitFactor >= 1.2 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Winners are bigger than losers (PF: {result.metrics.profitFactor.toFixed(2)})</span>
                </li>
              )}
              {result.metrics.winRate >= 0.5 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Winning more often than losing ({(result.metrics.winRate * 100).toFixed(0)}% win rate)</span>
                </li>
              )}
              {result.probabilityRandom < 0.2 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Results are statistically significant — not random luck</span>
                </li>
              )}
              {result.metrics.totalTrades >= 50 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Good sample size ({result.metrics.totalTrades} trades)</span>
                </li>
              )}
              {!result.stabilityCheck.degradation && result.metrics.expectedValue > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Consistent performance over time</span>
                </li>
              )}
              {/* Fallback if nothing else matches */}
              {result.metrics.expectedValue <= 0 && result.metrics.profitFactor < 1.2 && result.metrics.winRate < 0.5 && result.metrics.totalTrades < 50 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>You're tracking your trades — that's the first step to improving</span>
                </li>
              )}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>🔧</span> What Needs Work
            </h2>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {result.metrics.expectedValue < 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Losing money on average ({result.metrics.expectedValue.toFixed(2)}R per trade)</span>
                </li>
              )}
              {result.metrics.profitFactor < 1.0 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Losses are larger than wins — tighten stop losses</span>
                </li>
              )}
              {result.metrics.profitFactor >= 1.0 && result.metrics.profitFactor < 1.2 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Risk/reward is tight — wins barely exceed losses</span>
                </li>
              )}
              {result.metrics.winRate < 0.4 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Low win rate ({(result.metrics.winRate * 100).toFixed(0)}%) — review entry criteria</span>
                </li>
              )}
              {result.probabilityRandom >= 0.5 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Results may be random ({(result.probabilityRandom * 100).toFixed(0)}% chance) — need more data</span>
                </li>
              )}
              {result.metrics.totalTrades < 50 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Not enough trades yet ({result.metrics.totalTrades}) — aim for 50–100+</span>
                </li>
              )}
              {result.stabilityCheck.degradation && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Performance degrading — strategy may be losing its edge</span>
                </li>
              )}
              {result.metrics.winRate >= 0.6 && result.metrics.profitFactor < 1.0 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>High win rate but still losing — your losers are too big</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* ── TRADE BREAKDOWN ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Trade Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-1">Winning Trades</div>
              <div className="text-green-600 font-bold text-lg">{result.metrics.winningTrades}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-1">Losing Trades</div>
              <div className="text-red-600 font-bold text-lg">{result.metrics.losingTrades}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-1">Average Win</div>
              <div className="text-green-600 font-bold text-lg">${result.metrics.averageWin.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-1">Average Loss</div>
              <div className="text-red-600 font-bold text-lg">${Math.abs(result.metrics.averageLoss).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* ── EMAIL REPORT ─────────────────────────────────────────── */}
        {!emailSubmitted && session?.user?.email && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-2 border-indigo-200 dark:border-indigo-700 rounded-xl p-6 mb-6">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">📧 Get your full strategy report</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Detailed stats, stability analysis, and actionable insights — straight to your inbox.</p>
            <button
              onClick={handleSendReport}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Send report to {session.user.email}
            </button>
          </div>
        )}

        {!emailSubmitted && !session?.user?.email && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-2 border-indigo-200 dark:border-indigo-700 rounded-xl p-6 mb-6">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">📧 Get your full strategy report</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Sign in to get detailed stats, stability analysis, and a downloadable report emailed to you.</p>
            <Link
              href="/login"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-center"
            >
              Sign in to unlock full report
            </Link>
          </div>
        )}

        {emailSubmitted && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-300 text-sm text-center font-medium">
              ✅ Report sent! Check your email.
            </p>
          </div>
        )}

        {/* ── InsightTrader CTA ────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl mb-6 border border-white/10">
          {/* Background with subtle animated gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-gray-900 to-purple-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(168,85,247,0.1),_transparent_60%)]" />

          <div className="relative px-6 py-8 md:px-10 md:py-10">
            {/* Top badge */}
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                Coming Soon
              </span>
            </div>

            {/* Headline — contextual to their results */}
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3 leading-tight">
              {result.verdict === 'LIKELY_POSITIVE_EDGE'
                ? 'You found an edge. Now protect it.'
                : result.verdict === 'LIKELY_NEGATIVE_EDGE'
                ? 'Turn insights into a better strategy.'
                : 'Go deeper with every trade you take.'}
            </h2>
            <p className="text-gray-400 text-center text-sm md:text-base max-w-xl mx-auto mb-8">
              {result.verdict === 'LIKELY_POSITIVE_EDGE'
                ? 'Track whether your edge holds over time with continuous monitoring, journaling, and pattern detection.'
                : result.verdict === 'LIKELY_NEGATIVE_EDGE'
                ? 'Identify exactly where your strategy breaks down and discover the patterns behind your best and worst trades.'
                : 'Build statistical confidence faster with advanced analytics designed for serious traders.'}
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="text-white font-semibold text-sm mb-1">Live Edge Tracking</h3>
                <p className="text-gray-500 text-xs leading-relaxed">Monitor your strategy&apos;s edge in real-time as you add new trades.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                <div className="text-2xl mb-2">🔍</div>
                <h3 className="text-white font-semibold text-sm mb-1">Pattern Detection</h3>
                <p className="text-gray-500 text-xs leading-relaxed">Automatically surface what&apos;s working and what&apos;s costing you money.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                <div className="text-2xl mb-2">📓</div>
                <h3 className="text-white font-semibold text-sm mb-1">Trade Journal</h3>
                <p className="text-gray-500 text-xs leading-relaxed">Log context, emotions, and setups — then see what actually matters.</p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <a
                href={process.env.NEXT_PUBLIC_EXTERNAL_LINK_URL || 'https://insighttrader.io'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
              >
                Join the InsightTrader waitlist
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <p className="text-gray-600 text-xs mt-3">Be first to get access when we launch.</p>
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS ───────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <Link
            href={`/rule-builder?uploadId=${uploadId}`}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            Test another strategy →
          </Link>
          <Link
            href="/upload"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Upload new trades
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
