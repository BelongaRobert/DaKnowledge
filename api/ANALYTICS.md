# DaKnowledge analytics & weekly reports

Privacy-first monitoring for the free MkDocs site and the paid x402 API.

## What is wired up

| Surface | How |
|---------|-----|
| Human pageviews | Beacon in `website/docs/javascripts/analytics.js` → `POST /v1/collect` |
| Agent / API traffic | Middleware counts demos, HTTP 402s, paid 200s, settlements |
| Live JSON | `GET https://daknowledge-x402.onrender.com/metrics` |
| Detail JSON | `GET /metrics/detail` (optionally gated by `METRICS_TOKEN`) |
| Durable history | GitHub Action writes `data/analytics/*.json` + `latest.md` every Monday |
| Human inbox | Same Action opens/updates a GitHub Issue labeled `analytics` |
| Cursor ping | Weekly timer in the Site activity chat summarizes the Issue + live metrics |

Optional: [GoatCounter](https://www.goatcounter.com) — set `extra.goatcounter` in `website/mkdocs.yml` to your site code for a public dashboard.

## Live endpoints

```bash
curl -s https://daknowledge-x402.onrender.com/metrics | jq
curl -s https://daknowledge-x402.onrender.com/metrics/detail | jq
# If METRICS_TOKEN is set on Render:
curl -s -H "X-Metrics-Token: $METRICS_TOKEN" \
  https://daknowledge-x402.onrender.com/metrics/detail | jq
```

Manual report (same payload the cron uses):

```bash
node scripts/weekly-analytics-report.mjs
node scripts/weekly-analytics-report.mjs --write
```

## Render env (recommended)

| Name | Purpose |
|------|---------|
| `METRICS_TOKEN` | Protects `/metrics/detail` (optional but recommended) |
| `X402_ACCESS_LOG` | Optional NDJSON access log path on the instance |

Add the same `METRICS_TOKEN` as a **GitHub Actions secret** so the weekly job can fetch detail metrics.

## GitHub

- Workflow: `.github/workflows/analytics-weekly.yml`
- Schedule: Mondays **13:00 UTC** (~9 AM Eastern during EDT)
- Also runnable via **Actions → Weekly analytics report → Run workflow**
- Snapshots land in `data/analytics/`
- Issues use label `analytics` and title `Weekly analytics — YYYY-Www`

Watch the repo (or enable Issues notifications) to get emailed when the weekly Issue opens.

## Caveats

- Render free tier **cold-starts wipe in-memory counters**. The weekly Action persists a snapshot; treat `/metrics` as “since last wake,” not forever.
- No cookies, no fingerprinting, no IP storage — path, referrer host, coarse UA class only.
- GitHub traffic (views/clones) needs the Actions `GITHUB_TOKEN` (included) for this repo.

## Operator checklist after merge

1. Confirm Render redeployed `api/server.js` (`/health` shows `"analytics": true`).
2. Confirm GitHub Pages rebuild includes the beacon (view-source for `analytics.js`).
3. Open the site once, then hit `/metrics` — `lifetime.pageviews` should bump.
4. Run **Weekly analytics report** once manually from the Actions tab.
5. (Optional) Create GoatCounter + set `extra.goatcounter` in `mkdocs.yml`.
6. (Optional) Set `METRICS_TOKEN` on Render and as a repo secret.
7. Fix the dead Vercel homepage in GitHub repo settings → Homepage URL → `https://belongarobert.github.io/DaKnowledge/`.
