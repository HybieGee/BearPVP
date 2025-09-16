import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">About Purple vs Yellow</h1>
            <Link
              href="/"
              className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Game
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-purple-400">How It Works</h2>
            <ol className="space-y-3 list-decimal list-inside text-gray-300">
              <li>Connect your Solana wallet (Phantom or Backpack)</li>
              <li>Watch the live Twitch stream and pick your team: Purple or Yellow</li>
              <li>Make one free prediction per match (no staking required)</li>
              <li>First team to score 3 goals wins the match</li>
              <li>If you predicted correctly, you receive an equal share of creator rewards</li>
              <li>Payouts are automatic and sent directly to your wallet</li>
            </ol>
          </section>

          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">Payout System</h2>
            <div className="space-y-3 text-gray-300">
              <p>
                All predictions are completely free - no SOL required to participate.
              </p>
              <p>
                When a match ends, the system automatically:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Claims accumulated Pump.fun creator rewards</li>
                <li>Counts all correct predictors</li>
                <li>Divides rewards equally among winners</li>
                <li>Sends SOL directly to each winner&apos;s wallet</li>
              </ul>
              <p className="text-sm text-gray-400 mt-4">
                Example: 100 correct predictors + 10 SOL rewards = 0.1 SOL per wallet (minus network fees)
              </p>
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-green-400">Match Rules</h2>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-purple-400">▸</span>
                <div>
                  <strong>First to 3 goals wins:</strong> Each match continues until one team scores 3 goals
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-400">▸</span>
                <div>
                  <strong>Predictions lock on kickoff:</strong> Once the match starts, no new predictions accepted
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-400">▸</span>
                <div>
                  <strong>One prediction per wallet:</strong> Each wallet can predict once per match
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-400">▸</span>
                <div>
                  <strong>Automatic reset:</strong> After payouts, a new round begins immediately
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-red-400">Void Conditions</h2>
            <div className="space-y-3 text-gray-300">
              <p>
                Matches may be voided (no payouts) if:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Stream disconnects for extended period</li>
                <li>Score cannot be reliably detected</li>
                <li>Technical issues prevent fair resolution</li>
              </ul>
              <p className="text-sm text-gray-400 mt-4">
                In void cases, no rewards are distributed and a new round begins
              </p>
            </div>
          </section>

          <div className="text-center py-8">
            <Link
              href="/history"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-yellow-500 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              View Match History
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}