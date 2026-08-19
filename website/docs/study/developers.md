---
title: Machine access (x402)
topic: study
tags:
  - study
  - developers
  - x402
---

# Machine access (x402)

This website is free. Search, study paths, and every doctrine page stay ungated.

Agents and scripts that want a machine API use **x402** (HTTP 402), not a GitHub login or paywall on these pages.

| Who | What |
|-----|------|
| Humans on GitHub Pages | Free |
| Agents on `/v1/*` retrieval | Paid (x402) |

## Paid routes (testnet default)

| Route | Price |
|-------|-------|
| `GET /v1/search?q=` | $0.05 |
| `GET /v1/topic/:topic` | $0.05 |
| `GET /v1/scripture?ref=` | $0.05 |
| `GET /v1/ccc?n=` | $0.05 |
| `GET /v1/document?path=` | $0.05 |
| `GET /v1/ask?q=` | $0.05 (answer + citations) |

Free: `GET /`, `/health`, `/v1/stats`. Prefer `/v1/ask`, `/v1/scripture`, and `/v1/ccc` over dumping whole pages.

## Discovery

`GET /` lists routes. Paid 402 responses include Bazaar metadata so facilitators can catalog the API after a settled payment. Details: `api/README.md`.

## Run

GitHub Pages does not host this. Deploy as a **Render Web Service**, or locally:

```bash
cp api/.env.example api/.env
# set PAY_TO_EVM_ADDRESS
npm run api
```
