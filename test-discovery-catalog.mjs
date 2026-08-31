import {
  buildAgentCard,
  buildDiscoveryIndex,
  buildOpenApiSpec,
  buildRobotsTxt,
  buildWellKnownCatalog,
  priceToMicroUnits,
} from './api/discovery-catalog.js';

const opts = {
  network: 'eip155:8453',
  payTo: '0x1111111111111111111111111111111111111111',
  publicBaseUrl: 'https://daknowledge-x402.onrender.com',
  facilitatorUrl: 'https://api.cdp.coinbase.com/platform/v2/x402',
};

if (priceToMicroUnits('$0.05') !== '50000') {
  throw new Error('priceToMicroUnits failed');
}

const catalog = buildWellKnownCatalog(opts);
if (catalog.services.length !== 6) {
  throw new Error(`Expected 6 services, got ${catalog.services.length}`);
}
if (!catalog.discovery.bazaarMcp) {
  throw new Error('Missing bazaarMcp link');
}
if (!catalog.services[0].demo?.available) {
  throw new Error('Well-known services should advertise demo');
}
if (!catalog.keywords?.includes('trinity')) {
  throw new Error('Well-known catalog missing keywords');
}

const card = buildAgentCard(opts);
if (!card.skills?.length || !card.x402Support) {
  throw new Error('Agent card incomplete');
}
if (!card.keywords?.length || !card.intents?.length) {
  throw new Error('Agent card missing keywords/intents');
}

const spec = buildOpenApiSpec(opts);
if (!spec.paths['/v1/search']) {
  throw new Error('OpenAPI missing /v1/search');
}

const index = buildDiscoveryIndex(opts);
if (!index.links.openapi || !index.links.agentCard) {
  throw new Error('Discovery index missing openapi/agentCard links');
}
if (!index.keywords?.includes('trinity') || !index.intents?.length) {
  throw new Error('Discovery index missing keywords/intents');
}

const robots = buildRobotsTxt(opts.publicBaseUrl);
if (!robots.includes('x402.json') || !robots.includes('agent.json')) {
  throw new Error('robots.txt missing discovery references');
}

console.log('Discovery catalog checks passed.');
