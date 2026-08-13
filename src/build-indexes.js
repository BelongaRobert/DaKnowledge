import { writeFile } from 'fs/promises';
import { join } from 'path';
import { DaKnowledge } from './engine.js';

const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Tobit', 'Judith',
  'Esther', '1 Maccabees', '2 Maccabees', 'Job', 'Psalm', 'Psalms',
  'Proverbs', 'Ecclesiastes', 'Song', 'Wisdom', 'Sirach',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Baruch', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum',
  'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude',
  'Revelation'
];

function isBiblical(ref) {
  return BOOKS.some((book) => ref === book || ref.startsWith(`${book} `));
}

function siteLink(path) {
  const withoutPrefix = path.startsWith('site/') ? path.slice(5) : path;
  const noExt = withoutPrefix.replace(/\.md$/, '').replace(/\\/g, '/');
  if (noExt === 'index') return '../';
  if (noExt.startsWith('scripture/')) {
    const rest = noExt.slice('scripture/'.length);
    return rest === 'index' ? 'index/' : `${rest}/`;
  }
  if (noExt.endsWith('/index')) {
    return `../${noExt.slice(0, -6)}/`;
  }
  return `../${noExt}/`;
}

function displayTitle(doc) {
  if (doc.title && doc.title !== 'index') return doc.title;
  const parts = doc.path.replace(/\.md$/, '').split('/');
  const last = parts[parts.length - 1];
  if (last === 'index') return parts[parts.length - 2] || 'Home';
  return last;
}

async function buildIndexes(repoRoot = process.cwd()) {
  const dk = new DaKnowledge(join(repoRoot, 'config.yaml'));
  await dk.init();

  const byRef = new Map();
  for (const [path, doc] of dk.documents) {
    if (!path.startsWith('site/')) continue;
    if (path.includes('citation-index.md')) continue;
    for (const ref of doc.scripture || []) {
      if (!isBiblical(ref)) continue;
      if (!byRef.has(ref)) byRef.set(ref, []);
      byRef.get(ref).push({ path, title: displayTitle(doc) });
    }
  }

  const refs = [...byRef.keys()].sort((a, b) => a.localeCompare(b));
  const lines = [
    '---',
    'title: Scripture Index',
    'topic: scripture',
    'tags:',
    '  - scripture',
    '  - citation-index',
    '---',
    '',
    '# Scripture Index',
    '',
    'Verses cited on the published site. This page is generated from the knowledge engine and is meant for retrieval, not for a new doctrine.',
    '',
    `Indexed **${refs.length}** references across published pages.`,
    '',
    '| Reference | Pages |',
    '|-----------|-------|'
  ];

  for (const ref of refs) {
    const pages = byRef.get(ref)
      .filter((page, index, all) => all.findIndex((item) => item.path === page.path) === index)
      .map((page) => `[${page.title}](${siteLink(page.path)})`)
      .join('; ');
    lines.push(`| ${ref} | ${pages} |`);
  }

  lines.push('');
  lines.push('*See also: [Scripture](index/) | [Biblical Canon](canon/) | [Interpretation](interpretation/)*');
  lines.push('');

  const target = join(repoRoot, 'website', 'docs', 'scripture', 'citation-index.md');
  await writeFile(target, lines.join('\n'));
  return { references: refs.length, target };
}

const invoked = process.argv[1] && process.argv[1].endsWith('build-indexes.js');
if (invoked) {
  const result = await buildIndexes();
  console.log(`Wrote ${result.references} scripture references to ${result.target}`);
}

export { buildIndexes, isBiblical };
