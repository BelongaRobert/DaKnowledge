# DaKnowledge x402 API

**Site free / agents paid.** GitHub Pages stays free. This Node process is the agent API only.

## Render (Web Service)

Create a **Web Service** (not Static Site). Connect this repo, then:

- Build: `npm ci`
- Start: `node api/server.js`
- Health check: `/health`

Env vars:

| Name | Value |
|------|--------|
| `PAY_TO_EVM_ADDRESS` | your Base wallet (required) |
| `HOST` | `0.0.0.0` |
| `X402_NETWORK` | `eip155:84532` (testnet) |
| `FACILITATOR_URL` | `https://x402.org/facilitator` |
| `PUBLIC_BASE_URL` | your `https://….onrender.com` URL |

`PORT` is set by Render. Do not commit secrets. Blueprint: `render.yaml`.

## Local

```bash
cp api/.env.example api/.env
# set PAY_TO_EVM_ADDRESS
npm run api
```

## Routes

| Route | Cost |
|-------|------|
| `GET /`, `/health`, `/v1/stats` | free |
| `GET /v1/search?q=` | `$0.05` |
| `GET /v1/topic/:topic` | `$0.05` |
| `GET /v1/scripture?ref=` | `$0.05` |
| `GET /v1/ccc?n=` | `$0.05` |
| `GET /v1/document?path=` | `$0.05` |
| `GET /v1/ask?q=` | `$0.05` (answer + citations) |

Unpaid agent calls → HTTP **402** + `PAYMENT-REQUIRED`. Paid routes include Bazaar discovery metadata. `GET /` is the free catalog.

## Mainnet later

`X402_NETWORK=eip155:8453` + Coinbase CDP keys (`CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`). Not the x402.org facilitator.
