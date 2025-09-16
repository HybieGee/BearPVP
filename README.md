# Purple vs Yellow - Live Predictor with Automatic Payouts

A real-time prediction platform where users predict winners of continuous Twitch stream matches. Features automatic score detection, free predictions, and equal SOL payouts from Pump.fun creator rewards.

## 🎯 How It Works

1. **Watch** the live Twitch stream (`twitch.tv/beradottv2`)
2. **Predict** Purple or Yellow to win (first to 3 goals)
3. **Connect** your Solana wallet (free predictions, no staking)
4. **Win** and receive equal share of creator rewards automatically

## 🏗️ Architecture

- **Frontend**: Next.js + TypeScript + TailwindCSS
- **Backend**: Cloudflare Workers + Durable Objects + KV
- **Oracle**: Node.js + OpenCV for score detection
- **Blockchain**: Solana (payouts via Web3.js)
- **Hosting**: Cloudflare Pages (auto-deploy from GitHub)

## 📁 Project Structure

```
/app                    # Next.js pages (App Router)
/components            # React UI components
/lib                   # Shared types and utilities
/worker               # Cloudflare Worker (API + automation)
  ├── index.ts         # Main worker entry point
  ├── round-manager.ts # Durable Object for state
  ├── handlers.ts      # API endpoint handlers
  ├── settlement.ts    # Payout processing
  ├── pumpfun.ts      # Creator rewards claiming
  ├── payout.ts       # SOL distribution
  └── oracle.ts       # Result processing
/cv                   # Computer vision service
  ├── Dockerfile      # Container configuration
  ├── server.js       # Express API server
  └── frameProcessor.js # Score detection logic
/tools               # Utilities and scripts
/infra               # Deployment configuration
/.github/workflows   # CI/CD automation
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd purple-vs-yellow
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Network
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_TWITCH_CHANNEL=beradottv2

# Timing
ROUND_OPEN_SECONDS=90
LOCK_TO_RESULT_TIMEOUT_SECONDS=300

# Twitch API (get from https://dev.twitch.tv/console/apps)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Solana RPC (get from Helius/QuickNode)
RPC_URL=https://api.mainnet-beta.solana.com
PAYOUT_SIGNER_SECRET=your_base58_private_key
TREASURY_ADDRESS=your_treasury_public_address

# Pump.fun (configure after token launch)
PUMPFUN_API_KEY=your_pumpfun_api_key
TOKEN_MINT=your_token_mint_address

# Computer Vision
CV_CONFIDENCE_THRESHOLD=0.9
CONSECUTIVE_FRAME_REQUIREMENT=6
CV_SERVICE_URL=http://localhost:8080

# Testing
LIVE_TESTING=true
```

### 3. Local Development

```bash
# Start Next.js frontend
npm run dev

# Start CV service (in separate terminal)
cd cv
npm install
npm start

# Start Cloudflare Worker (in separate terminal)
npx wrangler dev --config infra/wrangler.toml
```

## 🔧 Required Configuration

### Twitch API Setup

1. Visit [Twitch Developers Console](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`

### Solana Configuration

1. **RPC URL**: Get from [Helius](https://helius.xyz) or [QuickNode](https://quicknode.com)
2. **Payout Signer**: Generate funded keypair for payouts
3. **Treasury**: Address that receives Pump.fun creator rewards

```bash
# Generate new keypair (save securely!)
solana-keygen new --outfile payout-keypair.json

# Get public address
solana-keygen pubkey payout-keypair.json

# Fund with SOL for transaction fees
solana transfer <address> 1 --allow-unfunded-recipient
```

### Pump.fun Token Setup

1. Launch token on [Pump.fun](https://pump.fun)
2. Set `TOKEN_MINT` to your token's mint address
3. Configure `PUMPFUN_API_KEY` (if API available) or implement claim logic
4. Set `TREASURY_ADDRESS` to receive creator rewards

## 🌐 Deployment

### Cloudflare Pages Setup

1. **Create KV Namespaces**:
   ```bash
   npx wrangler kv:namespace create "ROUNDS_KV"
   npx wrangler kv:namespace create "HISTORY_KV"
   ```

2. **Update `wrangler.toml`** with your KV IDs

3. **Set Secrets**:
   ```bash
   npx wrangler secret put TWITCH_CLIENT_SECRET
   npx wrangler secret put PAYOUT_SIGNER_SECRET
   npx wrangler secret put PUMPFUN_API_KEY
   ```

### GitHub Actions Setup

1. Add repository secrets in GitHub Settings:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - All environment variables from `.env.example`

2. Push to `main` branch triggers auto-deployment

### CV Service Deployment

Deploy the computer vision service to your preferred platform:

```bash
# Build and push Docker image
cd cv
docker build -t purple-vs-yellow-cv .
docker push your-registry.com/purple-vs-yellow-cv

# Deploy to your platform (examples):
# Railway: railway deploy
# Render: Use web dashboard
# Google Cloud Run: gcloud run deploy
# AWS ECS: aws ecs update-service
```

Update `CV_SERVICE_URL` environment variable with deployed URL.

## 🎮 Game Mechanics

### Round Lifecycle

1. **OPEN** (90s): Predictions accepted, users connect wallets
2. **LOCKED**: Match in progress, score tracked automatically
3. **SETTLING**: Claim rewards → Calculate winners → Send payouts
4. **RESETTING**: Clear state → Start new round

### Payout Logic

- **Free predictions**: No SOL required to participate
- **Equal split**: Total rewards ÷ number of correct predictors
- **Automatic**: Direct SOL transfer to winner wallets
- **Minimum payout**: Holdings accumulate if per-wallet amount too small

### Void Conditions

Rounds are voided (no payouts) if:
- Stream disconnects for extended period
- Score detection confidence too low
- Oracle processing timeout
- Technical errors prevent fair resolution

## 🔍 Monitoring & Debugging

### Check Round Status
```bash
curl https://your-worker.workers.dev/api/state
```

### View History
```bash
curl https://your-worker.workers.dev/api/history
```

### Verify Payouts
```bash
node tools/check-payouts.js round_12345
```

### CV Service Health
```bash
curl http://your-cv-service/health
```

## 🛠️ Manual Overrides

For emergency situations:

### Manual Result Setting
```bash
curl -X POST https://your-worker.workers.dev/internal/result \
  -H "Content-Type: application/json" \
  -d '{"roundId":"round_123","winner":"purple","score":{"purple":3,"yellow":1}}'
```

### Force Settlement
```bash
curl -X POST https://your-worker.workers.dev/internal/settle
```

### Retry Failed Payouts
Use the `check-payouts.js` tool to identify and retry failed transactions.

## 📊 Analytics

The system tracks:
- Prediction counts per side
- Round duration and outcomes
- Payout success rates
- CV confidence scores
- User engagement metrics

Access via Cloudflare Analytics dashboard or implement custom reporting.

## 🔒 Security Notes

- **Private keys**: Store securely in Cloudflare Workers Secrets
- **Rate limiting**: Implemented on prediction endpoints
- **Wallet validation**: Signatures required for predictions
- **Payout verification**: All transactions logged and verifiable
- **Oracle integrity**: Multiple consecutive readings required

## 🐛 Troubleshooting

### Common Issues

1. **"Predictions are closed"**: Round may be locked or settling
2. **"Already predicted"**: One prediction per wallet per round
3. **"Failed to submit prediction"**: Check wallet connection
4. **CV service timeout**: Verify service deployment and health
5. **Payout failures**: Check signer balance and RPC connectivity

### Debug Steps

1. Check worker logs in Cloudflare dashboard
2. Verify CV service is responding to health checks
3. Confirm all environment variables are set
4. Test API endpoints directly with curl
5. Monitor Solana transaction status on Solscan

## 📝 API Reference

### Public Endpoints

- `GET /api/state` - Current round status
- `POST /api/predict` - Submit prediction
- `GET /api/history` - Past round results
- `GET /healthz` - Service health

### Internal Endpoints (Worker only)

- `POST /internal/result` - Oracle result submission
- `POST /internal/settle` - Trigger settlement
- `POST /internal/lock` - Lock round for predictions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Test thoroughly in development
4. Submit pull request with clear description

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check troubleshooting section above
2. Review Cloudflare Workers logs
3. Verify all configuration values
4. Create GitHub issue with full error details

---

**⚠️ Important**: This system handles real SOL payouts. Test thoroughly on devnet before mainnet deployment.