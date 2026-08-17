# DaKnowledge

Catholic biblical theology knowledge base: Scripture, Tradition, and the Triune God.

## Structure

- `website/` — published MkDocs site
- `data/` — research notes and extracted sources
- `content/` — project memory (plans, personal formation)
- `ingest/` — inbox for physical books, scans, and OCR
- `templates/` — page and source-note templates
- `src/` — index engine, ingest, and validation

## Working on the site

```bash
npm install
pip install -r requirements.txt
cd website && mkdocs serve
```

## Ingesting a physical book

Drop photos or a text dump in `ingest/inbox/<book-slug>/`, then:

```bash
npm run ingest -- <book-slug>
```

See `ingest/README.md` and `content/optimization-plan.md`.

## Optional x402 API (live USDC)

The GitHub Pages site stays free. Bots and agents pay on **Base mainnet**:

```bash
cp api/.env.example api/.env
# CDP_API_KEY_ID, CDP_API_KEY_SECRET
npm run api
```

USDC on Base settles to `0xF81796579285356c207ec7c16db3f065eD45c88B`.

Paid routes: `/v1/search`, `/v1/document`, `/v1/topic`. Deploy with `render.yaml`. See `api/README.md`.

## Checks

```bash
npm test
npm run validate
npm run indexes
```

## Deployment

GitHub Pages is the live host: https://belongarobert.github.io/DaKnowledge/

For teaching, start at **Study**: three short tracks, a glossary, a council timeline, and a CCC / verse finder. Doctrine pages keep a collapsed "For study" prompt. The full topic map is on the homepage under "Browse all topics."

A push to `main` builds `website/` with MkDocs and publishes it.
