import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { ingestBook } from './src/ingest.js';
import { validate } from './src/validate.js';

const slug = 'sample-handbook';
const inbox = join(process.cwd(), 'ingest', 'inbox', slug);
const bookDir = join(process.cwd(), 'ingest', 'books', slug);

await rm(inbox, { recursive: true, force: true });
await rm(bookDir, { recursive: true, force: true });
await mkdir(inbox, { recursive: true });
await writeFile(
  join(inbox, 'page-01.txt'),
  'The Word became flesh and dwelt among us. John 1:14\n'
);

const report = await ingestBook(slug);
if (report.pages !== 1 || report.copiedText !== 1) {
  throw new Error(`Unexpected ingest report: ${JSON.stringify(report)}`);
}

const book = await readFile(join(bookDir, 'book.md'), 'utf-8');
if (!book.includes(`slug: "${slug}"`)) {
  throw new Error('book.md was not created');
}

const ocr = await readFile(join(bookDir, 'ocr', 'page-01.txt'), 'utf-8');
if (!ocr.includes('John 1:14')) {
  throw new Error('OCR text was not copied');
}

await rm(inbox, { recursive: true, force: true });
await rm(bookDir, { recursive: true, force: true });

const result = await validate();
const errors = result.issues.filter((issue) => issue.level === 'error');
if (errors.length) {
  console.error(errors);
  throw new Error('Validator reported errors');
}

console.log('Ingest and validate checks passed.');
