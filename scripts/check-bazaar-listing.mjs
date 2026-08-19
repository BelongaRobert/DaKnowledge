#!/usr/bin/env node
/**
 * Check whether DaKnowledge appears in the CDP x402 Bazaar catalog.
 * Listing requires at least one settled payment through CDP on mainnet.
 */
const DEFAULT_QUERY = 'DaKnowledge';
const SEARCH_URL = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/search';
const API_BASE = process.env.PUBLIC_BASE_URL || 'https://daknowledge-x402.onrender.com';

async function main() {
  const query = process.argv[2] || DEFAULT_QUERY;
  const url = `${SEARCH_URL}?query=${encodeURIComponent(query)}&limit=20`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Bazaar search failed: HTTP ${res.status}`);
  }
  const body = await res.json();
  const resources = body.resources || [];

  console.log(`CDP Bazaar search: "${query}"`);
  console.log(`Results: ${resources.length}${body.partialResults ? ' (partial)' : ''}`);

  const ours = resources.filter((r) => {
    const blob = JSON.stringify(r).toLowerCase();
    return (
      blob.includes('daknowledge') ||
      blob.includes('daknowledge-x402.onrender.com') ||
      blob.includes(apiHost())
    );
  });

  if (ours.length === 0) {
    console.log('\nDaKnowledge is NOT listed in CDP Bazaar yet.');
    console.log('Agents can still use:');
    console.log(`  ${API_BASE}/.well-known/x402.json`);
    console.log(`  ${API_BASE}/openapi.json`);
    console.log('  https://belongarobert.github.io/DaKnowledge/llms.txt');
    console.log('\nTo get listed: process one settled payment per route through CDP mainnet.');
    process.exitCode = 1;
    return;
  }

  console.log(`\nFound ${ours.length} DaKnowledge resource(s):`);
  for (const r of ours) {
    const name = r.resource?.serviceName || r.serviceName || r.url || '(unknown)';
    console.log(`  - ${name}`);
  }
}

function apiHost() {
  try {
    return new URL(API_BASE).hostname.toLowerCase();
  } catch {
    return 'daknowledge-x402.onrender.com';
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
