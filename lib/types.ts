export type PredictionSide = 'purple' | 'yellow';

export type RoundPhase = 'OPEN' | 'LOCKED' | 'SETTLING' | 'RESETTING';

export interface Score {
  purple: number;
  yellow: number;
}

export interface Prediction {
  wallet: string;
  side: PredictionSide;
  timestamp: number;
  signature?: string;
}

export interface Round {
  id: string;
  phase: RoundPhase;
  startTime: number;
  endTime?: number;
  lockTime?: number;
  score: Score;
  predictions: Map<string, Prediction>;
  winner?: PredictionSide;
  claimedRewards?: number;
  payoutManifest?: PayoutManifest;
}

export interface PayoutEntry {
  wallet: string;
  amount: number;
  status: 'pending' | 'sent' | 'failed';
  txid?: string;
  error?: string;
}

export interface PayoutManifest {
  roundId: string;
  totalRewards: number;
  winnerCount: number;
  perWalletAmount: number;
  entries: PayoutEntry[];
  completedAt?: number;
}

export interface RoundHistory {
  id: string;
  winner: PredictionSide;
  startTime: number;
  endTime: number;
  totalPredictions: number;
  winnerCount: number;
  claimedRewards: number;
  perWalletPayout: number;
  payoutTxids: string[];
}

export interface ApiState {
  roundId: string;
  phase: RoundPhase;
  score: Score;
  counts: {
    purple: number;
    yellow: number;
  };
  isLocked: boolean;
  lockTime?: number;
  startTime: number;
}