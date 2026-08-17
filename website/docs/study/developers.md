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

What follows is only for **agents and scripts** that want a machine API. Humans browsing GitHub Pages are not gated.

## What is paid

An optional [x402](https://www.x402.org/) server can expose three routes:

| Route | Price (testnet default) |
|-------|-------------------------|
| `GET /v1/search?q=` | $0.001 |
| `GET /v1/document?path=` | $0.002 |
| `GET /v1/topic?id=` | $0.001 |

x402 uses **HTTP 402**. An unpaid call returns `PAYMENT-REQUIRED`. A client that can pay retries with `PAYMENT-SIGNATURE`. This is not a GitHub pull request, and it is not a login wall on the docs.

The published site search, SEO, and page HTML stay free.

## Run the API (optional)

From the repository, not from GitHub Pages:

```bash
cp api/.env.example api/.env
# set PAY_TO_EVM_ADDRESS
npm run api
```

Defaults: Base Sepolia (`eip155:84532`), prices `$0.001`–`$0.002`, facilitator `https://x402.org/facilitator`. See `api/README.md`.

The Pages deploy workflow does not start this server. Deploy it yourself later (Railway, Render, Fly) if you want it on the public internet. For Base mainnet, switch to `eip155:8453` and a **production** facilitator — not the x402.org testnet facilitator.
