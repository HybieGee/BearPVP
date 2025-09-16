# Deployment Guide for Purple vs Yellow

## 🚀 Quick Setup Steps

### 1. Cloudflare Workers Setup

First, install Wrangler CLI:
```bash
npm install -g wrangler
```

Login to Cloudflare:
```bash
wrangler login
```

### 2. Create KV Namespaces

Run these commands to create the required KV namespaces:

```bash
# Create production namespaces
wrangler kv:namespace create "ROUNDS_KV"
wrangler kv:namespace create "HISTORY_KV"

# Create preview namespaces (for development)
wrangler kv:namespace create "ROUNDS_KV" --preview
wrangler kv:namespace create "HISTORY_KV" --preview
```

Copy the IDs returned and update `infra/wrangler.toml` with your actual IDs.

### 3. Deploy Durable Objects

First deployment requires creating the Durable Objects:

```bash
cd purple-vs-yellow
wrangler deploy --config infra/wrangler.toml
```

### 4. Set Worker Secrets

Set all required secrets for the Worker:

```bash
# Twitch credentials
wrangler secret put TWITCH_CLIENT_SECRET --config infra/wrangler.toml

# Solana configuration
wrangler secret put PAYOUT_SIGNER_SECRET --config infra/wrangler.toml
wrangler secret put RPC_URL --config infra/wrangler.toml

# Pump.fun
wrangler secret put PUMPFUN_API_KEY --config infra/wrangler.toml
```

### 5. Set Environment Variables

Set public environment variables:

```bash
wrangler secret put TREASURY_ADDRESS --config infra/wrangler.toml
wrangler secret put TOKEN_MINT --config infra/wrangler.toml
wrangler secret put TWITCH_CLIENT_ID --config infra/wrangler.toml
```

### 6. Cloudflare Pages Setup

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Create a new project
3. Connect your GitHub repository (`HybieGee/BearPVP`)
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Root directory: `/`

5. Set environment variables in Pages dashboard:
   - `NEXT_PUBLIC_NETWORK=mainnet`
   - `NEXT_PUBLIC_TWITCH_CHANNEL=beradottv2`

### 7. CV Service Deployment

The CV service needs to run on a container platform with access to process video streams.

#### Option A: Railway.app
```bash
cd cv
railway init
railway up
```

#### Option B: Google Cloud Run
```bash
cd cv
gcloud run deploy purple-vs-yellow-cv \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Option C: Docker on VPS
```bash
cd cv
docker build -t pvp-cv .
docker run -d -p 8080:8080 --name pvp-cv pvp-cv
```

After deployment, update the `CV_SERVICE_URL` in Worker environment.

## 🔧 Configuration Checklist

### Required Values to Obtain:

1. **Twitch API**
   - [ ] Create app at https://dev.twitch.tv/console/apps
   - [ ] Get Client ID
   - [ ] Get Client Secret

2. **Solana Setup**
   - [ ] Create funded keypair for payouts
   - [ ] Get RPC URL from Helius/QuickNode
   - [ ] Set treasury address for rewards

3. **Pump.fun Token**
   - [ ] Launch token on Pump.fun
   - [ ] Get token mint address
   - [ ] Configure claim mechanism

4. **Cloudflare IDs**
   - [ ] Get Account ID from Cloudflare dashboard
   - [ ] Create API token with Workers permissions
   - [ ] Note KV namespace IDs

## 📊 Monitoring

### Check Deployment Status:
```bash
# Worker status
wrangler tail --config infra/wrangler.toml

# KV data
wrangler kv:key list --binding=ROUNDS_KV --config infra/wrangler.toml
wrangler kv:key list --binding=HISTORY_KV --config infra/wrangler.toml
```

### Test Endpoints:
```bash
# Check health
curl https://your-worker.workers.dev/healthz

# Get current state
curl https://your-worker.workers.dev/api/state

# View history
curl https://your-worker.workers.dev/api/history
```

## 🎯 Score Detection Configuration

The CV service is configured to detect:
1. **Score in top-right corner** (white text showing current score)
2. **Winner text in center** (when match ends)

You can adjust detection areas by updating CV config:

```bash
curl -X POST http://your-cv-service/configure \
  -H "Content-Type: application/json" \
  -d '{
    "scoreBoundingBox": {"x": 0.7, "y": 0.05, "width": 0.25, "height": 0.15},
    "winnerBoundingBox": {"x": 0.3, "y": 0.4, "width": 0.4, "height": 0.2},
    "confidenceThreshold": 0.8
  }'
```

## 🚨 Important Notes

1. **Stream Access**: The CV service needs to capture frames from the Twitch stream. Ensure the stream is public and not subscriber-only.

2. **Payout Funding**: The payout signer wallet needs sufficient SOL for transaction fees. Monitor balance regularly.

3. **Rate Limits**: Twitch API has rate limits. The CV service samples frames every 1.5 seconds by default.

4. **Manual Override**: If automatic detection fails, you can manually set results:
```bash
curl -X POST https://your-worker.workers.dev/internal/result \
  -H "Content-Type: application/json" \
  -d '{"roundId":"current","winner":"purple","score":{"purple":3,"yellow":1}}'
```

## Support

For issues:
1. Check Worker logs in Cloudflare dashboard
2. Verify CV service health: `curl http://your-cv-service/health`
3. Check GitHub Actions deployment status
4. Review environment variables are all set correctly