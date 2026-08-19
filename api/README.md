# DaKnowledge x402 API

**Site free / agents paid.** GitHub Pages stays free. This Node process is the agent API only.

**Live:** https://daknowledge-x402.onrender.com

## Agent discovery

Agents should find this service without manual configuration:

| URL | Purpose |
|-----|---------|
| `GET /.well-known/x402.json` | x402 catalog (services, prices, schemas) |
| `GET /openapi.json` | OpenAPI 3.1 |
| `GET /` | JSON index with links |
| `GET /robots.txt` | Points crawlers at discovery URLs |
| [llms.txt](https://belongarobert.github.io/DaKnowledge/llms.txt) | On the human site (GitHub Pages) |

**Bazaar (CDP):** after a settled payment, DaKnowledge can appear in [CDP discovery search](https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=DaKnowledge) and the [Bazaar MCP server](https://api.cdp.coinbase.com/platform/v2/x402/discovery/mcp).

Check listing: `node scripts/check-bazaar-listing.mjs`

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
| `X402_NETWORK` | `eip155:8453` (mainnet) or `eip155:84532` (testnet) |
| `FACILITATOR_URL` | CDP mainnet URL or `https://x402.org/facilitator` |
| `PUBLIC_BASE_URL` | your `https://….onrender.com` URL |
| `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` | mainnet only |

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
| `GET /`, `/.well-known/x402.json`, `/openapi.json`, `/health`, `/v1/stats` | free |
| `GET /v1/search?q=` | `$0.05` |
| `GET /v1/topic/:topic` | `$0.05` |
| `GET /v1/scripture?ref=` | `$0.05` |
| `GET /v1/ccc?n=` | `$0.05` |
| `GET /v1/document?path=` | `$0.05` |
| `GET /v1/ask?q=` | `$0.05` (answer + citations) |

Unpaid agent calls → HTTP **402** + `PAYMENT-REQUIRED`. Paid routes include Bazaar discovery metadata.

**Recommended flow:** `/v1/ask` → `/v1/search` → `/v1/document` → `/v1/scripture` or `/v1/ccc`.

## Mainnet

`X402_NETWORK=eip155:8453` + Coinbase CDP keys (`CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`). Not the x402.org facilitator.
