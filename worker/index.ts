import { RoundManager } from './round-manager';
import { handlePredict, handleState, handleHistory } from './handlers';
import { handleSettle } from './settlement';
import { handleResult } from './oracle';

export interface Env {
  ROUND_MANAGER: DurableObjectNamespace;
  ROUNDS_KV: KVNamespace;
  HISTORY_KV: KVNamespace;

  ROUND_OPEN_SECONDS: string;
  LOCK_TO_RESULT_TIMEOUT_SECONDS: string;

  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;

  RPC_URL: string;
  PAYOUT_SIGNER_SECRET: string;
  TREASURY_ADDRESS: string;

  PUMPFUN_API_KEY: string;
  TOKEN_MINT: string;

  CV_CONFIDENCE_THRESHOLD: string;
  CONSECUTIVE_FRAME_REQUIREMENT: string;

  LIVE_TESTING: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (path) {
        case '/api/predict':
          if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
          }
          return handlePredict(request, env);

        case '/api/state':
          if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
          }
          return handleState(env);

        case '/api/history':
          if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
          }
          return handleHistory(env);

        case '/internal/result':
          if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
          }
          return handleResult(request, env);

        case '/internal/settle':
          if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
          }
          return handleSettle(request, env);

        case '/healthz':
          return new Response('OK', { headers: corsHeaders });

        default:
          return new Response('Not found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    switch (event.cron) {
      case '*/5 * * * *':
        await checkRoundHealth(env);
        break;
      case '*/1 * * * *':
        if (env.LIVE_TESTING === 'true') {
          await processOracleFrames(env);
        }
        break;
    }
  }
};

async function checkRoundHealth(env: Env) {
  const id = env.ROUND_MANAGER.idFromName('current');
  const stub = env.ROUND_MANAGER.get(id);

  const response = await stub.fetch('http://internal/health');
  const health = await response.json();

  console.log('Round health check:', health);
}

async function processOracleFrames(env: Env) {
  const id = env.ROUND_MANAGER.idFromName('current');
  const stub = env.ROUND_MANAGER.get(id);

  const stateRes = await stub.fetch('http://internal/state');
  const state = await stateRes.json();

  if (state.phase === 'LOCKED') {
    const oracleUrl = env.CV_SERVICE_URL || 'http://localhost:8080';
    const frameRes = await fetch(`${oracleUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'beradottv2',
        roundId: state.roundId
      })
    });

    if (frameRes.ok) {
      const result = await frameRes.json();
      if (result.winner) {
        await handleResult(
          new Request('http://internal/result', {
            method: 'POST',
            body: JSON.stringify(result)
          }),
          env
        );
      }
    }
  }
}

export { RoundManager };