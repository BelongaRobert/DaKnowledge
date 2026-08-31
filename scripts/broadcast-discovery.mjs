#!/usr/bin/env node
/**
 * Verify agent discovery surfaces are live and keyword-rich.
 * Run after deploy: node scripts/broadcast-discovery.mjs
 */
const API = process.env.PUBLIC_BASE_URL || 'https://daknowledge-x402.onrender.com';
const SITE = 'https://belongarobert.github.io/DaKnowledge';

const checks = [
  [`${API}/.well-known/x402.json`, 'json', (b) => b.keywords?.length > 10 && b.intents?.length > 0],
  [`${API}/.well-known/agent.json`, 'json', (b) => b.x402Support && b.keywords?.includes('trinity')],
  [`${API}/openapi.json`, 'json', (b) => b.paths?.['/v1/ask']],
  [`${API}/llms.txt`, 'text', (t) => t.includes('catholic theology')],
  [`${API}/llms-full.txt`, 'text', (t) => t.includes('hypostatic union')],
  [`${API}/v1/ask?q=trinity&demo=1`, 'json', (b) => b.demo === true],
  [`${SITE}/llms.txt`, 'text', (t) => t.includes('DaKnowledge')],
  [`${SITE}/llms-full.txt`, 'text', (t) => t.includes('Agent routing')],
];

let failed = 0;
for (const [url, type, validate] of checks) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = type === 'json' ? await res.json() : await res.text();
    if (!validate(body)) throw new Error('validation failed');
    console.log(`OK  ${url}`);
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${url} — ${err.message}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} discovery checks passed.`);
if (failed) process.exit(1);

console.log('\nSubmit to directories:');
console.log('  node scripts/submit-directories.mjs --submit  # x402-list ($1 on onrender.com)');
console.log('  CDP Bazaar: one settled paid call seeds listing');
