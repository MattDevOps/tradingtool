'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="text-xl font-bold text-gray-900">
            Strategy Reality Check
          </div>
          <div className="text-sm text-gray-600">
            {/* Future: Sign In / Sign Up */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Is your trading strategy real
            <br />
            <span className="text-primary">— or just luck?</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your ThinkOrSwim trade history and instantly see if your edge is statistically valid.
            Free, fast, and no setup required.
          </p>

          <Link
            href="/upload"
            className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Upload ThinkOrSwim CSV → Check Strategy
          </Link>

          <p className="text-sm text-gray-500 mt-6">
            Works with ThinkOrSwim trade exports (CSV format)
          </p>
        </div>

        <div className="mt-20 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Upload Trades</h3>
              <p className="text-gray-600">
                Export your closed trades from ThinkOrSwim and upload the CSV. We auto-detect columns automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">Define Strategy</h3>
              <p className="text-gray-600">
                Filter by instrument, time window, direction, or holding time.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-2">Get Verdict</h3>
              <p className="text-gray-600">
                Receive statistical analysis with Monte-Carlo simulation and clear verdict.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-gray-200">
        <div className="text-center text-sm text-gray-500">
          <p>Free strategy validation tool. No account required.</p>
        </div>
      </footer>
    </div>
  );
}
