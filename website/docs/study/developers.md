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

**Agents** that need machine-readable retrieval with citations use the **x402 HTTP API** — pay per request in USDC on Base, not a GitHub login or paywall on these pages.

| Who | What |
|-----|------|
| Humans on GitHub Pages | Free |
| Agents on `/v1/*` retrieval | Paid (x402, $0.05 per call) |

## Live API

**Base URL:** [https://daknowledge-x402.onrender.com](https://daknowledge-x402.onrender.com)

| Endpoint | Cost | Purpose |
|----------|------|---------|
| `GET /` | free | JSON catalog |
| `GET /.well-known/x402.json` | free | **Agent discovery catalog** (prices, schemas) |
| `GET /openapi.json` | free | OpenAPI 3.1 spec |
| `GET /health` | free | Health check |
| `GET /v1/stats` | free | Index statistics |
| `GET /v1/ask?q=` | $0.05 | **Start here** — cited answer from the index |
| `GET /v1/search?q=` | $0.05 | Full-text search |
| `GET /v1/document?path=` | $0.05 | Fetch one document |
| `GET /v1/topic/:topic` | $0.05 | Documents by topic |
| `GET /v1/scripture?ref=` | $0.05 | Pages citing a verse |
| `GET /v1/ccc?n=` | $0.05 | Pages citing a Catechism paragraph |

Unpaid agent calls return **HTTP 402** with a `PAYMENT-REQUIRED` header (x402 v2). Pay in USDC on Base mainnet (`eip155:8453`).

## How agents discover DaKnowledge

Agents can find this API without guessing URLs:

### 1. Well-known catalog + agent card (works today)

```bash
curl -s https://daknowledge-x402.onrender.com/.well-known/x402.json
curl -s https://daknowledge-x402.onrender.com/.well-known/agent.json
curl -s "https://daknowledge-x402.onrender.com/v1/ask?q=trinity&demo=1"
```

`/.well-known/x402.json` lists every paid route, price, schema, and demo link. `?demo=1` returns a free truncated preview with the same JSON shape as the paid response.

### 2. llms.txt (this site)

Agents crawling the human site should read [llms.txt](https://belongarobert.github.io/DaKnowledge/llms.txt).

### 3. Public directories

| Directory | How agents find DaKnowledge |
|-----------|-----------------------------|
| Coinbase CDP Bazaar | After first settled payment: [search](https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=DaKnowledge) or [MCP](https://api.cdp.coinbase.com/platform/v2/x402/discovery/mcp) |
| x402 List | [x402-list.com](https://x402-list.com/services?q=DaKnowledge) (submit via `scripts/submit-directories.mjs`) |
| AgentGrade | Scans `/.well-known/x402.json` + live 402 |

Operator checklist: `api/MARKETING.md`.

## Recommended agent workflow

Think of each call as a **pull request for information** — you ask, pay a small fee, receive cited JSON:

1. **Preview:** `GET /v1/ask?q=…&demo=1` (free)
2. **`GET /v1/ask?q=…`** — short answer + Scripture, CCC, and source paths ($0.05)
3. **`GET /v1/search?q=…`** — explore related documents
4. **`GET /v1/document?path=…`** — full text for a specific page
5. **`GET /v1/scripture?ref=…`** or **`GET /v1/ccc?n=…`** — verse or paragraph lookups

Prefer `/v1/ask` and targeted lookups over bulk-fetching whole topics.

## Example (manual x402)

```bash
# 1. Unpaid request → 402 + PAYMENT-REQUIRED header
curl -sD - "https://daknowledge-x402.onrender.com/v1/ask?q=trinity" -o /dev/null

# 2. Agent wallet signs payment per x402 v2, retries with PAYMENT-SIGNATURE header
#    (use @x402/core client or @x402/mcp for production agents)
```

For production agents, use the [x402 buyer quickstart](https://docs.cdp.coinbase.com/x402/buyer/quickstart) or connect to the Bazaar MCP server.

## Run locally

GitHub Pages does not host the API. Deploy as a **Render Web Service**, or locally:

```bash
cp api/.env.example api/.env
# set PAY_TO_EVM_ADDRESS
npm run api
```

Details: `api/README.md` in the repository.
