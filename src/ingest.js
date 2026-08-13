import { mkdir, readdir, writeFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, extname, join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']);
const TEXT_EXT = new Set(['.txt', '.md']);
const DOC_EXT = new Set(['.pdf']);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function listFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
    } else if (entry.isFile() && !entry.name.startsWith('.')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

async function hasTesseract() {
  try {
    await execFileAsync('tesseract', ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function ocrImage(imagePath, outputBase) {
  await execFileAsync('tesseract', [imagePath, outputBase, '-l', 'eng']);
  return `${outputBase}.txt`;
}

function bookRecord(slug) {
  return `---
title: ""
author: ""
translator: ""
publisher: ""
year: ""
edition: ""
isbn: ""
slug: "${slug}"
standing: catholic-source
topics: []
status: ocr
date_added: ${new Date().toISOString().slice(0, 10)}
---

# Book record

## Why this book is here

One paragraph: what it contributes to DaKnowledge that the site does not already have.

## How to read it for this project

- Chapters to extract first:
- Claims to watch for (doctrine, history, devotion):
- Pages or sections to skip:

## Promotion checklist

- [ ] OCR reviewed
- [ ] Notes have page numbers
- [ ] Topics match \`config.yaml\` or a proposed new topic is named
- [ ] Scripture citations normalized (e.g. \`John 1:14\`)
- [ ] No raw OCR copied to \`website/docs/\`
`;
}

async function ingestBook(slug, repoRoot = process.cwd()) {
  const inboxDir = join(repoRoot, 'ingest', 'inbox', slug);
  const bookDir = join(repoRoot, 'ingest', 'books', slug);
  const ocrDir = join(bookDir, 'ocr');
  const notesDir = join(bookDir, 'notes');

  if (!existsSync(inboxDir)) {
    throw new Error(`Nothing in ingest/inbox/${slug}. Drop photos, a PDF, or a .txt dump there first.`);
  }

  await mkdir(ocrDir, { recursive: true });
  await mkdir(notesDir, { recursive: true });

  const bookPath = join(bookDir, 'book.md');
  if (!existsSync(bookPath)) {
    await writeFile(bookPath, bookRecord(slug));
  }

  const files = await listFiles(inboxDir);
  if (files.length === 0) {
    throw new Error(`ingest/inbox/${slug} is empty.`);
  }

  const tesseractReady = await hasTesseract();
  const report = {
    slug,
    pages: 0,
    copiedText: 0,
    ocrPages: 0,
    skipped: [],
    tesseract: tesseractReady
  };

  for (const filePath of files) {
    const ext = extname(filePath).toLowerCase();
    const name = slugify(basename(filePath, ext)) || 'page';

    if (TEXT_EXT.has(ext)) {
      const target = join(ocrDir, `${name}.txt`);
      await copyFile(filePath, target);
      report.copiedText += 1;
      report.pages += 1;
      continue;
    }

    if (IMAGE_EXT.has(ext)) {
      if (!tesseractReady) {
        report.skipped.push(`${basename(filePath)} (install tesseract to OCR images)`);
        continue;
      }
      const outputBase = join(ocrDir, name);
      await ocrImage(filePath, outputBase);
      report.ocrPages += 1;
      report.pages += 1;
      continue;
    }

    if (DOC_EXT.has(ext)) {
      report.skipped.push(`${basename(filePath)} (PDF OCR is not automatic yet; export pages to images or text)`);
      continue;
    }

    report.skipped.push(basename(filePath));
  }

  const summary = [
    `# Ingest report: ${slug}`,
    '',
    `- Pages written: ${report.pages}`,
    `- Text files copied: ${report.copiedText}`,
    `- Images OCR'd: ${report.ocrPages}`,
    `- Tesseract available: ${report.tesseract}`,
    report.skipped.length ? `- Skipped:\n${report.skipped.map((item) => `  - ${item}`).join('\n')}` : '- Skipped: none',
    '',
    'Next: correct `ocr/`, complete `book.md`, then add notes from `ingest/notes/_template.md`.',
    ''
  ].join('\n');

  await writeFile(join(bookDir, 'INGEST-REPORT.md'), summary);
  return report;
}

const invoked = process.argv[1] && process.argv[1].endsWith('ingest.js');
if (invoked) {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node src/ingest.js <book-slug>');
    process.exit(1);
  }

  try {
    const report = await ingestBook(slugify(slug));
    console.log(`Ingested ${report.slug}: ${report.pages} page(s).`);
    if (report.skipped.length) {
      console.log('Skipped:', report.skipped.join(', '));
    }
    if (!report.tesseract) {
      console.log('Tesseract is not installed. Text dumps still work; images need tesseract.');
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

export { ingestBook, slugify };
