'use client';

import { ApiState, PredictionSide } from '@/lib/types';

interface PredictionPanelProps {
  state: ApiState;
  wallet: string | null;
  onPredict: (side: PredictionSide) => void;
}

export default function PredictionPanel({ state, wallet, onPredict }: PredictionPanelProps) {
  const isLocked = state.phase !== 'OPEN';
  const total = state.counts.purple + state.counts.yellow;
  const purplePercent = total > 0 ? (state.counts.purple / total) * 100 : 50;
  const yellowPercent = total > 0 ? (state.counts.yellow / total) * 100 : 50;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {isLocked ? 'Predictions Locked' : 'Make Your Prediction'}
      </h2>

      <div className="space-y-4">
        <button
          onClick={() => onPredict('purple')}
          disabled={isLocked || !wallet}
          className="w-full relative overflow-hidden rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#7F3EFF',
            border: '2px solid #7F3EFF'
          }}
        >
          <div
            className="absolute inset-0 bg-black/20"
            style={{ width: `${100 - purplePercent}%`, right: 0 }}
          />
          <div className="relative py-6 px-4">
            <div className="text-3xl font-bold">PURPLE</div>
            <div className="text-lg mt-2">
              {state.counts.purple} predictions ({purplePercent.toFixed(1)}%)
            </div>
          </div>
        </button>

        <div className="text-center text-gray-400">VS</div>

        <button
          onClick={() => onPredict('yellow')}
          disabled={isLocked || !wallet}
          className="w-full relative overflow-hidden rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#FFD400',
            border: '2px solid #FFD400',
            color: '#000'
          }}
        >
          <div
            className="absolute inset-0 bg-black/20"
            style={{ width: `${100 - yellowPercent}%`, right: 0 }}
          />
          <div className="relative py-6 px-4">
            <div className="text-3xl font-bold">YELLOW</div>
            <div className="text-lg mt-2">
              {state.counts.yellow} predictions ({yellowPercent.toFixed(1)}%)
            </div>
          </div>
        </button>
      </div>

      {!wallet && (
        <div className="mt-4 text-center text-yellow-400">
          Connect wallet to predict
        </div>
      )}

      {isLocked && (
        <div className="mt-4 text-center text-gray-400">
          Match in progress - First to 3 goals wins
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-900 rounded-lg">
        <div className="text-sm text-gray-400 space-y-1">
          <div>Round: {state.roundId}</div>
          <div>Phase: {state.phase}</div>
          <div>Total Predictions: {total}</div>
        </div>
      </div>
    </div>
  );
}