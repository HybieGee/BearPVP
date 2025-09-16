import { Env } from './index';

export async function claimPumpfunRewards(env: Env): Promise<number> {
  try {
    const tokenMint = env.TOKEN_MINT;
    const treasuryAddress = env.TREASURY_ADDRESS;

    if (!tokenMint || !treasuryAddress) {
      console.warn('Token mint or treasury address not configured');
      return 0;
    }

    const balanceBefore = await getSOLBalance(treasuryAddress, env);
    console.log(`Treasury balance before claim: ${balanceBefore} lamports`);

    const claimed = await executeClaim(tokenMint, env);

    if (claimed) {
      const balanceAfter = await getSOLBalance(treasuryAddress, env);
      console.log(`Treasury balance after claim: ${balanceAfter} lamports`);

      const actualClaimed = balanceAfter - balanceBefore;
      return Math.max(0, actualClaimed);
    }

    return 0;
  } catch (error) {
    console.error('Failed to claim Pump.fun rewards:', error);
    return 0;
  }
}

async function executeClaim(tokenMint: string, env: Env): Promise<boolean> {
  if (env.PUMPFUN_API_KEY) {
    return await claimViaAPI(tokenMint, env);
  } else {
    return await claimViaTransaction(tokenMint, env);
  }
}

async function claimViaAPI(tokenMint: string, env: Env): Promise<boolean> {
  try {
    const response = await fetch('https://api.pump.fun/v1/claim', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.PUMPFUN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mint: tokenMint,
        receiver: env.TREASURY_ADDRESS
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Claim API result:', result);
      return true;
    }

    console.error('Claim API failed:', response.status, await response.text());
    return false;
  } catch (error) {
    console.error('Claim API error:', error);
    return false;
  }
}

async function claimViaTransaction(tokenMint: string, env: Env): Promise<boolean> {
  try {
    const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = await import('@solana/web3.js');
    const bs58 = await import('bs58');

    const connection = new Connection(env.RPC_URL);
    const payerKeypair = Keypair.fromSecretKey(bs58.default.decode(env.PAYOUT_SIGNER_SECRET));

    const treasuryPubkey = new PublicKey(env.TREASURY_ADDRESS);
    const tokenMintPubkey = new PublicKey(tokenMint);

    const claimInstruction = await buildClaimInstruction(
      tokenMintPubkey,
      treasuryPubkey,
      payerKeypair.publicKey
    );

    if (!claimInstruction) {
      console.error('Failed to build claim instruction');
      return false;
    }

    const transaction = new Transaction().add(claimInstruction);
    const signature = await connection.sendTransaction(transaction, [payerKeypair]);

    console.log(`Claim transaction sent: ${signature}`);

    await connection.confirmTransaction(signature, 'confirmed');
    console.log(`Claim transaction confirmed: ${signature}`);

    return true;
  } catch (error) {
    console.error('Claim transaction error:', error);
    return false;
  }
}

async function buildClaimInstruction(
  tokenMint: any,
  treasury: any,
  payer: any
): Promise<any | null> {
  try {
    const PUMPFUN_PROGRAM_ID = 'YOUR_PUMPFUN_PROGRAM_ID';

    return null;
  } catch (error) {
    console.error('Failed to build claim instruction:', error);
    return null;
  }
}

async function getSOLBalance(address: string, env: Env): Promise<number> {
  try {
    const { Connection, PublicKey } = await import('@solana/web3.js');
    const connection = new Connection(env.RPC_URL);
    const pubkey = new PublicKey(address);

    const balance = await connection.getBalance(pubkey);
    return balance;
  } catch (error) {
    console.error('Failed to get SOL balance:', error);
    return 0;
  }
}