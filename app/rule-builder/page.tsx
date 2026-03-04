'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useDebounce } from '@/lib/hooks';

interface SymbolStat {
  symbol: string;
  count: number;
}

interface StrategyRuleState {
  symbol: string | null;
  direction: 'LONG' | 'SHORT' | 'BOTH';
  startDate: string | null;
  endDate: string | null;
  maxHoldingMinutes: number | null;
}

function StrategyCheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get('uploadId');

  const [rule, setRule] = useState<StrategyRuleState>({
    symbol: null,
    direction: 'BOTH',
    startDate: null,
    endDate: null,
    maxHoldingMinutes: null,
  });

  const [symbols, setSymbols] = useState<SymbolStat[]>([]);
  const [totalTrades, setTotalTrades] = useState<number>(0);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [matchBreakdown, setMatchBreakdown] = useState<{ longs: number; shorts: number } | null>(null);
  const [previewTrades, setPreviewTrades] = useState<Array<{ date: string; symbol: string; side: string; pnl: number; rMultiple: string }>>([]);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Debounce rule changes for preview count
  const debouncedRule = useDebounce(rule, 400);

  useEffect(() => {
    if (!uploadId) {
      router.push('/upload');
    }
  }, [uploadId, router]);

  // Fetch symbols list
  useEffect(() => {
    if (!uploadId) return;

    setIsLoadingSymbols(true);
    
    // Check sessionStorage first (for temp uploads)
    const cachedSymbols = sessionStorage.getItem(`upload-${uploadId}-symbols`);
    if (cachedSymbols) {
      try {
        const symbols = JSON.parse(cachedSymbols);
        setSymbols(symbols);
        const total = symbols.reduce((sum: number, s: SymbolStat) => sum + (s.count || 0), 0);
        setTotalTrades(total);
        setIsLoadingSymbols(false);
        return;
      } catch (e) {
        // Fall through to API fetch
      }
    }
    
    // Fetch from API (for DB-backed uploads)
    fetch(`/api/uploads/${uploadId}/symbols`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSymbols(data);
          const total = data.reduce((sum, s) => sum + s.count, 0);
          setTotalTrades(total);
        }
      })
      .catch(err => {
        console.error('Error fetching symbols:', err);
        setError('Failed to load symbols');
      })
      .finally(() => {
        setIsLoadingSymbols(false);
      });
  }, [uploadId]);

  // Fetch preview count and sample trades when rule changes
  useEffect(() => {
    if (!uploadId) return;

    setIsLoadingCount(true);
    
    // Fetch count and breakdown
    fetch('/api/strategy/preview-count', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId,
        rule: {
          instrument: rule.symbol || undefined,
          direction: rule.direction,
          timeWindowStart: undefined,
          timeWindowEnd: undefined,
          maxHoldingTime: rule.maxHoldingMinutes || undefined,
          startDate: rule.startDate || undefined,
          endDate: rule.endDate || undefined,
        },
      }),
    })
      .then(res => res.json())
      .then(data => {
        setMatchCount(data.count ?? 0);
      })
      .catch(err => {
        console.error('Error fetching preview count:', err);
        setMatchCount(null);
      });

    // Fetch sample trades and breakdown
    fetch('/api/strategy/preview-trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId,
        rule: {
          instrument: rule.symbol || undefined,
          direction: rule.direction,
          timeWindowStart: undefined,
          timeWindowEnd: undefined,
          maxHoldingTime: rule.maxHoldingMinutes || undefined,
          startDate: rule.startDate || undefined,
          endDate: rule.endDate || undefined,
        },
        limit: 5,
      }),
    })
      .then(res => res.json())
      .then(data => {
        setPreviewTrades(data.trades || []);
        setMatchBreakdown({
          longs: data.longs || 0,
          shorts: data.shorts || 0,
        });
      })
      .catch(err => {
        console.error('Error fetching preview trades:', err);
        setPreviewTrades([]);
        setMatchBreakdown(null);
      })
      .finally(() => {
        setIsLoadingCount(false);
      });
  }, [uploadId, debouncedRule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadId) return;

    if (matchCount === 0) {
      setError('No trades match this rule. Please adjust your filters.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          rule: {
            instrument: rule.symbol || undefined,
            direction: rule.direction,
            timeWindowStart: undefined,
            timeWindowEnd: undefined,
            maxHoldingTime: rule.maxHoldingMinutes || undefined,
            startDate: rule.startDate || undefined,
            endDate: rule.endDate || undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Redirect to results page
      router.push(`/results?resultId=${data.resultId}&uploadId=${uploadId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze strategy');
    } finally {
      setAnalyzing(false);
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
        {/* ThinkOrSwim limitation notice */}
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/50 rounded-xl shadow-soft">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <p className="text-sm text-indigo-900">
              <span className="font-semibold">Currently supports ThinkOrSwim trade statements.</span> More brokers coming soon.
            </p>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Define your strategy
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Filter your trades to test a specific setup. All fields are optional—leave them blank to analyze everything.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-soft">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 md:p-10 shadow-soft">
          <div className="space-y-8">
            {/* Instrument Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-lg">📈</span>
                <span>Which instrument?</span>
                <span className="text-xs font-normal text-gray-500">(optional)</span>
              </label>
              <select
                value={rule.symbol || ''}
                onChange={(e) => setRule({ ...rule, symbol: e.target.value || null })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-medium transition-all shadow-sm hover:shadow-md"
                disabled={isLoadingSymbols}
              >
                <option value="" className="text-gray-900">
                  {isLoadingSymbols ? 'Loading instruments...' : 'All instruments'}
                </option>
                {symbols.map((stat) => (
                  <option key={stat.symbol} value={stat.symbol} className="text-gray-900">
                    {stat.symbol}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2 ml-1">
                Choose a specific ticker or analyze all instruments together
              </p>
            </div>

            {/* Direction Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-lg">↕️</span>
                <span>Trade direction</span>
                <span className="text-xs font-normal text-gray-500">(optional)</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRule({ ...rule, direction: 'LONG' })}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                    rule.direction === 'LONG'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                  }`}
                >
                  Long only
                </button>
                <button
                  type="button"
                  onClick={() => setRule({ ...rule, direction: 'SHORT' })}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                    rule.direction === 'SHORT'
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                  }`}
                >
                  Short only
                </button>
                <button
                  type="button"
                  onClick={() => setRule({ ...rule, direction: 'BOTH' })}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                    rule.direction === 'BOTH'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                  }`}
                >
                  Both
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-1">
                Filter by long positions, short positions, or include both
              </p>
            </div>

            {/* Live Preview - Redesigned */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200/50 rounded-xl p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔍</span>
                <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
              </div>
              
              {isLoadingCount ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div>
                  <span className="text-sm">Calculating matches...</span>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Based on your current filters:
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {matchCount !== null ? matchCount : '—'}
                      </span>
                      <span className="text-lg text-gray-600 font-medium">trades will be analyzed</span>
                    </div>
                    {matchBreakdown && matchCount !== null && matchCount > 0 && (
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="text-gray-700 font-medium">{matchBreakdown.longs} longs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <span className="text-gray-700 font-medium">{matchBreakdown.shorts} shorts</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sample Trades Preview */}
                  {previewTrades.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-indigo-200/50">
                      <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Sample trades</p>
                      <div className="space-y-2">
                        {previewTrades.map((trade, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-white/60 rounded-lg text-xs font-mono">
                            <span className="text-gray-700">
                              {trade.date} <span className="font-semibold">{trade.symbol}</span> {trade.side}
                            </span>
                            <span className={`font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.rMultiple}R
                            </span>
                          </div>
                        ))}
                      </div>
                      {matchCount !== null && matchCount > previewTrades.length && (
                        <p className="text-xs text-gray-500 mt-3 text-center italic">
                          Showing {previewTrades.length} of {matchCount} matching trades
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Advanced Filters */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-xl transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  <span>Advanced filters</span>
                </div>
                <span className={`text-xl transition-transform ${advancedOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {advancedOpen && (
                <div className="mt-4 space-y-6 pl-6 border-l-2 border-indigo-200">
                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-base">📅</span>
                      <span>Date range</span>
                      <span className="text-xs font-normal text-gray-500">(optional)</span>
                    </label>
                    <p className="text-xs text-gray-600 mb-3 ml-7">
                      Analyze trades from a specific time period. Useful for testing how your strategy performed in different market conditions.
                    </p>
                    <div className="grid grid-cols-2 gap-4 ml-7">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Start date</label>
                        <input
                          type="date"
                          value={rule.startDate || ''}
                          onChange={(e) => setRule({ ...rule, startDate: e.target.value || null })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-medium transition-all shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">End date</label>
                        <input
                          type="date"
                          value={rule.endDate || ''}
                          onChange={(e) => setRule({ ...rule, endDate: e.target.value || null })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-medium transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Max Holding Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-base">⏱️</span>
                      <span>Maximum holding time</span>
                      <span className="text-xs font-normal text-gray-500">(optional)</span>
                    </label>
                    <p className="text-xs text-gray-600 mb-3 ml-7">
                      Filter trades by how long you held them. Useful for testing scalping strategies (short holds) or swing trading setups (longer holds). Enter the maximum minutes a trade was open.
                    </p>
                    <div className="ml-7">
                      <input
                        type="number"
                        value={rule.maxHoldingMinutes || ''}
                        onChange={(e) => setRule({ ...rule, maxHoldingMinutes: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="e.g., 15 for 15 minutes"
                        min="1"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-medium transition-all shadow-sm"
                      />
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <p>💡 <strong>Examples:</strong></p>
                        <p>• 5-15 minutes: Scalping/day trading</p>
                        <p>• 30-60 minutes: Short-term swing</p>
                        <p>• 240+ minutes: Longer swing trades</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={analyzing || isLoadingCount || matchCount === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Analyzing strategy...
                  </span>
                ) : (
                  '🚀 Analyze this strategy'
                )}
              </button>
              <p className="text-sm text-gray-500 mt-4 text-center">
                💡 <strong>Tip:</strong> Leave all filters blank to analyze your entire trading history
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function StrategyCheckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <StrategyCheckContent />
    </Suspense>
  );
}
