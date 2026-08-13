# Optimization Plan

Goal: make DaKnowledge a single, ingestible Catholic knowledge base that can absorb a physical book without duplicating or drifting from the published site.

---

## Diagnosis

The site already has a real theological spine. The bottleneck is architecture, not a lack of topics.

1. **Three content stores.** `content/` (raw), `data/` (2 research drafts), and `website/docs/` (the published site) are not the same corpus. The engine only indexes `data/`.
2. **Ontology drift.** `config.yaml` lists Protestant canon, omits Prayer / Relics / Sacraments / Formation as top-level topics, and advertises semantic search that does not exist.
3. **No ingestion path.** There is no template, inbox, or review queue for a physical book.
4. **Uneven depth.** Relics are research articles. Several doctrine overviews were stubs. Mariology, moral theology, and eschatology are absent.
5. **Sources page errors.** Some council links point at the wrong Vatican documents (e.g. Constantinople 381 → Vatican I; Trent → Vatican II).
6. **Almost no frontmatter** on published pages, so topic / scripture / source indexes cannot be built from the live site.

---

## Target architecture

```
ingest/inbox/          photographs, scans, OCR dumps (incoming)
ingest/books/          one folder per book: metadata + chapter notes
data/sources/          research notes and extracted claims (canonical working store)
website/docs/          published MkDocs pages only
content/               project memory: plans, personal formation, this map
```

Rule: a claim is not published until it has a source, a topic, and a short review. The website never receives raw OCR.

---

## Phases

### Phase 0 — Ingestion readiness (this change)

- Record the knowledge map and this plan.
- Align `config.yaml` with the live Catholic site.
- Make the engine index `website/docs/` and `data/`.
- Add book / topic / source templates.
- Add `ingest/` inbox and a script that turns photos or text into a book draft.
- Fill the Trinity and Scripture overview stubs.
- Add a validator for stubs, missing frontmatter, and ontology drift.

### Phase 1 — One corpus (done on the site)

- Treat `website/docs/` as the published view and `data/` as the research store.
- Add YAML frontmatter to published pages (title, topic, tags, scripture).
- Point the dated formation archive at the published reflection.
- Stop claiming features the engine does not implement.

### Phase 2 — Repair and deepen (done for the public map)

- Fix broken bibliography links (Constantinople 381, Trent, Summa Contra Gentiles).
- Write Existence of God.
- Add Mariology, moral theology, and eschatology from Scripture, CCC, and the councils already in the bibliography.
- Keep relic pages as the research register; new loci stay catechetical.

### Phase 3 — Retrieval (done)

- Scripture citation index across the site (`scripture/citation-index.md`, generated).
- MkDocs search enabled (suggest, highlight, share).
- Homepage links no longer climb out of the site root.

### Phase 4 — Book by book

- Ingest the physical book through `ingest/inbox/`.
- Extract claims with page numbers.
- Map each claim to an existing topic or a proposed new topic.
- Promote approved notes into `data/`, then into `website/docs/`.

---

## How a physical book enters the system

1. Photograph or scan pages (one page per image, sequential names, even light).
2. Drop files into `ingest/inbox/<book-slug>/`.
3. Run `npm run ingest -- <book-slug>`.
4. Review OCR under `ingest/books/<book-slug>/ocr/`.
5. Fill `book.md` (title, author, edition, Catholic standing).
6. Extract notes with page numbers into `notes/`.
7. Map notes to topics in `config.yaml`.
8. Promote: `data/sources/books/<slug>/` → published pages or page sections.

Until the book files are uploaded, the pipeline is ready and idle.

---

## Priority order

| Order | Work | Why |
|-------|------|-----|
| 1 | Ingestion pipeline + templates | Unblocks the physical book |
| 2 | Engine + ontology alignment | Stops the site and the index from lying to each other |
| 3 | Frontmatter on published pages | Makes every later index cheap |
| 4 | Bibliography repairs | Trust |
| 5 | Missing loci (Mary, morals, last things) | Completes the Catholic map |
| 6 | Search and scripture index | Only useful after 1–3 |

---

## What not to do

- Do not generate new doctrine pages from a model without a cited source.
- Do not paste OCR onto the public site.
- Do not flatten relics to match shorter doctrine pages, or inflate every doctrine page to Shroud length.
- Do not add Protestant / Catholic parallel tracks. This project is Catholic; other voices may be cited as conversation partners.
