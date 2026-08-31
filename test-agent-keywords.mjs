import { AGENT_INTENTS, AGENT_KEYWORDS } from './api/agent-keywords.js';
import { buildAgentCard, buildDiscoveryIndex, buildWellKnownCatalog } from './api/discovery-catalog.js';

const opts = {
  network: 'eip155:8453',
  payTo: '0x1111111111111111111111111111111111111111',
  publicBaseUrl: 'https://daknowledge-x402.onrender.com',
};

if (AGENT_KEYWORDS.length < 20) throw new Error('Expected rich keyword list');
if (AGENT_INTENTS.length < 5) throw new Error('Expected agent intents');

const catalog = buildWellKnownCatalog(opts);
if (!catalog.keywords.includes('eucharist')) throw new Error('Catalog keywords missing');

const card = buildAgentCard(opts);
if (!card.intents.some((i) => i.route === '/v1/ask')) throw new Error('Card intents missing');

const index = buildDiscoveryIndex(opts);
if (!index.links.llmsFullTxt) throw new Error('Index missing llms-full link');

console.log('Agent keyword checks passed.');
