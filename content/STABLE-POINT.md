# Stable Point

**Name:** Stable Point  
**Date:** 2026-08-15  
**Git tag:** `stable-point`  
**Commit:** `6a59f60` on `main` (git tag `stable-point`)  
**Live site:** https://belongarobert.github.io/DaKnowledge/

This is the saved baseline to return to. Do not treat later experiments as canonical until a new Stable Point is declared.

## What is included

- GitHub Pages is the live host (`main` only)
- Plain Latin-cross home-screen / favicon icon (no stylized corpus)
- iOS / PWA paths fixed for `/DaKnowledge/`
- Light study layer (tracks, glossary, find, councils) without hiding the full map
- Full English ↔ Spanish site via **Ln** language menu
- Spanish uses **South American** register (ustedes, not vosotros; no Spanglish)
- Emmaus banner works on both English and Spanish homepages

## Restore

```bash
git fetch origin tag stable-point
git checkout stable-point
# or reset a branch to it:
git checkout main && git reset --hard stable-point
```

## Next work after this point

- Physical book ingestion when photos/scan arrive (`ingest/`)
- Optional refinements only if requested; otherwise keep this baseline
