import { readFile, writeFile, readdir } from 'fs/promises';
import { extname, join, relative } from 'path';

const SKIP = new Set(['scripture/citation-index.md']);
const INCLUDE_PREFIX = [
  'theology-proper/',
  'trinity/',
  'christology/',
  'pneumatology/',
  'soteriology/',
  'ecclesiology/',
  'mariology/',
  'moral-theology/',
  'eschatology/',
  'sacraments/',
  'scripture/'
];
const MARKER = '--8<-- "includes/study-prompts.md"';

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else if (entry.isFile() && extname(entry.name) === '.md') files.push(full);
  }
  return files;
}

const docs = join(process.cwd(), 'website', 'docs');
const files = await walk(docs);
let updated = 0;

for (const file of files) {
  const rel = relative(docs, file).replace(/\\/g, '/');
  if (SKIP.has(rel) || !INCLUDE_PREFIX.some((prefix) => rel.startsWith(prefix))) continue;

  const raw = await readFile(file, 'utf-8');
  if (raw.includes(MARKER)) continue;

  const addition = `\n${MARKER}\n`;
  await writeFile(file, raw.endsWith('\n') ? `${raw}${addition}` : `${raw}\n${addition}`);
  updated += 1;
}

console.log(`Study prompts added to ${updated} pages.`);
