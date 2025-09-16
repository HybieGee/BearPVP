'use client';

import { useState, useEffect } from 'react';
import TwitchEmbed from '@/components/TwitchEmbed';
import PredictionPanel from '@/components/PredictionPanel';
import WalletButton from '@/components/WalletButton';
import StatusBar from '@/components/StatusBar';
import { ApiState } from '@/lib/types';

export default function Home() {
  const [state, setState] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<string | null>(null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        setState(data);
      } catch (error) {
        console.error('Failed to fetch state:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">Purple vs Yellow</h1>
          <WalletButton onConnect={setWallet} />
        </div>
      </header>

      <main className="pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-2">
              <TwitchEmbed channel={process.env.NEXT_PUBLIC_TWITCH_CHANNEL || 'beradottv2'} />

              {state && (
                <StatusBar
                  phase={state.phase}
                  score={state.score}
                  lockTime={state.lockTime}
                />
              )}
            </div>

            <div className="lg:col-span-1">
              {loading ? (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <div className="animate-pulse">Loading...</div>
                </div>
              ) : state ? (
                <PredictionPanel
                  state={state}
                  wallet={wallet}
                  onPredict={async (side) => {
                    if (!wallet) {
                      alert('Please connect your wallet first');
                      return;
                    }

                    try {
                      const res = await fetch('/api/predict', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ side, wallet })
                      });

                      if (!res.ok) {
                        const error = await res.json();
                        alert(error.message || 'Prediction failed');
                      }
                    } catch (error) {
                      console.error('Prediction error:', error);
                      alert('Failed to submit prediction');
                    }
                  }}
                />
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <p>Unable to load game state</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}