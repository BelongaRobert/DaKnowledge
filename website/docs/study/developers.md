---
title: For developers
topic: study
tags:
  - study
  - developers
  - x402
---

# For developers

This website is free. Search in the header, follow a [study path](tracks/), and read every doctrine page without paying.

What follows is only for **agents and scripts**. Humans browsing GitHub Pages are not gated.

## Live paid API

Bots that pull the index programmatically pay **USDC on Base mainnet** (`eip155:8453`) via [x402](https://www.x402.org/) (HTTP 402). That is not a GitHub pull request, and it is not a login wall on these pages.

| Route | Price |
|-------|-------|
| `GET /v1/search?q=` | $0.001 |
| `GET /v1/document?path=` | $0.002 |
| `GET /v1/topic?id=` | $0.001 |

An unpaid call returns `PAYMENT-REQUIRED`. A client that can pay retries with `PAYMENT-SIGNATURE`. Settlement uses the Coinbase CDP production facilitator, not the x402.org testnet facilitator.

The published site search, SEO, and page HTML stay free.

## Host it

GitHub Pages does not run this server. From the repository:

```bash
cp api/.env.example api/.env
# PAY_TO_EVM_ADDRESS = your Base mainnet wallet
# CDP_API_KEY_ID / CDP_API_KEY_SECRET from portal.cdp.coinbase.com
npm run api
```

Deploy `api/server.js` (see `render.yaml` and `api/README.md`). Set `PUBLIC_BASE_URL` to the HTTPS hostname. After the first settled payment, agents can discover the routes in the x402 Bazaar.
