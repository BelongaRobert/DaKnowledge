#!/usr/bin/env node
/**
 * Submit DaKnowledge to agent directories.
 *
 * Usage:
 *   node scripts/submit-directories.mjs              # dry-run (print payload)
 *   node scripts/submit-directories.mjs --submit      # POST to x402-list.com
 *   SUBMIT_EMAIL=you@example.com node scripts/submit-directories.mjs --submit
 *
 * Note: daknowledge-x402.onrender.com is a free-host URL. x402-list answers
 * HTTP 402 and requires a one-off $1 USDC payment on Base to enter review.
 * Pay that challenge with an x402 wallet client, then retry with PAYMENT-SIGNATURE.
 */
import { ROUTE_CATALOG, DEFAULT_PUBLIC_BASE_URL, SITE_URL, API_DESCRIPTION } from '../api/discovery-catalog.js';

const API_BASE = process.env.PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL;
const SUBMIT_EMAIL =
  process.env.SUBMIT_EMAIL || process.env.X402_LIST_EMAIL || 'belongarobert@gmail.com';
const doSubmit = process.argv.includes('--submit');

const payload = {
  url: API_BASE.replace(/\/$/, ''),
  email: SUBMIT_EMAIL,
  service_name: 'DaKnowledge',
  description: API_DESCRIPTION,
  website_url: SITE_URL,
  category: 'Content',
  endpoints: ROUTE_CATALOG.map((r) =>
    r.path.includes(':topic') ? '/v1/topic/trinity' : r.path,
  ),
  notes:
    'Catholic theology knowledge base for AI agents. Free site for humans; x402 USDC on Base for /v1 retrieval. Discovery: /.well-known/x402.json, /.well-known/agent.json, /openapi.json. Free demos via ?demo=1. Prefer /v1/ask for cited answers.',
};

console.log('Directory submission payload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\nAlso advertise these free discovery URLs:');
console.log(`  ${payload.url}/.well-known/x402.json`);
console.log(`  ${payload.url}/.well-known/agent.json`);
console.log(`  ${payload.url}/openapi.json`);
console.log(`  ${SITE_URL}llms.txt`);
console.log('  CDP Bazaar: https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=DaKnowledge');
console.log('  Bazaar MCP: https://api.cdp.coinbase.com/platform/v2/x402/discovery/mcp');
console.log('  x402 List:  https://x402-list.com/submit');
console.log('  AgentGrade: crawl /.well-known/x402.json (no form — scanner discovers)');

if (!doSubmit) {
  console.log('\nDry run only. Pass --submit to POST to https://x402-list.com/api/v1/submit');
  process.exit(0);
}

const res = await fetch('https://x402-list.com/api/v1/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(payload),
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

console.log(`\nx402-list response: HTTP ${res.status}`);
const paymentRequired = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('payment-required');
if (paymentRequired) {
  console.log('PAYMENT-REQUIRED header present (onrender.com is a free-host URL → $1 USDC fee).');
  try {
    const decoded = JSON.parse(Buffer.from(paymentRequired, 'base64url').toString('utf8'));
    console.log(JSON.stringify(decoded, null, 2));
  } catch {
    console.log(paymentRequired.slice(0, 200));
  }
}
console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2));

if (res.status === 402) {
  console.log('\nNext step: pay the $1 USDC x402 challenge, then retry with PAYMENT-SIGNATURE.');
  console.log('Or open https://x402-list.com/submit in a browser wallet flow.');
  process.exit(2);
}

if (!res.ok) {
  process.exit(1);
}

console.log('\nSubmission accepted for manual review.');
