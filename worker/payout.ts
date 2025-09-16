import { Env } from './index';
import { PayoutEntry } from '../lib/types';

export async function sendSOLToWinners(
  entries: PayoutEntry[],
  env: Env
): Promise<PayoutEntry[]> {
  const results: PayoutEntry[] = [];
  const batchSize = 20;

  console.log(`Processing ${entries.length} payouts in batches of ${batchSize}`);

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)}`);

    const batchResults = await processBatch(batch, env);
    results.push(...batchResults);

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

async function processBatch(
  batch: PayoutEntry[],
  env: Env
): Promise<PayoutEntry[]> {
  const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = await import('@solana/web3.js');
  const bs58 = await import('bs58');

  try {
    const connection = new Connection(env.RPC_URL);
    const payerKeypair = Keypair.fromSecretKey(bs58.default.decode(env.PAYOUT_SIGNER_SECRET));

    const transaction = new Transaction();
    const recipients = [];

    const estimatedFeePerTransfer = 5000;
    let totalAmountNeeded = 0;

    for (const entry of batch) {
      try {
        const recipientPubkey = new PublicKey(entry.wallet);
        const netAmount = entry.amount - estimatedFeePerTransfer;

        if (netAmount > 0) {
          const transferInstruction = SystemProgram.transfer({
            fromPubkey: payerKeypair.publicKey,
            toPubkey: recipientPubkey,
            lamports: netAmount
          });

          transaction.add(transferInstruction);
          recipients.push(entry);
          totalAmountNeeded += entry.amount;
        } else {
          console.warn(`Amount too small for ${entry.wallet}: ${entry.amount}`);
          entry.status = 'failed';
          entry.error = 'Amount too small after fee deduction';
        }
      } catch (error) {
        console.error(`Invalid wallet address: ${entry.wallet}`, error);
        entry.status = 'failed';
        entry.error = 'Invalid wallet address';
      }
    }

    if (recipients.length === 0) {
      console.warn('No valid recipients in batch');
      return batch;
    }

    const balance = await connection.getBalance(payerKeypair.publicKey);
    if (balance < totalAmountNeeded) {
      console.error(`Insufficient balance. Need: ${totalAmountNeeded}, Have: ${balance}`);
      for (const entry of recipients) {
        entry.status = 'failed';
        entry.error = 'Insufficient funds';
      }
      return batch;
    }

    const signature = await connection.sendTransaction(transaction, [payerKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    console.log(`Batch transaction sent: ${signature}`);

    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      console.error(`Transaction failed: ${signature}`, confirmation.value.err);
      for (const entry of recipients) {
        entry.status = 'failed';
        entry.error = 'Transaction failed';
      }
    } else {
      console.log(`Batch transaction confirmed: ${signature}`);
      for (const entry of recipients) {
        entry.status = 'sent';
        entry.txid = signature;
      }
    }

    return batch;

  } catch (error) {
    console.error('Batch processing error:', error);

    for (const entry of batch) {
      if (entry.status === 'pending') {
        entry.status = 'failed';
        entry.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return batch;
  }
}

export async function retryFailedPayouts(
  roundId: string,
  env: Env
): Promise<void> {
  try {
    const manifestKey = `manifest_${roundId}`;
    const manifestData = await env.ROUNDS_KV.get(manifestKey, 'json');

    if (!manifestData) {
      console.error(`No manifest found for round ${roundId}`);
      return;
    }

    const failedEntries = manifestData.entries.filter((e: PayoutEntry) => e.status === 'failed');

    if (failedEntries.length === 0) {
      console.log(`No failed payouts to retry for round ${roundId}`);
      return;
    }

    console.log(`Retrying ${failedEntries.length} failed payouts for round ${roundId}`);

    const retryResults = await sendSOLToWinners(failedEntries, env);

    for (let i = 0; i < failedEntries.length; i++) {
      const originalIndex = manifestData.entries.findIndex(
        (e: PayoutEntry) => e.wallet === failedEntries[i].wallet
      );
      if (originalIndex !== -1) {
        manifestData.entries[originalIndex] = retryResults[i];
      }
    }

    await env.ROUNDS_KV.put(manifestKey, JSON.stringify(manifestData));

    const successfulRetries = retryResults.filter(e => e.status === 'sent').length;
    console.log(`Retry completed: ${successfulRetries}/${failedEntries.length} successful`);

  } catch (error) {
    console.error(`Failed to retry payouts for round ${roundId}:`, error);
  }
}