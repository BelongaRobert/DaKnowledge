import { readFile, writeFile } from 'fs/promises';
import { basename, dirname, join, relative, sep } from 'path';
import matter from 'gray-matter';
import { dump as dumpYaml } from 'js-yaml';
import { DaKnowledge } from './engine.js';
import { isBiblical } from './build-indexes.js';

const SKIP_TITLES = new Set();

function headingTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/[✝*]/g, '').trim() : fallback;
}

function topicFromPath(rel) {
  const parts = rel.split(sep);
  if (parts.length === 1) return 'home';
  return parts[0];
}

function tagsFromPath(rel, topic) {
  const base = basename(rel, '.md');
  const tags = new Set();
  if (topic && topic !== 'home') tags.add(topic);
  if (base !== 'index') tags.add(base);
  return [...tags];
}

async function walkMarkdown(dirPath, files = []) {
  const { readdir } = await import('fs/promises');
  const { extname } = await import('path');
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walkMarkdown(fullPath, files);
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      files.push(fullPath);
    }
  }
  return files;
}

async function applyFrontmatter(repoRoot = process.cwd()) {
  const docsRoot = join(repoRoot, 'website', 'docs');
  const engine = new DaKnowledge(join(repoRoot, 'config.yaml'));
  await engine.init();
  const files = await walkMarkdown(docsRoot);
  let updated = 0;

  for (const filePath of files) {
    const rel = relative(docsRoot, filePath);
    const raw = await readFile(filePath, 'utf-8');
    const parsed = matter(raw);
    const inferredTopic = topicFromPath(rel);
    const fallbackTitle = rel === 'index.md' ? 'DaKnowledge' : basename(rel, '.md');
    const title = parsed.data.title || headingTitle(parsed.content, fallbackTitle);
    const topic = parsed.data.topic || (inferredTopic === 'home' ? undefined : inferredTopic);
    const tags = parsed.data.tags?.length ? parsed.data.tags : tagsFromPath(rel, topic || inferredTopic);
    const docKey = join('site', rel);
    const indexed = engine.getDocument(docKey);
    const scripture = parsed.data.scripture?.length
      ? parsed.data.scripture
      : (indexed?.scripture || []).filter(isBiblical).slice(0, 12);

    const next = {
      ...parsed.data,
      title,
      tags
    };
    if (topic) next.topic = topic;
    if (scripture.length && !parsed.data.scripture?.length) {
      next.scripture = scripture;
    }

    if (SKIP_TITLES.has(rel)) continue;

    const yaml = dumpYaml(next, { lineWidth: 88 }).trimEnd();
    const output = `---\n${yaml}\n---\n\n${parsed.content.replace(/^\uFEFF/, '').replace(/^\n+/, '')}`;
    if (output !== raw) {
      await writeFile(filePath, output.endsWith('\n') ? output : `${output}\n`);
      updated += 1;
    }
  }

  return { files: files.length, updated };
}

const invoked = process.argv[1] && process.argv[1].endsWith('frontmatter.js');
if (invoked) {
  const result = await applyFrontmatter();
  console.log(`Frontmatter: ${result.updated} of ${result.files} pages updated.`);
}

export { applyFrontmatter };
