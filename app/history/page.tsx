'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoundHistory } from '@/lib/types';

export default function HistoryPage() {
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSOL = (amount: number) => {
    return (amount / 1e9).toFixed(6);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Match History</h1>
            <Link
              href="/"
              className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Game
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse">Loading history...</div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No matches completed yet
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((round) => (
              <div
                key={round.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="px-4 py-2 rounded-lg font-bold text-lg"
                      style={{
                        backgroundColor: round.winner === 'purple' ? '#7F3EFF' : '#FFD400',
                        color: round.winner === 'yellow' ? '#000' : '#fff'
                      }}
                    >
                      {round.winner.toUpperCase()} WINS
                    </div>
                    <div className="text-gray-400">
                      Round #{round.id}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatTime(round.startTime)}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-gray-400 text-sm">Total Predictions</div>
                    <div className="text-xl font-semibold">{round.totalPredictions}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Correct Predictors</div>
                    <div className="text-xl font-semibold">{round.winnerCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Total Rewards</div>
                    <div className="text-xl font-semibold">{formatSOL(round.claimedRewards)} SOL</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Per Wallet</div>
                    <div className="text-xl font-semibold">{formatSOL(round.perWalletPayout)} SOL</div>
                  </div>
                </div>

                {round.payoutTxids.length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <div className="text-sm text-gray-400 mb-2">Payout Transactions</div>
                    <div className="flex flex-wrap gap-2">
                      {round.payoutTxids.slice(0, 3).map((txid, i) => (
                        <a
                          key={i}
                          href={`https://solscan.io/tx/${txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs font-mono"
                        >
                          {txid.slice(0, 8)}...
                        </a>
                      ))}
                      {round.payoutTxids.length > 3 && (
                        <span className="text-gray-500 text-xs">
                          +{round.payoutTxids.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}