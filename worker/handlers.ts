import { Env } from './index';
import { PredictionSide } from '../lib/types';

export async function handlePredict(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { wallet: string; side: PredictionSide };

    if (!body.wallet || !body.side) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet or side' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!['purple', 'yellow'].includes(body.side)) {
      return new Response(
        JSON.stringify({ error: 'Invalid side' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const id = env.ROUND_MANAGER.idFromName('current');
    const stub = env.ROUND_MANAGER.get(id);

    const response = await stub.fetch('http://internal/predict', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return new Response(
      await response.text(),
      {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('Predict error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process prediction' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function handleState(env: Env): Promise<Response> {
  try {
    const id = env.ROUND_MANAGER.idFromName('current');
    const stub = env.ROUND_MANAGER.get(id);

    const response = await stub.fetch('http://internal/state');
    const state = await response.json();

    return new Response(
      JSON.stringify(state),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('State error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get state' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function handleHistory(env: Env): Promise<Response> {
  try {
    const history = await env.HISTORY_KV.list({ prefix: 'round_' });
    const rounds = [];

    for (const key of history.keys) {
      const data = await env.HISTORY_KV.get(key.name, 'json');
      if (data) {
        rounds.push(data);
      }
    }

    rounds.sort((a: any, b: any) => b.endTime - a.endTime);

    return new Response(
      JSON.stringify(rounds.slice(0, 50)),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('History error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get history' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}