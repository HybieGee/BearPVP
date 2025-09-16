import { Round, RoundPhase, Prediction, PredictionSide, Score } from '../lib/types';

export class RoundManager {
  state: DurableObjectState;
  round: Round | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!this.round) {
      await this.initializeRound();
    }

    switch (path) {
      case '/predict':
        return this.handlePredict(request);
      case '/state':
        return this.getState();
      case '/lock':
        return this.lockRound();
      case '/result':
        return this.setResult(request);
      case '/reset':
        return this.resetRound();
      case '/health':
        return this.getHealth();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async initializeRound() {
    const stored = await this.state.storage.get<Round>('current_round');
    if (stored) {
      this.round = {
        ...stored,
        predictions: new Map(Object.entries(stored.predictions || {}))
      };
    } else {
      this.round = {
        id: `round_${Date.now()}`,
        phase: 'OPEN',
        startTime: Date.now(),
        score: { purple: 0, yellow: 0 },
        predictions: new Map()
      };
      await this.saveRound();
    }
  }

  async saveRound() {
    if (!this.round) return;

    const toStore = {
      ...this.round,
      predictions: Object.fromEntries(this.round.predictions)
    };
    await this.state.storage.put('current_round', toStore);
  }

  async handlePredict(request: Request): Promise<Response> {
    if (!this.round || this.round.phase !== 'OPEN') {
      return new Response(
        JSON.stringify({ error: 'Predictions are closed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json() as { wallet: string; side: PredictionSide };
    const { wallet, side } = body;

    if (!wallet || !side) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet or side' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (this.round.predictions.has(wallet)) {
      return new Response(
        JSON.stringify({ error: 'Already predicted' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prediction: Prediction = {
      wallet,
      side,
      timestamp: Date.now()
    };

    this.round.predictions.set(wallet, prediction);
    await this.saveRound();

    return new Response(
      JSON.stringify({ success: true, prediction }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async getState(): Promise<Response> {
    if (!this.round) {
      return new Response(
        JSON.stringify({ error: 'No active round' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const counts = {
      purple: 0,
      yellow: 0
    };

    for (const prediction of this.round.predictions.values()) {
      counts[prediction.side]++;
    }

    const state = {
      roundId: this.round.id,
      phase: this.round.phase,
      score: this.round.score,
      counts,
      isLocked: this.round.phase !== 'OPEN',
      lockTime: this.round.lockTime,
      startTime: this.round.startTime
    };

    return new Response(
      JSON.stringify(state),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async lockRound(): Promise<Response> {
    if (!this.round || this.round.phase !== 'OPEN') {
      return new Response(
        JSON.stringify({ error: 'Round cannot be locked' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    this.round.phase = 'LOCKED';
    this.round.lockTime = Date.now();
    await this.saveRound();

    return new Response(
      JSON.stringify({ success: true, lockTime: this.round.lockTime }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async setResult(request: Request): Promise<Response> {
    if (!this.round || this.round.phase !== 'LOCKED') {
      return new Response(
        JSON.stringify({ error: 'Round not in locked state' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json() as { winner: PredictionSide; score: Score };
    const { winner, score } = body;

    this.round.winner = winner;
    this.round.score = score;
    this.round.phase = 'SETTLING';
    this.round.endTime = Date.now();
    await this.saveRound();

    return new Response(
      JSON.stringify({ success: true, winner }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async resetRound(): Promise<Response> {
    if (!this.round || this.round.phase !== 'SETTLING') {
      return new Response(
        JSON.stringify({ error: 'Round cannot be reset' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const previousId = this.round.id;

    this.round = {
      id: `round_${Date.now()}`,
      phase: 'OPEN',
      startTime: Date.now(),
      score: { purple: 0, yellow: 0 },
      predictions: new Map()
    };

    await this.saveRound();

    return new Response(
      JSON.stringify({ success: true, newRoundId: this.round.id, previousId }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async getHealth(): Promise<Response> {
    const health = {
      roundId: this.round?.id,
      phase: this.round?.phase,
      predictionsCount: this.round?.predictions.size || 0,
      uptime: Date.now() - (this.round?.startTime || Date.now())
    };

    return new Response(
      JSON.stringify(health),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}