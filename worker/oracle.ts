import { Env } from './index';
import { PredictionSide, Score } from '../lib/types';
import { handleSettle } from './settlement';

export async function handleResult(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      roundId: string;
      winner?: PredictionSide;
      score?: Score;
      confidence?: number;
      status?: string;
    };

    const { roundId, winner, score, confidence, status } = body;

    console.log('Oracle result received:', body);

    if (status === 'timeout' || status === 'error') {
      console.log(`Oracle reported ${status} for round ${roundId}`);
      await voidRound(roundId, env);
      return new Response(
        JSON.stringify({ success: true, action: 'voided' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!winner || !score || !roundId) {
      return new Response(
        JSON.stringify({ error: 'Missing required result data' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!['purple', 'yellow'].includes(winner)) {
      return new Response(
        JSON.stringify({ error: 'Invalid winner' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if ((winner === 'purple' && score.purple < 3) ||
        (winner === 'yellow' && score.yellow < 3)) {
      return new Response(
        JSON.stringify({ error: 'Winner must have score of 3 or more' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const minimumConfidence = parseFloat(env.CV_CONFIDENCE_THRESHOLD) || 0.9;
    if (confidence && confidence < minimumConfidence) {
      console.log(`Low confidence result (${confidence} < ${minimumConfidence}), treating as void`);
      await voidRound(roundId, env);
      return new Response(
        JSON.stringify({ success: true, action: 'voided', reason: 'low_confidence' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const id = env.ROUND_MANAGER.idFromName('current');
    const stub = env.ROUND_MANAGER.get(id);

    const stateResponse = await stub.fetch('http://internal/state');
    const currentState = await stateResponse.json();

    if (currentState.roundId !== roundId) {
      console.log(`Round ID mismatch: expected ${currentState.roundId}, got ${roundId}`);
      return new Response(
        JSON.stringify({ error: 'Round ID mismatch' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (currentState.phase !== 'LOCKED') {
      console.log(`Round not in locked phase: ${currentState.phase}`);
      return new Response(
        JSON.stringify({ error: 'Round not in locked phase' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const resultResponse = await stub.fetch('http://internal/result', {
      method: 'POST',
      body: JSON.stringify({ winner, score })
    });

    if (!resultResponse.ok) {
      const error = await resultResponse.json();
      console.error('Failed to set result:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to set result' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Result set: ${winner} wins with score ${score.purple}-${score.yellow}`);

    const settlementResponse = await handleSettle(
      new Request('http://internal/settle', { method: 'POST' }),
      env
    );

    const settlementResult = await settlementResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        roundId,
        winner,
        score,
        confidence,
        settlement: settlementResult
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Oracle result processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process oracle result' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function voidRound(roundId: string, env: Env): Promise<void> {
  try {
    console.log(`Voiding round ${roundId}`);

    const id = env.ROUND_MANAGER.idFromName('current');
    const stub = env.ROUND_MANAGER.get(id);

    const stateResponse = await stub.fetch('http://internal/state');
    const currentState = await stateResponse.json();

    const voidHistory = {
      id: roundId,
      winner: null,
      startTime: currentState.startTime,
      endTime: Date.now(),
      totalPredictions: currentState.counts.purple + currentState.counts.yellow,
      winnerCount: 0,
      claimedRewards: 0,
      perWalletPayout: 0,
      payoutTxids: [],
      voided: true,
      voidReason: 'Oracle timeout or low confidence'
    };

    await env.HISTORY_KV.put(`${roundId}_void`, JSON.stringify(voidHistory));

    await stub.fetch('http://internal/reset', { method: 'POST' });

    console.log(`Round ${roundId} voided and new round started`);

  } catch (error) {
    console.error('Failed to void round:', error);
  }
}

export async function validateOracleHealth(env: Env): Promise<boolean> {
  try {
    const cvServiceUrl = env.CV_SERVICE_URL || 'http://localhost:8080';

    const response = await fetch(`${cvServiceUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });

    if (!response.ok) {
      console.error('CV service health check failed:', response.status);
      return false;
    }

    const health = await response.json();
    console.log('CV service health:', health);

    return health.status === 'healthy';

  } catch (error) {
    console.error('CV service health check error:', error);
    return false;
  }
}

export async function triggerManualResult(
  roundId: string,
  winner: PredictionSide,
  score: Score,
  env: Env
): Promise<boolean> {
  try {
    console.log(`Manual result triggered for ${roundId}: ${winner} wins ${score.purple}-${score.yellow}`);

    const resultResponse = await handleResult(
      new Request('http://internal/result', {
        method: 'POST',
        body: JSON.stringify({
          roundId,
          winner,
          score,
          confidence: 1.0,
          manual: true
        })
      }),
      env
    );

    return resultResponse.ok;

  } catch (error) {
    console.error('Manual result trigger error:', error);
    return false;
  }
}