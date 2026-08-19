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

## Optional x402 API

GitHub Pages stays free. Agents pay via a separate **Render Web Service** at https://daknowledge-x402.onrender.com (`api/server.js`).

Agent discovery: `GET /.well-known/x402.json`, `GET /openapi.json`, and [llms.txt](https://belongarobert.github.io/DaKnowledge/llms.txt) on the human site.

```bash
cp api/.env.example api/.env
# set PAY_TO_EVM_ADDRESS — do not commit it
npm run api
```

See `api/README.md` and Study → Machine access (x402).

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
