'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="Strategy Reality Check"
                  width={400}
                  height={100}
                  className="h-16 md:h-20 lg:h-24 w-auto"
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
                <div className="text-sm text-gray-400">Loading...</div>
              ) : session ? (
                <>
                  <div className="text-sm text-gray-700">
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
                    className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-sm text-gray-700 hover:text-gray-900 font-medium"
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
          <div className="inline-block mb-6 px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full border border-indigo-200/50">
            <p className="text-sm font-semibold text-indigo-900">
              🎯 Free Statistical Strategy Validator
            </p>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Is your trading strategy{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              real
            </span>
            <br />
            <span className="text-gray-700">— or just luck?</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-800 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your ThinkOrSwim trade history and get an instant statistical analysis. 
            <span className="font-semibold text-gray-900"> Free, fast, and no setup required.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            {session ? (
              <Link
                href="/upload"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span>📊</span>
                <span>View My Trades</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <span>🚀</span>
                  <span>Get Started - Sign Up Free</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl border-2 border-gray-200"
                >
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm">
            <span className="text-green-500">✓</span>
            <p className="text-sm text-gray-700 font-medium">
              Works with ThinkOrSwim trade exports (CSV format)
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-800 font-medium">
              Three simple steps to validate your trading edge
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-soft hover:shadow-xl transition-all hover:scale-105">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                1
              </div>
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Upload Trades</h3>
              <p className="text-gray-600 leading-relaxed">
                Export your closed trades from ThinkOrSwim and upload the CSV. 
                <span className="font-semibold text-gray-800"> We auto-detect columns automatically</span>—no manual setup needed.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-soft hover:shadow-xl transition-all hover:scale-105">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                2
              </div>
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Define Strategy</h3>
              <p className="text-gray-600 leading-relaxed">
                Filter by instrument, direction, date range, or holding time. 
                <span className="font-semibold text-gray-800"> Test specific setups or analyze your entire history.</span>
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-soft hover:shadow-xl transition-all hover:scale-105">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                3
              </div>
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Get Verdict</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive statistical analysis with Monte-Carlo simulation. 
                <span className="font-semibold text-gray-800"> Know if your edge is real or random.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats/Trust Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200/50 rounded-2xl p-8 md:p-12 shadow-soft">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Free
                </div>
                <p className="text-gray-700 font-medium">No cost, no credit card</p>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  Fast
                </div>
                <p className="text-gray-700 font-medium">Results in seconds</p>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2">
                  Simple
                </div>
                <p className="text-gray-700 font-medium">No account required</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-12 mt-24 border-t border-gray-200/50">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold">Strategy Reality Check</span> — Free statistical validation tool
          </p>
          <p className="text-xs text-gray-500">
            No account required • No data stored permanently • Privacy-first
          </p>
        </div>
      </footer>
    </div>
  );
}
