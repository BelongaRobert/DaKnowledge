# DaKnowledge — Agent marketing & discovery

> How AI agents find and pull from this knowledge base.

## Live endpoints (start here)

| URL | Purpose |
|-----|---------|
| https://daknowledge-x402.onrender.com/.well-known/x402.json | x402 service catalog |
| https://daknowledge-x402.onrender.com/.well-known/agent.json | Agent card (skills + prices) |
| https://daknowledge-x402.onrender.com/openapi.json | OpenAPI 3.1 |
| https://belongarobert.github.io/DaKnowledge/llms.txt | Site-level agent index |
| https://belongarobert.github.io/DaKnowledge/study/developers/ | Human docs |

Free preview (no wallet): add `?demo=1` to any `/v1` route, e.g.  
`https://daknowledge-x402.onrender.com/v1/ask?q=trinity&demo=1`

Paid pull: same URL without `demo` → HTTP 402 → pay $0.05 USDC on Base → retry with `PAYMENT-SIGNATURE`.

## Recommended agent pull flow

1. `GET /v1/ask?q=…` — cited answer (Scripture, CCC, source paths)
2. `GET /v1/search?q=…` — explore
3. `GET /v1/document?path=…` — full page
4. `GET /v1/scripture?ref=…` / `GET /v1/ccc?n=…` — lookups

## Directory listings

| Directory | Status / how |
|-----------|----------------|
| **Well-known / OpenAPI / llms.txt** | Live now (crawlable) |
| **Coinbase CDP Bazaar** | Listed after first settled payment via CDP. Check: `node scripts/check-bazaar-listing.mjs` |
| **Bazaar MCP** | `https://api.cdp.coinbase.com/platform/v2/x402/discovery/mcp` |
| **x402 List** | Submit: `node scripts/submit-directories.mjs --submit` (onrender.com requires $1 USDC review fee) |
| **AgentGrade** | Scans `/.well-known/x402.json` + live 402 — no form |
| **The Spawn** | Register public API URL + demo once metadata is ready |

## Operator commands

```bash
# Verify all discovery surfaces after deploy
node scripts/broadcast-discovery.mjs

# Dry-run directory payload
node scripts/submit-directories.mjs

# Submit to x402-list (may return 402 for $1 free-host fee)
SUBMIT_EMAIL=belongarobert@gmail.com node scripts/submit-directories.mjs --submit
```

## Seed CDP Bazaar

Bazaar catalogs a route after CDP settles a real payment. Make one paid call to each route (or at least `/v1/ask` and `/v1/search`) with an x402 buyer wallet on Base mainnet.
