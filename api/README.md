# DaKnowledge x402 API (live)

The public MkDocs site on GitHub Pages stays **free**. This Express server is the paid HTTP API for bots and agents. It charges **live USDC on Base mainnet**. It does not paywall browsing, SEO, or the site search box.

x402 is HTTP 402 payments (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE`). It is not related to GitHub pull requests.

## Receiver

Live USDC on Base settles to `0xF81796579285356c207ec7c16db3f065eD45c88B`. That is a public address. Keep the private key in the wallet, never in this repo.

Still required to take payment:

1. A **Coinbase CDP** secret API key (`CDP_API_KEY_ID` + `CDP_API_KEY_SECRET`) from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com/). The production facilitator is CDP, not `x402.org`.
2. A public HTTPS host for this process (Render blueprint included). GitHub Pages cannot run it.

## Run locally against mainnet

```bash
cp api/.env.example api/.env
# set CDP_API_KEY_ID and CDP_API_KEY_SECRET
npm install
npm run api
```

Default listen address: `http://0.0.0.0:4021`.

## Routes

| Route | Price (USDC on Base) | Auth |
|-------|----------------------|------|
| `GET /` | free | discovery |
| `GET /health` | free | liveness |
| `GET /v1/search?q=` | `$0.001` | x402 |
| `GET /v1/document?path=` | `$0.002` | x402 |
| `GET /v1/topic?id=` | `$0.001` | x402 |

Unpaid calls to `/v1/*` return **HTTP 402** with a `PAYMENT-REQUIRED` header. After a paid call settles through CDP, the route can appear in the x402 Bazaar for other agents.

Examples after payment:

```text
GET /v1/search?q=hypostatic
GET /v1/document?path=site/christology/hypostatic-union.md
GET /v1/topic?id=trinity
```

## Deploy (Render)

`render.yaml` at the repo root defines a Node web service and already sets the receiver address. Connect this GitHub repo in Render, then set:

- `CDP_API_KEY_ID`
- `CDP_API_KEY_SECRET`
- `PUBLIC_BASE_URL` (the `https://…` hostname Render assigns, or your custom domain)

Railway and Fly can run the same `Dockerfile` / `Procfile` (`node api/server.js`) with those env vars. Do **not** change the GitHub Pages workflow; the static site must stay independent.

## Defaults

- Network: Base mainnet (`eip155:8453`)
- Facilitator: Coinbase CDP (`https://api.cdp.coinbase.com/platform/v2/x402`)
- Prices: `$0.001`–`$0.002` USDC

Testnet (`eip155:84532` + `https://x402.org/facilitator`) is only for `npm test`. It will not generate revenue.
