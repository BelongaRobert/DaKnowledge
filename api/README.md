# DaKnowledge x402 API

The public MkDocs site on GitHub Pages stays **free**. This Express server is an optional, paid HTTP API for agents and scripts. It does not paywall browsing, SEO, or the site search box.

x402 is HTTP 402 payments (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE`). It is not related to GitHub pull requests.

## Run locally

From the repository root:

```bash
cp api/.env.example api/.env
# set PAY_TO_EVM_ADDRESS to your Base Sepolia wallet
npm install
npm run api
```

Default listen address: `http://localhost:4021`.

## Routes

| Route | Price | Auth |
|-------|-------|------|
| `GET /` | free | discovery |
| `GET /health` | free | liveness |
| `GET /v1/search?q=` | `$0.001` | x402 |
| `GET /v1/document?path=` | `$0.002` | x402 |
| `GET /v1/topic?id=` | `$0.001` | x402 |

Unpaid calls to `/v1/*` return **HTTP 402** with a `PAYMENT-REQUIRED` header.

Examples after payment:

```text
GET /v1/search?q=hypostatic
GET /v1/document?path=site/christology/hypostatic-union.md
GET /v1/topic?id=trinity
```

Document paths are engine paths (`site/...` for published pages, `topics/...` for research drafts).

## Defaults

- Network: Base Sepolia (`eip155:84532`)
- Facilitator: `https://x402.org/facilitator` (testnet / quickstart only)
- Prices: `$0.001`–`$0.002` USDC

## Deploy (optional)

Host `api/server.js` on Railway, Render, or Fly. Set `PAY_TO_EVM_ADDRESS`, `PORT`, and keep the GitHub Pages workflow unchanged — the static site must not depend on this process.

## Mainnet later

Switch only when you mean to take real USDC:

1. `X402_NETWORK=eip155:8453` (Base mainnet, not `84532`)
2. Point `FACILITATOR_URL` at a **production** facilitator (for example Coinbase CDP: `https://api.cdp.coinbase.com/platform/v2/x402` with CDP API credentials)
3. Do **not** keep `https://x402.org/facilitator` on mainnet — that public facilitator is for testnet development
