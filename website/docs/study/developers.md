---
title: Machine access (x402)
topic: study
tags:
  - study
  - developers
  - x402
---

# Machine access (x402)

This website is free. Search in the header, follow a [study path](tracks/), and read every doctrine page without paying. Humans, SEO, and the site search box are not gated.

What follows is only for **agents and scripts** that want a machine API. x402 here is **HTTP 402**, not a GitHub pull request.

## Free vs paid

| Who | What |
|-----|------|
| Humans on GitHub Pages | Free HTML, free search |
| Agents hitting `/v1/search`, `/v1/ask`, lookups | x402 payment |

The scarce asset is the curated Catholic index (CCC, Scripture, councils, citation graph, study tracks) — not a generic theology chatbot.

## Paid routes (testnet default)

Base Sepolia (`eip155:84532`), facilitator `https://x402.org/facilitator`.

| Route | Price | Returns |
|-------|-------|---------|
| `GET /v1/search?q=` | $0.001 | Ranked hits |
| `GET /v1/topic/:topic` | $0.001 | Docs in a topic |
| `GET /v1/scripture?ref=` | $0.001 | Pages citing a verse |
| `GET /v1/ccc?n=` | $0.001 | Pages citing a CCC number |
| `GET /v1/document?path=` | $0.002 | One document |
| `GET /v1/ask?q=` | $0.005 | Short answer **plus citations** |

`GET /`, `GET /health`, and `GET /v1/stats` stay free. Unpaid agent calls return `PAYMENT-REQUIRED`.

Prefer `/v1/ask`, `/v1/scripture`, and `/v1/ccc` over dumping whole markdown.

## How an agent finds the API

1. `GET /` — free catalog of routes and prices.
2. Each paid 402 includes **Bazaar** metadata (query params + output examples) so a facilitator can list DaKnowledge after a settled payment.
3. Then search that facilitator’s discovery API (for example CDP Bazaar `/discovery/resources`).
4. Details: `api/README.md`.

Without Bazaar metadata the API is payable but undiscoverable.

## Run it

GitHub Pages does not run this server.

```bash
cp api/.env.example api/.env
# set PAY_TO_EVM_ADDRESS — do not commit it
npm run api
```

Mainnet later: `X402_NETWORK=eip155:8453` and a **production** facilitator, not x402.org.
