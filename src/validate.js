import { readFile, readdir } from 'fs/promises';
import { extname, join, relative, sep } from 'path';
import matter from 'gray-matter';
import { load as loadYaml } from 'js-yaml';

async function walkMarkdown(dirPath, files = []) {
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

function collectTopicIds(topics, prefix = []) {
  const ids = new Set();
  for (const topic of topics || []) {
    ids.add(topic.id);
    for (const sub of topic.subtopics || []) {
      ids.add(typeof sub === 'string' ? sub : sub.id);
    }
  }
  return ids;
}

async function validate(repoRoot = process.cwd()) {
  const config = loadYaml(await readFile(join(repoRoot, 'config.yaml'), 'utf-8'));
  const topicIds = collectTopicIds(config.topics);
  const siteFiles = await walkMarkdown(join(repoRoot, 'website', 'docs'));
  const issues = [];

  for (const filePath of siteFiles) {
    const rel = relative(join(repoRoot, 'website', 'docs'), filePath);
    if (rel.startsWith(`includes${sep}`) || rel.startsWith('includes/')) continue;
    const raw = await readFile(filePath, 'utf-8');
    const parsed = matter(raw);

    if (/Coming Soon/i.test(parsed.content)) {
      issues.push({ level: 'error', file: rel, message: 'Stub page still says Coming Soon' });
    }

    if (Object.keys(parsed.data).length === 0) {
      issues.push({ level: 'warn', file: rel, message: 'No YAML frontmatter' });
    }

    if (rel === 'index.md' && /\]\(\.\.\//.test(parsed.content)) {
      issues.push({
        level: 'error',
        file: rel,
        message: 'Homepage uses ../ links that resolve outside the site'
      });
    }

    if (parsed.data.topic && !topicIds.has(parsed.data.topic)) {
      issues.push({
        level: 'error',
        file: rel,
        message: `Unknown topic "${parsed.data.topic}"`
      });
    }
  }

  if (config.scripture?.canon !== 'catholic') {
    issues.push({
      level: 'error',
      file: 'config.yaml',
      message: `Scripture canon is "${config.scripture?.canon}", expected catholic`
    });
  }

  const requiredTopics = [
    'theology-proper',
    'trinity',
    'christology',
    'pneumatology',
    'soteriology',
    'ecclesiology',
    'sacraments',
    'scripture',
    'prayer',
    'relics',
    'spiritual-formation',
    'mariology',
    'moral-theology',
    'eschatology',
    'study'
  ];

  for (const id of requiredTopics) {
    if (!topicIds.has(id)) {
      issues.push({ level: 'error', file: 'config.yaml', message: `Missing topic ${id}` });
    }
  }

  return { files: siteFiles.length, issues };
}

const invoked = process.argv[1] && process.argv[1].endsWith('validate.js');
if (invoked) {
  const result = await validate();
  const errors = result.issues.filter((issue) => issue.level === 'error');
  const warns = result.issues.filter((issue) => issue.level === 'warn');

  console.log(`Checked ${result.files} published pages.`);
  console.log(`${errors.length} error(s), ${warns.length} warning(s).`);
  for (const issue of result.issues) {
    console.log(`${issue.level.toUpperCase()}  ${issue.file}: ${issue.message}`);
  }
  if (errors.length) process.exit(1);
}

export { validate };
