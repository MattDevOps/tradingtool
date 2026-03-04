'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
        {/* ThinkOrSwim limitation notice */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Currently supports ThinkOrSwim trade statements. More brokers coming soon.
          </p>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Check one simple strategy
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-8">
          {/* Instrument Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrument (optional)
            </label>
            <select
              value={rule.symbol || ''}
              onChange={(e) => setRule({ ...rule, symbol: e.target.value || null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
              disabled={isLoadingSymbols}
            >
              <option value="" className="text-gray-900">
                {isLoadingSymbols ? 'Loading...' : 'All instruments'}
              </option>
              {symbols.map((stat) => (
                <option key={stat.symbol} value={stat.symbol} className="text-gray-900">
                  {stat.symbol}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose from instruments found in your uploaded file.
            </p>
          </div>

          {/* Direction Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trade direction
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRule({ ...rule, direction: 'LONG' })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  rule.direction === 'LONG'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setRule({ ...rule, direction: 'SHORT' })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  rule.direction === 'SHORT'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Short
              </button>
              <button
                type="button"
                onClick={() => setRule({ ...rule, direction: 'BOTH' })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  rule.direction === 'BOTH'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Both
              </button>
            </div>
          </div>

          {/* Match Preview */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            {isLoadingCount ? (
              <span className="text-sm text-gray-600">Checking...</span>
            ) : (
              <>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    This rule matches{' '}
                    <span className="text-lg font-semibold text-primary">
                      {matchCount !== null ? matchCount : '—'}
                    </span>{' '}
                    trades
                  </span>
                  {matchBreakdown && matchCount !== null && matchCount > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      {matchBreakdown.longs} longs · {matchBreakdown.shorts} shorts
                    </div>
                  )}
                </div>

                {/* Sample Trades Preview (Read-only) */}
                {previewTrades.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <p className="text-xs font-medium text-gray-700 mb-2">Sample of matched trades:</p>
                    <div className="space-y-1">
                      {previewTrades.map((trade, idx) => (
                        <div key={idx} className="text-xs text-gray-600 font-mono flex justify-between items-center">
                          <span>
                            {trade.date} {trade.symbol} {trade.side}
                          </span>
                          <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.rMultiple}R
                          </span>
                        </div>
                      ))}
                    </div>
                    {matchCount !== null && matchCount > previewTrades.length && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Showing {previewTrades.length} of {matchCount} trades
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Advanced Filters */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>{advancedOpen ? '▾' : '▸'} Advanced filters</span>
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date range (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start date</label>
                      <input
                        type="date"
                        value={rule.startDate || ''}
                        onChange={(e) => setRule({ ...rule, startDate: e.target.value || null })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End date</label>
                      <input
                        type="date"
                        value={rule.endDate || ''}
                        onChange={(e) => setRule({ ...rule, endDate: e.target.value || null })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Max Holding Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max holding time (minutes)
                  </label>
                  <input
                    type="number"
                    value={rule.maxHoldingMinutes || ''}
                    onChange={(e) => setRule({ ...rule, maxHoldingMinutes: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 15"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <button
            type="submit"
            disabled={analyzing || isLoadingCount || matchCount === 0}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? 'Analyzing...' : 'Test this strategy'}
          </button>

          {/* Footnote */}
          <p className="text-sm text-gray-600 mt-4 text-center">
            You can skip all filters to test your entire trading history.
          </p>
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
