'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-gray-950 dark:via-indigo-950/30 dark:to-purple-950/20">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="Strategy Reality Check"
                  width={400}
                  height={100}
                  className="h-16 md:h-20 lg:h-24 w-auto dark:brightness-0 dark:invert"
                  priority
                  style={{ 
                    mixBlendMode: 'multiply',
                    filter: 'contrast(1.2)'
                  }}
                />
              </div>
            </Link>
            <div className="flex items-center gap-4">
              {status === 'loading' ? (
                <div className="text-sm text-gray-400 dark:text-gray-500">Loading...</div>
              ) : session ? (
                <>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{session.user?.email}</span>
                  </div>
                  <Link
                    href="/upload"
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    My Trades
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
            Is your trading strategy{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              real
            </span>
            <br />
            <span className="text-gray-700 dark:text-gray-300">— or just luck?</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-4 max-w-2xl mx-auto leading-relaxed">
            Upload your trades and find out in <span className="font-bold text-gray-900 dark:text-gray-100">10 seconds.</span>
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-xl mx-auto">
            Statistical edge detection with Monte Carlo simulation.
            <span className="font-semibold text-gray-800 dark:text-gray-200"> Free.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            {session ? (
              <Link
                href="/upload"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span>📊</span>
                <span>Test My Strategy Now</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <span>🚀</span>
                  <span>Test My Strategy — Free</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl border-2 border-gray-200 dark:border-gray-700"
                >
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
            <span className="text-green-500">✓</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Works with ThinkOrSwim exports • More brokers coming soon
            </p>
          </div>
        </div>

        {/* Social Proof / Pain Point */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 md:p-10 shadow-xl text-center">
            <p className="text-2xl md:text-3xl font-bold text-white mb-3">
              &ldquo;Am I profitable or just lucky?&rdquo;
            </p>
            <p className="text-gray-400 text-lg">
              Every serious trader asks this question. Now you can answer it with math.
            </p>
          </div>
        </div>

        {/* Strategy Examples Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Test any strategy you trade
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Filter your trades and validate specific setups
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '📈', label: 'Long SPY between 9:30–10:30' },
              { icon: '📉', label: 'Short-only trades' },
              { icon: '⏱️', label: 'Scalps under 15 minutes' },
              { icon: '🎯', label: 'Only ES futures trades' },
              { icon: '📊', label: 'All trades this month' },
              { icon: '🔄', label: 'Credit spreads on QQQ' },
            ].map((example, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all"
              >
                <span className="text-2xl">{example.icon}</span>
                <span className="text-gray-800 dark:text-gray-200 font-medium text-sm">{example.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it Works */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              Three steps. Ten seconds. One answer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <div className="group relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 shadow-soft hover:shadow-xl transition-all hover:scale-105">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                1
              </div>
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Upload Trades</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Export from ThinkOrSwim and drop the CSV.
                <span className="font-semibold text-gray-800 dark:text-gray-200"> We auto-detect everything</span>—spreads, direction, P&L.
              </p>
            </div>

            <div className="group relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 shadow-soft hover:shadow-xl transition-all hover:scale-105">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                2
              </div>
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Pick a Strategy</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Filter by instrument, direction, or time.
                <span className="font-semibold text-gray-800 dark:text-gray-200"> Test a specific setup or your entire history.</span>
              </p>
            </div>

            <div className="group relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 shadow-soft hover:shadow-xl transition-all hover:scale-105">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                3
              </div>
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Get Your Verdict</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Instant verdict: <span className="font-semibold text-green-700 dark:text-green-400">real edge</span> or <span className="font-semibold text-red-700 dark:text-red-400">just luck</span>.
                <span className="font-semibold text-gray-800 dark:text-gray-200"> Plus equity curve, stats, and what to do next.</span>
              </p>
            </div>
          </div>
        </div>

        {/* What You Get Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              What you&apos;ll see
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Clear YES / NO Verdict</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No confusing stats. One answer: does your strategy have a real edge or not?
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Equity Curve</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                See your cumulative performance visually. Spot drawdowns and winning streaks.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">🎲</div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Luck vs. Skill Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Monte Carlo simulation tells you exactly how likely your results are due to chance.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">💡</div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Actionable Feedback</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                What you did well, what needs work, and exactly what to do next.
              </p>
            </div>
          </div>
        </div>

        {/* Stats/Trust Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50 border-2 border-indigo-200/50 dark:border-indigo-700/50 rounded-2xl p-8 md:p-12 shadow-soft">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  100% Free
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">No cost, no credit card</p>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  10 Seconds
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">Upload to verdict</p>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2">
                  Private
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">Your data stays yours</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-12 mt-24 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span className="font-semibold">Strategy Reality Check</span> — Free statistical edge validation for traders
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Built for traders who want the truth about their performance
          </p>
        </div>
      </footer>
    </div>
  );
}
