#!/usr/bin/env node
/**
 * Collect live health + metrics + discovery + GitHub traffic,
 * write data/analytics snapshots, and print a markdown report (for Issues / Cursor).
 *
 * Usage:
 *   node scripts/weekly-analytics-report.mjs
 *   node scripts/weekly-analytics-report.mjs --write
 *   REPORT_MODE=github node scripts/weekly-analytics-report.mjs --write
 */
import { mkdir, writeFile, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'data', 'analytics');

const API = (process.env.PUBLIC_BASE_URL || 'https://daknowledge-x402.onrender.com').replace(
  /\/$/,
  '',
);
const SITE = 'https://belongarobert.github.io/DaKnowledge';
const REPO = process.env.GITHUB_REPOSITORY || 'BelongaRobert/DaKnowledge';
const writeFiles = process.argv.includes('--write');
const githubMode = process.env.REPORT_MODE === 'github' || process.argv.includes('--github');

function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body, ms: null };
}

async function timed(url, init) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let body = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* keep text */
    }
    return { url, ok: res.ok, status: res.status, body, ms: Date.now() - t0 };
  } catch (err) {
    return { url, ok: false, status: 0, body: null, error: err.message, ms: Date.now() - t0 };
  }
}

async function githubApi(path) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return { ok: false, skipped: true, reason: 'no GITHUB_TOKEN' };
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'DaKnowledge-weekly-analytics',
    },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

async function bazaarListed() {
  const url = `https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=${encodeURIComponent('DaKnowledge')}&limit=20`;
  const res = await timed(url);
  if (!res.ok || !res.body || typeof res.body !== 'object') {
    return { listed: false, count: 0, error: res.error || `HTTP ${res.status}` };
  }
  const resources = res.body.resources || [];
  const ours = resources.filter((r) =>
    JSON.stringify(r).toLowerCase().includes('daknowledge'),
  );
  return { listed: ours.length > 0, count: ours.length };
}

async function discoveryScore() {
  const checks = [
    [`${API}/.well-known/x402.json`, (b) => b?.keywords?.length > 10],
    [`${API}/.well-known/agent.json`, (b) => b?.x402Support],
    [`${API}/openapi.json`, (b) => b?.paths?.['/v1/ask']],
    [`${API}/llms.txt`, (t) => typeof t === 'string' && t.includes('catholic theology')],
    [`${API}/llms-full.txt`, (t) => typeof t === 'string' && t.includes('hypostatic union')],
    [`${API}/v1/ask?q=trinity&demo=1`, (b) => b?.demo === true],
    [`${SITE}/llms.txt`, (t) => typeof t === 'string' && t.includes('DaKnowledge')],
    [
      `${SITE}/llms-full.txt`,
      (t) => typeof t === 'string' && /agent routing/i.test(t),
    ],
  ];
  const results = [];
  for (const [url, validate] of checks) {
    const hit = await timed(url);
    const pass = hit.ok && validate(hit.body);
    results.push({ url, ok: pass, status: hit.status, ms: hit.ms });
  }
  const passed = results.filter((r) => r.ok).length;
  return { passed, total: results.length, results };
}

function mdEscape(s) {
  return String(s ?? '').replace(/\|/g, '\\|');
}

function formatReport(snapshot) {
  const { generatedAt, week, site, api, metrics, traffic, bazaar, discovery, notes } =
    snapshot;
  const m = metrics?.body || {};
  const lines = [];
  lines.push(`# DaKnowledge weekly analytics — ${week}`);
  lines.push('');
  lines.push(`Generated: **${generatedAt}** (UTC)`);
  lines.push('');
  lines.push('## Uptime');
  lines.push('');
  lines.push(`| Check | Status | Latency |`);
  lines.push(`|-------|--------|---------|`);
  lines.push(
    `| Human site | ${site.ok ? '✅' : '❌'} HTTP ${site.status} | ${site.ms ?? '—'} ms |`,
  );
  lines.push(
    `| API /health | ${api.health.ok ? '✅' : '❌'} HTTP ${api.health.status} | ${api.health.ms ?? '—'} ms |`,
  );
  lines.push(
    `| API /metrics | ${api.metrics.ok ? '✅' : '❌'} HTTP ${api.metrics.status} | ${api.metrics.ms ?? '—'} ms |`,
  );
  lines.push('');
  lines.push('## Discovery');
  lines.push('');
  lines.push(
    `Score: **${discovery.passed}/${discovery.total}** · CDP Bazaar: **${bazaar.listed ? 'listed' : 'not listed'}** (${bazaar.count} hits)`,
  );
  lines.push('');
  lines.push('## Traffic (first-party, since last API cold start)');
  lines.push('');
  if (!api.metrics.ok) {
    lines.push('_Metrics endpoint unavailable — API may be cold or undeployed._');
  } else {
    const l7 = m.last7Days || {};
    const life = m.lifetime || {};
    const today = m.today || {};
    lines.push(
      `| Window | Pageviews | API hits | Demos | 402s | Paid 200 | Settled |`,
    );
    lines.push(`|--------|-----------|----------|-------|------|----------|---------|`);
    lines.push(
      `| Today | ${today.pageviews ?? 0} | ${today.apiHits ?? 0} | ${today.demos ?? 0} | ${today.paymentRequired ?? 0} | ${today.paid200 ?? 0} | ${today.settled ?? 0} |`,
    );
    lines.push(
      `| ~7d (in-memory) | ${l7.pageviews ?? 0} | ${l7.apiHits ?? 0} | ${l7.demos ?? 0} | ${l7.paymentRequired ?? 0} | ${l7.paid200 ?? 0} | ${l7.settled ?? 0} |`,
    );
    lines.push(
      `| Lifetime (process) | ${life.pageviews ?? 0} | ${life.apiHits ?? 0} | — | — | — | ${life.settled ?? 0} |`,
    );
    lines.push('');
    if (m.topPages?.length) {
      lines.push('### Top pages');
      lines.push('');
      for (const row of m.topPages.slice(0, 10)) {
        lines.push(`- \`${mdEscape(row.key)}\` — ${row.count}`);
      }
      lines.push('');
    }
    if (m.topApiRoutes?.length) {
      lines.push('### Top API / discovery routes');
      lines.push('');
      for (const row of m.topApiRoutes.slice(0, 10)) {
        lines.push(`- \`${mdEscape(row.key)}\` — ${row.count}`);
      }
      lines.push('');
    }
    if (m.topReferrers?.length) {
      lines.push('### Top referrers');
      lines.push('');
      for (const row of m.topReferrers.slice(0, 8)) {
        lines.push(`- ${mdEscape(row.key)} — ${row.count}`);
      }
      lines.push('');
    }
    if (m.note) lines.push(`_${m.note}_`);
  }
  lines.push('');
  lines.push('## GitHub repo traffic');
  lines.push('');
  if (traffic.views?.skipped) {
    lines.push(`_Skipped: ${traffic.views.reason || 'no token'}_`);
  } else if (!traffic.views?.ok) {
    lines.push(`_Views unavailable (HTTP ${traffic.views?.status ?? '?'})_`);
  } else {
    const v = traffic.views.body;
    lines.push(
      `Views (14d): **${v.count ?? 0}** (${v.uniques ?? 0} unique) · Clones: **${traffic.clones?.body?.count ?? 0}** (${traffic.clones?.body?.uniques ?? 0} unique)`,
    );
  }
  lines.push('');
  if (notes?.length) {
    lines.push('## Notes');
    lines.push('');
    for (const n of notes) lines.push(`- ${n}`);
    lines.push('');
  }
  lines.push('---');
  lines.push(
    `Live metrics: ${API}/metrics · Site: ${SITE}/ · Operator docs: \`api/ANALYTICS.md\``,
  );
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const generatedAt = new Date().toISOString();
  const week = isoWeek();

  const site = await timed(SITE + '/');
  const health = await timed(`${API}/health`);
  const metricsHit = await timed(`${API}/metrics`);
  const detailHeaders = {};
  if (process.env.METRICS_TOKEN) {
    detailHeaders['X-Metrics-Token'] = process.env.METRICS_TOKEN;
  }
  const detail = await timed(`${API}/metrics/detail`, { headers: detailHeaders });

  const discovery = await discoveryScore();
  const bazaar = await bazaarListed();
  const views = await githubApi('/traffic/views');
  const clones = await githubApi('/traffic/clones');
  const paths = await githubApi('/traffic/popular/paths');

  const notes = [];
  if (!site.ok) notes.push('Human GitHub Pages site failed the uptime check.');
  if (!health.ok) notes.push('API /health failed — Render may be sleeping or misconfigured.');
  if (discovery.passed < discovery.total) {
    notes.push(
      `Discovery incomplete: ${discovery.total - discovery.passed} check(s) failed.`,
    );
  }
  if (!bazaar.listed) {
    notes.push(
      'Not listed on CDP Bazaar yet — seed with one settled paid call (see api/MARKETING.md).',
    );
  }
  if (metricsHit.ok && (metricsHit.body?.lifetime?.pageviews ?? 0) === 0) {
    notes.push(
      'No first-party pageviews yet in this API process (beacon ships with the next Pages deploy).',
    );
  }

  const snapshot = {
    week,
    generatedAt,
    site: { ok: site.ok, status: site.status, ms: site.ms },
    api: {
      health: { ok: health.ok, status: health.status, ms: health.ms, body: health.body },
      metrics: {
        ok: metricsHit.ok,
        status: metricsHit.status,
        ms: metricsHit.ms,
        body: metricsHit.body,
      },
      detail: detail.ok ? detail.body : null,
    },
    metrics: metricsHit,
    discovery,
    bazaar,
    traffic: { views, clones, paths },
    notes,
  };

  const markdown = formatReport(snapshot);

  if (writeFiles) {
    await mkdir(outDir, { recursive: true });
    const jsonPath = join(outDir, `${week}.json`);
    const latestJson = join(outDir, 'latest.json');
    const latestMd = join(outDir, 'latest.md');
    await writeFile(jsonPath, JSON.stringify(snapshot, null, 2) + '\n');
    await writeFile(latestJson, JSON.stringify(snapshot, null, 2) + '\n');
    await writeFile(latestMd, markdown);
    // Keep a short rolling index
    let index = { weeks: [] };
    try {
      index = JSON.parse(await readFile(join(outDir, 'index.json'), 'utf8'));
    } catch {
      /* first run */
    }
    index.weeks = [...new Set([...(index.weeks || []), week])].sort();
    index.updatedAt = generatedAt;
    await writeFile(join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
    console.error(`Wrote ${jsonPath}`);
  }

  if (githubMode) {
    // Machine-readable footer for the Action step
    console.log(markdown);
    console.log(`\n<!-- daknowledge-week:${week} -->`);
  } else {
    console.log(markdown);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
