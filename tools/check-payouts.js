#!/usr/bin/env node

// Tool to check payout manifest and verify transactions
// Usage: node tools/check-payouts.js <round_id>

const https = require('https');

async function checkPayouts(roundId) {
  if (!roundId) {
    console.error('Usage: node check-payouts.js <round_id>');
    process.exit(1);
  }

  try {
    console.log(`Checking payouts for round: ${roundId}`);

    // This would connect to your deployed worker/API
    const workerUrl = process.env.WORKER_URL || 'https://purple-vs-yellow-worker.your-subdomain.workers.dev';

    // Get round history
    const historyResponse = await fetch(`${workerUrl}/api/history`);
    const history = await historyResponse.json();

    const round = history.find(r => r.id === roundId);
    if (!round) {
      console.error(`Round ${roundId} not found in history`);
      process.exit(1);
    }

    console.log('\nRound Summary:');
    console.log(`Winner: ${round.winner?.toUpperCase() || 'VOIDED'}`);
    console.log(`Total Predictions: ${round.totalPredictions}`);
    console.log(`Correct Predictors: ${round.winnerCount}`);
    console.log(`Total Rewards: ${(round.claimedRewards / 1e9).toFixed(6)} SOL`);
    console.log(`Per Wallet: ${(round.perWalletPayout / 1e9).toFixed(6)} SOL`);

    if (round.payoutTxids && round.payoutTxids.length > 0) {
      console.log('\nTransaction IDs:');
      for (const txid of round.payoutTxids) {
        console.log(`  https://solscan.io/tx/${txid}`);
      }

      // Verify transactions on-chain
      console.log('\nVerifying transactions...');
      await verifyTransactions(round.payoutTxids);
    } else {
      console.log('\nNo payout transactions found (round may have been voided)');
    }

  } catch (error) {
    console.error('Error checking payouts:', error);
    process.exit(1);
  }
}

async function verifyTransactions(txids) {
  const rpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

  for (const txid of txids) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [
            txid,
            { encoding: 'json', maxSupportedTransactionVersion: 0 }
          ]
        })
      });

      const result = await response.json();

      if (result.error) {
        console.log(`  ❌ ${txid}: ${result.error.message}`);
      } else if (result.result) {
        const tx = result.result;
        if (tx.meta?.err) {
          console.log(`  ❌ ${txid}: Transaction failed`);
        } else {
          const transfers = tx.meta?.postBalances?.length || 0;
          console.log(`  ✅ ${txid}: Confirmed (${transfers} balance changes)`);
        }
      } else {
        console.log(`  ⏳ ${txid}: Not found (may still be processing)`);
      }

    } catch (error) {
      console.log(`  ❓ ${txid}: Error checking - ${error.message}`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  checkPayouts(process.argv[2]);
}