import { createApp } from './api/server.js';

process.env.PAY_TO_EVM_ADDRESS ||= '0x000000000000000000000000000000000000dEaD';
process.env.X402_NETWORK ||= 'eip155:84532';
process.env.FACILITATOR_URL ||= 'https://x402.org/facilitator';

function header(res, name) {
  return res.headers.get(name);
}

function decodePaymentRequired(res) {
  const encoded = header(res, 'PAYMENT-REQUIRED') || header(res, 'payment-required');
  if (!encoded) {
    throw new Error('Expected PAYMENT-REQUIRED header on HTTP 402');
  }
  const json = Buffer.from(encoded, 'base64').toString('utf8');
  return JSON.parse(json);
}

function assertBazaar(payload, label) {
  const ext = payload.extensions?.bazaar || payload.accepts?.[0]?.extra;
  if (!payload.extensions?.bazaar && !JSON.stringify(payload).includes('bazaar')) {
    throw new Error(`${label} PAYMENT-REQUIRED payload missing bazaar discovery metadata`);
  }
  return ext;
}

try {
  await createApp({
    skipEnvFile: true,
    payTo: '0x1111111111111111111111111111111111111111',
    network: 'eip155:8453',
    facilitatorUrl: 'https://x402.org/facilitator',
    syncFacilitatorOnStart: false,
  });
  throw new Error('Mainnet must refuse the x402.org testnet facilitator');
} catch (err) {
  if (!String(err.message).includes('x402.org') && !String(err.message).includes('production facilitator')) {
    throw err;
  }
}

try {
  await createApp({
    skipEnvFile: true,
    network: 'eip155:84532',
    facilitatorUrl: 'https://x402.org/facilitator',
    syncFacilitatorOnStart: false,
  });
  throw new Error('Missing PAY_TO_EVM_ADDRESS must fail');
} catch (err) {
  if (!String(err.message).includes('PAY_TO_EVM_ADDRESS')) {
    throw err;
  }
}

const app = await createApp({
  skipEnvFile: true,
  payTo: process.env.PAY_TO_EVM_ADDRESS,
  network: process.env.X402_NETWORK,
  facilitatorUrl: process.env.FACILITATOR_URL,
  syncFacilitatorOnStart: true,
});

const server = await new Promise((resolve) => {
  const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
});
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const health = await fetch(`${base}/health`);
  if (health.status !== 200) {
    throw new Error(`GET /health expected 200, got ${health.status}`);
  }
  const healthBody = await health.json();
  if (healthBody.live) {
    throw new Error('Default tests must run against testnet, not mainnet');
  }

  const root = await fetch(`${base}/`);
  if (root.status !== 200) {
    throw new Error(`GET / expected 200, got ${root.status}`);
  }
  const rootBody = await root.json();
  if (!rootBody.discovery?.bazaar && !rootBody.links?.wellKnown) {
    throw new Error('GET / should document agent discovery');
  }
  if (!rootBody.links?.wellKnown) {
    throw new Error('GET / should link to /.well-known/x402.json');
  }

  const wellKnown = await fetch(`${base}/.well-known/x402.json`);
  if (wellKnown.status !== 200) {
    throw new Error(`GET /.well-known/x402.json expected 200, got ${wellKnown.status}`);
  }
  const catalog = await wellKnown.json();
  if (!catalog.services?.length) {
    throw new Error('/.well-known/x402.json missing services[]');
  }
  if (catalog.services[0].amount !== '50000') {
    throw new Error(`Expected $0.05 (50000 micro-USDC), got ${catalog.services[0].amount}`);
  }

  const openapi = await fetch(`${base}/openapi.json`);
  if (openapi.status !== 200) {
    throw new Error(`GET /openapi.json expected 200, got ${openapi.status}`);
  }
  const spec = await openapi.json();
  if (!spec.paths?.['/v1/ask']) {
    throw new Error('openapi.json missing /v1/ask');
  }

  const robots = await fetch(`${base}/robots.txt`);
  if (robots.status !== 200) {
    throw new Error(`GET /robots.txt expected 200, got ${robots.status}`);
  }

  const stats = await fetch(`${base}/v1/stats`);
  if (stats.status !== 200) {
    throw new Error(`GET /v1/stats expected 200, got ${stats.status}`);
  }

  const unpaid = await fetch(`${base}/v1/search?q=trinity`);
  if (unpaid.status !== 402) {
    throw new Error(`Unpaid GET /v1/search expected HTTP 402, got ${unpaid.status}`);
  }
  const searchRequired = decodePaymentRequired(unpaid);
  const accepts = searchRequired.accepts || searchRequired.accept;
  if (!accepts || (Array.isArray(accepts) && accepts.length === 0)) {
    throw new Error('PAYMENT-REQUIRED payload missing accepts');
  }
  assertBazaar(searchRequired, 'search');

  const demo = await fetch(`${base}/v1/search?q=trinity&demo=1`);
  if (demo.status !== 200) {
    throw new Error(`Demo GET /v1/search expected 200, got ${demo.status}`);
  }
  const demoBody = await demo.json();
  if (!demoBody.demo || !demoBody.paidUrl) {
    throw new Error('Demo response should include demo:true and paidUrl');
  }

  const agentCard = await fetch(`${base}/.well-known/agent.json`);
  if (agentCard.status !== 200) {
    throw new Error(`GET /.well-known/agent.json expected 200, got ${agentCard.status}`);
  }
  const card = await agentCard.json();
  if (!card.skills?.length || !card.x402Support) {
    throw new Error('Agent card missing skills or x402Support');
  }

  for (const url of [
    '/v1/document?path=site/christology/hypostatic-union.md',
    '/v1/topic/trinity',
    '/v1/scripture?ref=John%201:14',
    '/v1/ccc?n=234',
    '/v1/ask?q=hypostatic%20union',
  ]) {
    const res = await fetch(`${base}${url}`);
    if (res.status !== 402) {
      throw new Error(`Unpaid GET ${url} expected HTTP 402, got ${res.status}`);
    }
    decodePaymentRequired(res);
  }

  console.log('x402 API checks passed (unpaid /v1 routes return 402 + PAYMENT-REQUIRED).');
} finally {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
