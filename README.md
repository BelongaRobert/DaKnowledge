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

## Checks

```bash
npm test
npm run validate
```

## Deployment

`website/` builds to Vercel at https://daknowledge.vercel.app/
