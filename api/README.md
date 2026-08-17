# DaKnowledge x402 API

The public MkDocs site on GitHub Pages stays **free**. This Express server is a machine API for agents. Humans browsing, SEO, and the site search box are not gated.

x402 is HTTP 402 payments (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE`). It is not a GitHub pull request.

## Free vs agent split

| Surface | Cost |
|---------|------|
| GitHub Pages HTML, human search, citation index | free |
| `GET /`, `GET /health`, `GET /v1/stats` | free |
| Programmatic `/v1/search`, `/v1/document`, `/v1/topic/:topic`, `/v1/scripture`, `/v1/ccc`, `/v1/ask` | x402 |

## Run (testnet)

```bash
cp api/.env.example api/.env
# set PAY_TO_EVM_ADDRESS (do not commit it)
npm install
npm run api
```

Defaults: Base Sepolia (`eip155:84532`), facilitator `https://x402.org/facilitator`, listen `http://0.0.0.0:4021`.

## Paid routes

| Route | Price |
|-------|-------|
| `GET /v1/search?q=` | `$0.001` |
| `GET /v1/topic/:topic` | `$0.001` |
| `GET /v1/scripture?ref=` | `$0.001` |
| `GET /v1/ccc?n=` | `$0.001` |
| `GET /v1/document?path=` | `$0.002` |
| `GET /v1/ask?q=` | `$0.005` |

Unpaid `/v1` agent calls return **HTTP 402** with `PAYMENT-REQUIRED`. `/v1/ask` returns a short answer **plus citations** (CCC, verses, source paths) from the curated index — not a generic LLM dump.

`GET /v1/document?full=1` includes markdown. Prefer `/v1/ask`, `/v1/scripture`, and `/v1/ccc` for retrieval.

## How an agent discovers this API

1. **Local catalog:** `GET /` lists routes, prices, and this discovery note. No payment.
2. **x402 Bazaar extension:** each paid route declares input query params and output JSON examples via `@x402/extensions/bazaar`. Facilitators that catalog Bazaar metadata can list DaKnowledge after a **settled** payment (verify alone is not enough).
3. **Facilitator discovery APIs:** for example CDP `GET /discovery/resources` / search, or a facilitator’s `/discovery/resources`. Point crawlers at `PUBLIC_BASE_URL`.
4. **This README** and the Study page *Machine access (x402)*.

Without (2), a 402 response is payable but hard for agents to find. The bazaar block is the listing.

## Analytics

Each paid `/v1` response logs one JSON line to stdout: route, truncated query, amount, `402` / `200` / other status, and settle success or `settle_failure`. Set `X402_ACCESS_LOG` to also append those lines to a file.

## Mainnet later

Only after testnet 402 works:

1. `X402_NETWORK=eip155:8453`
2. A **production** facilitator (Coinbase CDP), **not** `https://x402.org/facilitator`
3. `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`

GitHub Pages stays independent of this process. Optional host: `render.yaml` / `Dockerfile` with `PAY_TO_EVM_ADDRESS` set in the host’s env, never in git.
