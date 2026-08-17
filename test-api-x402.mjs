import { createApp, DEFAULT_PAY_TO } from './api/server.js';

if (DEFAULT_PAY_TO !== '0xF81796579285356c207ec7c16db3f065eD45c88B') {
  throw new Error(`Live pay-to wallet is wrong: ${DEFAULT_PAY_TO}`);
}

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

try {
  await createApp({
    skipEnvFile: true,
    payTo: '0x1111111111111111111111111111111111111111',
    network: 'eip155:8453',
    facilitatorUrl: 'https://x402.org/facilitator',
    syncFacilitatorOnStart: false,
  });
  throw new Error('Live mainnet must refuse the x402.org testnet facilitator');
} catch (err) {
  if (!String(err.message).includes('x402.org')) {
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
    throw new Error('Unit tests must run against testnet, not live Base mainnet');
  }

  const unpaid = await fetch(`${base}/v1/search?q=trinity`);
  if (unpaid.status !== 402) {
    throw new Error(`Unpaid GET /v1/search expected HTTP 402, got ${unpaid.status}`);
  }

  const required = decodePaymentRequired(unpaid);
  const accepts = required.accepts || required.accept;
  if (!accepts || (Array.isArray(accepts) && accepts.length === 0)) {
    throw new Error('PAYMENT-REQUIRED payload missing accepts');
  }

  const document = await fetch(
    `${base}/v1/document?path=site/christology/hypostatic-union.md`,
  );
  if (document.status !== 402) {
    throw new Error(`Unpaid GET /v1/document expected HTTP 402, got ${document.status}`);
  }
  decodePaymentRequired(document);

  const topic = await fetch(`${base}/v1/topic?id=trinity`);
  if (topic.status !== 402) {
    throw new Error(`Unpaid GET /v1/topic expected HTTP 402, got ${topic.status}`);
  }
  decodePaymentRequired(topic);

  console.log('x402 API checks passed (unpaid /v1 routes return 402 + PAYMENT-REQUIRED).');
} finally {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
