import { appendFile, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import express from 'express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { DaKnowledge } from '../src/engine.js';
import {
  PRICES,
  ROUTE_CATALOG,
  SITE_URL as DISCOVERY_SITE_URL,
  buildAgentCard,
  buildDiscoveryIndex,
  buildOpenApiSpec,
  buildRobotsTxt,
  buildWellKnownCatalog,
} from './discovery-catalog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const MAINNET_NETWORK = 'eip155:8453';
const TESTNET_NETWORK = 'eip155:84532';
const TESTNET_FACILITATOR = 'https://x402.org/facilitator';
const DEFAULT_NETWORK = TESTNET_NETWORK;
const DEFAULT_PORT = 4021;
const SITE_URL = DISCOVERY_SITE_URL;

const PRICE_BY_PATH = [
  [/^\/v1\/ask$/, PRICES.ask],
  [/^\/v1\/document$/, PRICES.document],
  [/^\/v1\/search$/, PRICES.search],
  [/^\/v1\/scripture$/, PRICES.scripture],
  [/^\/v1\/ccc$/, PRICES.ccc],
  [/^\/v1\/topic(?:\/|$)/, PRICES.topic],
];

async function loadEnvFile(filePath) {
  try {
    const text = await readFile(filePath, 'utf-8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function isMainnet(network) {
  return network === MAINNET_NETWORK;
}

function assertPayTo(payTo) {
  if (!payTo) {
    throw new Error(
      'PAY_TO_EVM_ADDRESS is required. Copy api/.env.example to api/.env and set a receiving wallet. Do not commit the address.',
    );
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
    throw new Error(
      'PAY_TO_EVM_ADDRESS must be a 0x-prefixed 40-hex EVM address.',
    );
  }
}

function amountForPath(path) {
  for (const [pattern, price] of PRICE_BY_PATH) {
    if (pattern.test(path)) return price;
  }
  return null;
}

function truncateQuery(query) {
  const raw = JSON.stringify(query || {});
  return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
}

function createAccessLogger(logFile) {
  return async function logAccess(event) {
    const line = JSON.stringify({
      type: 'x402_access',
      ts: new Date().toISOString(),
      ...event,
    });
    console.log(line);
    if (logFile) {
      try {
        await appendFile(logFile, `${line}\n`);
      } catch (err) {
        console.error('x402 access log write failed', err.message);
      }
    }
  };
}

async function createFacilitatorClient({ network, facilitatorUrl, facilitatorClient }) {
  if (facilitatorClient) return facilitatorClient;

  if (isMainnet(network)) {
    if (!facilitatorUrl || /x402\.org/i.test(facilitatorUrl)) {
      throw new Error(
        'Mainnet (eip155:8453) needs a production facilitator, not https://x402.org/facilitator. Set FACILITATOR_URL and CDP_API_KEY_ID / CDP_API_KEY_SECRET.',
      );
    }
    const { createCdpFacilitatorClient } = await import('@coinbase/cdp-sdk/x402');
    return createCdpFacilitatorClient();
  }

  return new HTTPFacilitatorClient({
    url: facilitatorUrl || TESTNET_FACILITATOR,
  });
}

function paidRoute(price, description, { network, payTo, input, inputSchema, output }) {
  return {
    accepts: {
      scheme: 'exact',
      price,
      network,
      payTo,
    },
    description,
    mimeType: 'application/json',
    serviceName: 'DaKnowledge',
    tags: ['theology', 'catholic', 'bible', 'scripture', 'catechism', 'knowledge'],
    iconUrl: `${SITE_URL}assets/images/crucifix.svg`,
    extensions: {
      ...declareDiscoveryExtension({
        input,
        inputSchema,
        output,
      }),
    },
  };
}

function isDemoRequest(req) {
  const raw = String(req.query.demo ?? '').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function paidUrlForRequest(req, publicBaseUrl) {
  const base = (publicBaseUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'demo') continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else if (value !== undefined) {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return `${base}${req.path}${qs ? `?${qs}` : ''}`;
}

function wrapDemoPayload(payload, req, publicBaseUrl) {
  return {
    demo: true,
    upgrade: 'Remove demo=1 and pay $0.05 USDC via x402 for the full result.',
    paidUrl: paidUrlForRequest(req, publicBaseUrl),
    ...payload,
  };
}

function truncateExcerpt(text, max = 160) {
  const raw = String(text || '');
  return raw.length > max ? `${raw.slice(0, max - 3)}...` : raw;
}

function serializeDocument(doc, { includeContent = false } = {}) {
  const payload = {
    path: doc.path,
    title: doc.title,
    topic: doc.topic,
    tags: doc.tags,
    sources: doc.sources,
    scripture: doc.scripture,
    ccc: doc.ccc,
    excerpt: doc.excerpt,
  };
  if (includeContent) payload.content = doc.content;
  return payload;
}

function serializeDemoDocument(doc) {
  return {
    path: doc.path,
    title: doc.title,
    topic: doc.topic,
    excerpt: truncateExcerpt(doc.excerpt),
  };
}

export async function createApp(options = {}) {
  if (!options.skipEnvFile) {
    await loadEnvFile(join(__dirname, '.env'));
  }

  const payTo = options.payTo || process.env.PAY_TO_EVM_ADDRESS;
  assertPayTo(payTo);

  const network = options.network || process.env.X402_NETWORK || DEFAULT_NETWORK;
  const facilitatorUrl =
    options.facilitatorUrl || process.env.FACILITATOR_URL || undefined;
  const syncFacilitatorOnStart =
    options.syncFacilitatorOnStart ?? process.env.X402_SYNC_FACILITATOR !== 'false';
  const logAccess = createAccessLogger(
    options.accessLogFile || process.env.X402_ACCESS_LOG || null,
  );

  const facilitator = await createFacilitatorClient({
    network,
    facilitatorUrl,
    facilitatorClient: options.facilitatorClient,
  });

  let engine = options.engine || null;
  async function getEngine() {
    if (engine) return engine;
    const dk = new DaKnowledge(join(repoRoot, 'config.yaml'));
    await dk.init();
    engine = dk;
    return engine;
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'PAYMENT-REQUIRED, PAYMENT-RESPONSE',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'PAYMENT-SIGNATURE, Content-Type',
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith('/v1/') || req.path === '/v1/stats') return next();
    const started = Date.now();
    res.on('finish', () => {
      const status = res.statusCode;
      let outcome = String(status);
      if (status === 402) outcome = '402';
      else if (status === 200) outcome = '200';
      void logAccess({
        route: `${req.method} ${req.path}`,
        query: truncateQuery(req.query),
        amount: amountForPath(req.path),
        status,
        outcome,
        ms: Date.now() - started,
      });
    });
    next();
  });

  const resourceServer = new x402ResourceServer(facilitator).register(
    network,
    new ExactEvmScheme(),
  );

  resourceServer.onAfterSettle(async ({ result }) => {
    await logAccess({
      route: 'settle',
      query: '{}',
      amount: null,
      status: 200,
      outcome: 'settled',
      network: result?.network,
      transaction: result?.transaction,
    });
  });

  resourceServer.onSettleFailure(async (context) => {
    await logAccess({
      route: 'settle',
      query: '{}',
      amount: null,
      status: 402,
      outcome: 'settle_failure',
      error: context?.error?.message || context?.result?.error || 'settle failed',
    });
  });

  const routeOptions = { network, payTo };

  // Free demo previews must run BEFORE payment middleware so scanners can
  // inspect response shape without a wallet (directories expect ?demo=1).
  const publicBaseUrlEarly =
    options.publicBaseUrl || process.env.PUBLIC_BASE_URL || null;

  app.use(async (req, res, next) => {
    if (!isDemoRequest(req) || !req.path.startsWith('/v1/') || req.path === '/v1/stats') {
      return next();
    }
    try {
      const dk = await getEngine();
      if (req.path === '/v1/search') {
        const q = String(req.query.q || '').trim();
        if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
        const results = dk.searchFullText(q).slice(0, 2).map((item) => ({
          ...item,
          excerpt: truncateExcerpt(item.excerpt),
        }));
        return res.json(
          wrapDemoPayload({ query: q, count: results.length, results }, req, publicBaseUrlEarly),
        );
      }
      if (req.path === '/v1/document') {
        const path = String(req.query.path || '').trim();
        if (!path) return res.status(400).json({ error: 'Missing query parameter path' });
        const doc = dk.getDocument(path);
        if (!doc) return res.status(404).json({ error: 'Document not found', path });
        return res.json(
          wrapDemoPayload(serializeDemoDocument(doc), req, publicBaseUrlEarly),
        );
      }
      if (req.path.startsWith('/v1/topic/')) {
        const id = decodeURIComponent(req.path.slice('/v1/topic/'.length)).trim();
        if (!id) return res.status(400).json({ error: 'Missing topic' });
        const paths = dk.searchByTopic(id).slice(0, 2);
        const documents = paths.map((docPath) => {
          const doc = dk.getDocument(docPath);
          return doc ? serializeDemoDocument(doc) : { path: docPath };
        });
        return res.json(
          wrapDemoPayload({ topic: id, count: documents.length, documents }, req, publicBaseUrlEarly),
        );
      }
      if (req.path === '/v1/scripture') {
        const ref = String(req.query.ref || '').trim();
        if (!ref) return res.status(400).json({ error: 'Missing query parameter ref' });
        const documents = dk.lookupScripture(ref).slice(0, 2).map(serializeDemoDocument);
        return res.json(
          wrapDemoPayload({ ref, count: documents.length, documents }, req, publicBaseUrlEarly),
        );
      }
      if (req.path === '/v1/ccc') {
        const n = String(req.query.n || '').trim();
        if (!n) return res.status(400).json({ error: 'Missing query parameter n' });
        const documents = dk.lookupCcc(n).slice(0, 2).map(serializeDemoDocument);
        return res.json(
          wrapDemoPayload({ ccc: n, count: documents.length, documents }, req, publicBaseUrlEarly),
        );
      }
      if (req.path === '/v1/ask') {
        const q = String(req.query.q || '').trim();
        if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
        const full = dk.synthesize(q);
        return res.json(
          wrapDemoPayload(
            {
              query: full.query,
              answer: truncateExcerpt(full.answer, 240),
              citations: {
                paths: (full.citations?.paths || []).slice(0, 2),
                scripture: (full.citations?.scripture || []).slice(0, 2),
                ccc: (full.citations?.ccc || []).slice(0, 2),
                sources: [],
              },
            },
            req,
            publicBaseUrlEarly,
          ),
        );
      }
      return next();
    } catch (err) {
      return next(err);
    }
  });

  const paidRoutes = Object.fromEntries(
    ROUTE_CATALOG.map((route) => [
      `${route.method} ${route.path}`,
      paidRoute(route.price, route.description, {
        ...routeOptions,
        input: route.input,
        inputSchema: route.inputSchema,
        output: route.output,
      }),
    ]),
  );

  app.use(
    paymentMiddleware(
      paidRoutes,
      resourceServer,
      undefined,
      undefined,
      syncFacilitatorOnStart,
    ),
  );

  const publicBaseUrl = options.publicBaseUrl || process.env.PUBLIC_BASE_URL || null;
  const catalogOpts = { network, payTo, publicBaseUrl, facilitatorUrl };
  const discovery = buildDiscoveryIndex(catalogOpts);

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      site: 'free',
      api: 'x402',
      live: isMainnet(network),
      network,
    });
  });

  app.get('/', (_req, res) => {
    res.json(discovery);
  });

  app.get('/.well-known/x402.json', (_req, res) => {
    res.json(buildWellKnownCatalog(catalogOpts));
  });

  app.get('/.well-known/agent.json', (_req, res) => {
    res.json(buildAgentCard(catalogOpts));
  });

  app.get('/agent.json', (_req, res) => {
    res.json(buildAgentCard(catalogOpts));
  });

  app.get('/openapi.json', (_req, res) => {
    res.json(buildOpenApiSpec(catalogOpts));
  });

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(buildRobotsTxt(publicBaseUrl));
  });

  app.get('/v1/stats', async (_req, res) => {
    const dk = await getEngine();
    res.json({ site: 'free', ...dk.getStats() });
  });

  app.get('/v1/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const dk = await getEngine();
    const results = dk.searchFullText(q).slice(0, limit);
    res.json({ query: q, count: results.length, results });
  });

  app.get('/v1/document', async (req, res) => {
    const path = String(req.query.path || '').trim();
    if (!path) {
      return res.status(400).json({ error: 'Missing query parameter path' });
    }
    const dk = await getEngine();
    const doc = dk.getDocument(path);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found', path });
    }
    res.json(serializeDocument(doc, { includeContent: req.query.full === '1' }));
  });

  app.get('/v1/topic/:topic', async (req, res) => {
    const id = String(req.params.topic || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Missing topic' });
    }
    const dk = await getEngine();
    const paths = dk.searchByTopic(id);
    const documents = paths.map((docPath) => {
      const doc = dk.getDocument(docPath);
      return doc ? serializeDocument(doc) : { path: docPath };
    });
    res.json({ topic: id, count: documents.length, documents });
  });

  app.get('/v1/scripture', async (req, res) => {
    const ref = String(req.query.ref || '').trim();
    if (!ref) {
      return res.status(400).json({ error: 'Missing query parameter ref' });
    }
    const dk = await getEngine();
    const documents = dk.lookupScripture(ref);
    res.json({ ref, count: documents.length, documents });
  });

  app.get('/v1/ccc', async (req, res) => {
    const n = String(req.query.n || '').trim();
    if (!n) {
      return res.status(400).json({ error: 'Missing query parameter n' });
    }
    const dk = await getEngine();
    const documents = dk.lookupCcc(n);
    res.json({ ccc: n, count: documents.length, documents });
  });

  app.get('/v1/ask', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }
    const dk = await getEngine();
    res.json(dk.synthesize(q));
  });

  return app;
}

export async function start(options = {}) {
  const app = await createApp(options);
  const port = Number(options.port || process.env.PORT || DEFAULT_PORT);
  const host = options.host || process.env.HOST || '0.0.0.0';
  return await new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      const network = options.network || process.env.X402_NETWORK || DEFAULT_NETWORK;
      console.log(`DaKnowledge x402 API listening on http://${host}:${port}`);
      console.log(
        isMainnet(network)
          ? 'Mainnet USDC. Public MkDocs site remains free.'
          : `Testnet ${network}. Public MkDocs site remains free.`,
      );
      resolve(server);
    });
  });
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  start().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
