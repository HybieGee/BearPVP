'use client';

import { useEffect, useState } from 'react';
import { RoundPhase, Score } from '@/lib/types';

interface StatusBarProps {
  phase: RoundPhase;
  score: Score;
  lockTime?: number;
}

export default function StatusBar({ phase, score, lockTime }: StatusBarProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!lockTime || phase !== 'OPEN') {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, lockTime - now);

      if (remaining === 0) {
        setTimeLeft('Locking soon...');
      } else {
        const seconds = Math.floor(remaining / 1000) % 60;
        const minutes = Math.floor(remaining / 60000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockTime, phase]);

  const getPhaseColor = () => {
    switch (phase) {
      case 'OPEN': return 'bg-green-600';
      case 'LOCKED': return 'bg-yellow-600';
      case 'SETTLING': return 'bg-orange-600';
      case 'RESETTING': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'OPEN': return 'Predictions Open';
      case 'LOCKED': return 'Match In Progress';
      case 'SETTLING': return 'Calculating Payouts';
      case 'RESETTING': return 'Starting New Round';
      default: return phase;
    }
  };

  return (
    <div className="mt-4 bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getPhaseColor()}`}>
            {getPhaseText()}
          </div>

          {timeLeft && (
            <div className="text-gray-400">
              Closes in: {timeLeft}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: '#7F3EFF' }}>
              {score.purple}
            </span>
            <span className="text-gray-500">-</span>
            <span className="text-2xl font-bold" style={{ color: '#FFD400' }}>
              {score.yellow}
            </span>
          </div>

          <div className="text-sm text-gray-400">
            First to 3 wins
          </div>
        </div>
      </div>
    </div>
  );
}