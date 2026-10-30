import { createAnalyticsStore, normalizePath, referrerHost } from './api/analytics.js';
import { createApp } from './api/server.js';

process.env.PAY_TO_EVM_ADDRESS ||= '0x000000000000000000000000000000000000dEaD';
process.env.X402_NETWORK ||= 'eip155:84532';
process.env.FACILITATOR_URL ||= 'https://x402.org/facilitator';

if (normalizePath('https://example.com/study/tracks/?x=1') !== '/study/tracks/') {
  throw new Error('normalizePath failed');
}
if (referrerHost('https://news.ycombinator.com/item?id=1') !== 'news.ycombinator.com') {
  throw new Error('referrerHost failed');
}

const store = createAnalyticsStore();
const pv = store.recordPageview({
  path: '/trinity/',
  referrer: 'https://google.com/search',
  lang: 'en-US',
  ua: 'Mozilla/5.0',
});
if (!pv.ok) throw new Error('pageview should succeed');

store.recordApiHit({
  route: '/v1/ask',
  status: 402,
  outcome: '402',
  demo: false,
  ua: 'curl/8.0',
});
store.recordApiHit({
  route: '/v1/ask',
  status: 200,
  outcome: '200',
  demo: true,
  ua: 'Mozilla/5.0',
});
store.recordApiHit({
  route: 'settle',
  status: 200,
  outcome: 'settled',
  settled: true,
});

const snap = store.snapshot({ detail: true });
if (snap.lifetime.pageviews < 1) throw new Error('expected pageviews');
if (snap.lifetime.apiHits < 3) throw new Error('expected api hits');
if (snap.lifetime.settled < 1) throw new Error('expected settled');
if (!snap.topPages.some((r) => r.key === '/trinity/')) {
  throw new Error('topPages missing /trinity/');
}
if (!snap.days?.length) throw new Error('detail days missing');

const analytics = createAnalyticsStore();
const app = await createApp({
  skipEnvFile: true,
  payTo: process.env.PAY_TO_EVM_ADDRESS,
  network: process.env.X402_NETWORK,
  facilitatorUrl: process.env.FACILITATOR_URL,
  syncFacilitatorOnStart: true,
  metricsToken: 'test-secret',
  analytics,
});

const server = await new Promise((resolve) => {
  const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
});
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const health = await fetch(`${base}/health`);
  const healthBody = await health.json();
  if (!healthBody.analytics) throw new Error('/health should advertise analytics');

  const collect = await fetch(`${base}/v1/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ path: '/study/', referrer: 'https://example.com', lang: 'en' }),
  });
  if (collect.status !== 204) {
    throw new Error(`POST /v1/collect expected 204, got ${collect.status}`);
  }

  const metrics = await fetch(`${base}/metrics`);
  if (metrics.status !== 200) throw new Error('/metrics failed');
  const metricsBody = await metrics.json();
  if ((metricsBody.lifetime?.pageviews || 0) < 1) {
    throw new Error('/metrics should show pageviews after collect');
  }

  const denied = await fetch(`${base}/metrics/detail`);
  if (denied.status !== 401) {
    throw new Error('detail without token should be 401 when METRICS_TOKEN set');
  }
  const detail = await fetch(`${base}/metrics/detail`, {
    headers: { 'X-Metrics-Token': 'test-secret' },
  });
  if (detail.status !== 200) throw new Error('detail with token should be 200');

  const demo = await fetch(`${base}/v1/search?q=trinity&demo=1`);
  if (demo.status !== 200) throw new Error('demo search failed');

  const after = await (await fetch(`${base}/metrics`)).json();
  if ((after.lifetime?.apiHits || 0) < 1) {
    throw new Error('API demo hit should increment metrics');
  }

  console.log('Analytics checks passed.');
} finally {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
