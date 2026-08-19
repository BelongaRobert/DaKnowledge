import {
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

const spec = buildOpenApiSpec(opts);
if (!spec.paths['/v1/search']) {
  throw new Error('OpenAPI missing /v1/search');
}

const index = buildDiscoveryIndex(opts);
if (!index.links.openapi) {
  throw new Error('Discovery index missing openapi link');
}

const robots = buildRobotsTxt(opts.publicBaseUrl);
if (!robots.includes('x402.json')) {
  throw new Error('robots.txt missing x402.json reference');
}

console.log('Discovery catalog checks passed.');
