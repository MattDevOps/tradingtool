'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface StrategyRule {
  instrument?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  direction?: 'LONG' | 'SHORT' | 'BOTH';
  maxHoldingTime?: number;
}

export default function RuleBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get('uploadId');

  const [rule, setRule] = useState<StrategyRule>({
    direction: 'BOTH',
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadId) {
      router.push('/upload');
    }
  }, [uploadId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadId) return;

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
          rule,
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Define Your Strategy Rule
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instrument / Symbol (optional)
              </label>
              <input
                type="text"
                value={rule.instrument || ''}
                onChange={(e) => setRule({ ...rule, instrument: e.target.value || undefined })}
                placeholder="e.g., ES, NQ, BTC"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Window (optional)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start</label>
                  <input
                    type="time"
                    value={rule.timeWindowStart || ''}
                    onChange={(e) => setRule({ ...rule, timeWindowStart: e.target.value || undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End</label>
                  <input
                    type="time"
                    value={rule.timeWindowEnd || ''}
                    onChange={(e) => setRule({ ...rule, timeWindowEnd: e.target.value || undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Direction
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="LONG"
                    checked={rule.direction === 'LONG'}
                    onChange={(e) => setRule({ ...rule, direction: e.target.value as 'LONG' })}
                    className="mr-2"
                  />
                  Long
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="SHORT"
                    checked={rule.direction === 'SHORT'}
                    onChange={(e) => setRule({ ...rule, direction: e.target.value as 'SHORT' })}
                    className="mr-2"
                  />
                  Short
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="BOTH"
                    checked={rule.direction === 'BOTH'}
                    onChange={(e) => setRule({ ...rule, direction: e.target.value as 'BOTH' })}
                    className="mr-2"
                  />
                  Both
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Holding Time (optional)
              </label>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={rule.maxHoldingTime || ''}
                  onChange={(e) => setRule({ ...rule, maxHoldingTime: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="15"
                  min="1"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  defaultValue="minutes"
                >
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={analyzing}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? 'Analyzing...' : 'Run Check → Generate Stats'}
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-4 text-center">
            Note: You can skip optional fields for a general check of all your trades.
          </p>
        </form>
      </main>
    </div>
  );
}
