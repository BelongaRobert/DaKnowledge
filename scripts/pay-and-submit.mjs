#!/usr/bin/env node
/**
 * Pay x402-list submission ($1) and seed CDP Bazaar with a real DaKnowledge pull ($0.05).
 *
 * Requires a BUYER wallet (not your PAY_TO receiving wallet) with ~$1.10 USDC on Base.
 *
 *   BUYER_PRIVATE_KEY=0x... node scripts/pay-and-submit.mjs
 *   BUYER_PRIVATE_KEY=0x... node scripts/pay-and-submit.mjs --list-only
 *   BUYER_PRIVATE_KEY=0x... node scripts/pay-and-submit.mjs --bazaar-only
 */
import { ROUTE_CATALOG, DEFAULT_PUBLIC_BASE_URL, SITE_URL, API_DESCRIPTION } from '../api/discovery-catalog.js';
import { createPaidFetch } from './lib/x402-paid-fetch.mjs';

const API_BASE = (process.env.PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL).replace(/\/$/, '');
const SUBMIT_EMAIL =
  process.env.SUBMIT_EMAIL || process.env.X402_LIST_EMAIL || 'belongarobert@gmail.com';

const listOnly = process.argv.includes('--list-only');
const bazaarOnly = process.argv.includes('--bazaar-only');

const submitPayload = {
  url: API_BASE,
  email: SUBMIT_EMAIL,
  service_name: 'DaKnowledge',
  description: API_DESCRIPTION,
  website_url: SITE_URL,
  category: 'Content',
  endpoints: ROUTE_CATALOG.map((r) =>
    r.path.includes(':topic') ? '/v1/topic/trinity' : r.path,
  ),
  notes:
    'Catholic theology knowledge base for AI agents. Discovery: /.well-known/x402.json, /.well-known/agent.json, /openapi.json. Free demos via ?demo=1.',
};

async function submitToX402List(paid) {
  console.log('\n=== x402 List submission ($1 USDC) ===');
  const res = await paid.fetch('https://x402-list.com/api/v1/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(submitPayload),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  console.log(`HTTP ${res.status}`);
  console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  const settlement = paid.getSettlement(res);
  if (settlement?.transaction) {
    console.log('Settlement tx:', settlement.transaction);
  }
  if (!res.ok) {
    throw new Error(`x402-list submit failed: HTTP ${res.status}`);
  }
  console.log('x402-list submission accepted for review.');
}

async function seedBazaar(paid) {
  console.log('\n=== Seed CDP Bazaar ($0.05 USDC) ===');
  const url = `${API_BASE}/v1/ask?q=${encodeURIComponent('What is the Trinity?')}`;
  const res = await paid.fetch(url);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  console.log(`HTTP ${res.status}`);
  if (res.status === 200) {
    console.log('Answer preview:', body.answer?.slice(0, 120) || '(no answer field)');
    console.log('Citations:', JSON.stringify(body.citations || {}).slice(0, 200));
  } else {
    console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  }
  const settlement = paid.getSettlement(res);
  if (settlement?.transaction) {
    console.log('Settlement tx:', settlement.transaction);
  }
  if (res.status !== 200) {
    throw new Error(`Bazaar seed call failed: HTTP ${res.status}`);
  }
  console.log('Paid /v1/ask succeeded. CDP Bazaar may index within a few minutes.');
}

async function checkBazaar() {
  const res = await fetch(
    'https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=DaKnowledge&limit=5',
  );
  const body = await res.json();
  const count = body.resources?.length || 0;
  console.log(`\nCDP Bazaar search: ${count} result(s)`);
  if (count > 0) {
    for (const r of body.resources) {
      console.log(' -', r.resource?.serviceName || r.url || JSON.stringify(r).slice(0, 80));
    }
  }
}

const paid = await createPaidFetch();
console.log(`Buyer wallet: ${paid.address}`);
console.log(`USDC balance: ${paid.usdc}`);

if (Number(paid.usdc) < 1.05) {
  console.error('\nNeed at least ~$1.10 USDC on Base in the buyer wallet.');
  console.error('Fund this address, then re-run this script.');
  process.exit(2);
}

if (!bazaarOnly) await submitToX402List(paid);
if (!listOnly) await seedBazaar(paid);

await checkBazaar();
console.log('\nDone. Verify: node scripts/broadcast-discovery.mjs');
