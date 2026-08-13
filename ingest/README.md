# Book Ingestion

Use this folder to bring a physical book into DaKnowledge without publishing raw scans.

## Drop files here

```
ingest/inbox/<book-slug>/
  001.jpg
  002.jpg
  notes.txt          # optional typed or OCR text
```

Name images in reading order. One page per file. Avoid glare and cropped lines.

Then run:

```bash
npm run ingest -- <book-slug>
```

The script writes:

```
ingest/books/<book-slug>/
  book.md            # fill in title, author, edition
  ocr/               # extracted text, one file per page or source
  notes/             # your structured extracts (use the template)
```

## After OCR

1. Correct obvious OCR errors in `ocr/`.
2. Complete `book.md`.
3. Copy `ingest/notes/_template.md` to `notes/01-<topic>.md` for each cluster of claims.
4. Every claim needs a page number.
5. Map `topic` to an id in `config.yaml`. If the book needs a new topic, propose it in the note; do not invent a public page yet.
6. When a note is ready, move a cleaned copy to `data/sources/books/<book-slug>/`.
7. Only then fold it into `website/docs/`.

## What to send if you cannot run the script

Upload the photos or a PDF into `ingest/inbox/<book-slug>/` and tell the agent:

- book title and author
- edition / year if you know it
- whether it is a Catholic source, a conversation partner, or a relic/history work
- which chapters matter first

The agent can OCR, extract, and map from there.
