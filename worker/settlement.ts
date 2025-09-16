import { Env } from './index';
import { PayoutManifest, PayoutEntry } from '../lib/types';
import { claimPumpfunRewards } from './pumpfun';
import { sendSOLToWinners } from './payout';

export async function handleSettle(request: Request, env: Env): Promise<Response> {
  try {
    const id = env.ROUND_MANAGER.idFromName('current');
    const stub = env.ROUND_MANAGER.get(id);

    const stateResponse = await stub.fetch('http://internal/state');
    const state = await stateResponse.json();

    if (state.phase !== 'SETTLING') {
      return new Response(
        JSON.stringify({ error: 'Round not in settling phase' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting settlement for round ${state.roundId}`);

    const claimedRewards = await claimPumpfunRewards(env);
    console.log(`Claimed ${claimedRewards} lamports in rewards`);

    const winners = await getWinners(stub);
    console.log(`Found ${winners.length} correct predictors`);

    if (winners.length === 0) {
      console.log('No winners found, resetting round');
      await stub.fetch('http://internal/reset', { method: 'POST' });
      return new Response(JSON.stringify({ success: true, winners: 0 }));
    }

    const perWalletAmount = Math.floor(claimedRewards / winners.length);
    const minimumPayout = 1000;

    if (perWalletAmount < minimumPayout) {
      console.log(`Per-wallet amount too small (${perWalletAmount}), holding until threshold met`);
      await env.ROUNDS_KV.put(`pending_${state.roundId}`, JSON.stringify({
        roundId: state.roundId,
        winners,
        rewards: claimedRewards
      }), { expirationTtl: 7 * 24 * 60 * 60 });

      await stub.fetch('http://internal/reset', { method: 'POST' });
      return new Response(JSON.stringify({ success: true, held: true }));
    }

    const payoutManifest: PayoutManifest = {
      roundId: state.roundId,
      totalRewards: claimedRewards,
      winnerCount: winners.length,
      perWalletAmount,
      entries: winners.map(wallet => ({
        wallet,
        amount: perWalletAmount,
        status: 'pending'
      }))
    };

    const payoutResults = await sendSOLToWinners(payoutManifest.entries, env);

    for (let i = 0; i < payoutResults.length; i++) {
      payoutManifest.entries[i] = {
        ...payoutManifest.entries[i],
        ...payoutResults[i]
      };
    }

    payoutManifest.completedAt = Date.now();

    await saveRoundHistory(state.roundId, payoutManifest, state, env);

    await stub.fetch('http://internal/reset', { method: 'POST' });

    const successfulPayouts = payoutManifest.entries.filter(e => e.status === 'sent').length;

    return new Response(
      JSON.stringify({
        success: true,
        roundId: state.roundId,
        totalRewards: claimedRewards,
        winners: winners.length,
        successfulPayouts,
        manifest: payoutManifest
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Settlement error:', error);
    return new Response(
      JSON.stringify({ error: 'Settlement failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getWinners(stub: DurableObjectStub): Promise<string[]> {
  const response = await stub.fetch('http://internal/internal', {
    method: 'POST',
    body: JSON.stringify({ action: 'getWinners' })
  });

  const data = await response.json();
  return data.winners || [];
}

async function saveRoundHistory(roundId: string, manifest: PayoutManifest, state: any, env: Env) {
  const history = {
    id: roundId,
    winner: state.winner,
    startTime: state.startTime,
    endTime: state.endTime || Date.now(),
    totalPredictions: state.counts.purple + state.counts.yellow,
    winnerCount: manifest.winnerCount,
    claimedRewards: manifest.totalRewards,
    perWalletPayout: manifest.perWalletAmount,
    payoutTxids: manifest.entries
      .filter(e => e.txid)
      .map(e => e.txid)
  };

  await env.HISTORY_KV.put(roundId, JSON.stringify(history));
  await env.ROUNDS_KV.put(`manifest_${roundId}`, JSON.stringify(manifest));

  console.log(`Saved history for round ${roundId}`);
}