import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import express from 'express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { DaKnowledge } from '../src/engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const MAINNET_NETWORK = 'eip155:8453';
const TESTNET_NETWORK = 'eip155:84532';
const TESTNET_FACILITATOR = 'https://x402.org/facilitator';
const DEFAULT_NETWORK = MAINNET_NETWORK;
const DEFAULT_PORT = 4021;
const SITE_URL = 'https://belongarobert.github.io/DaKnowledge/';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const BURN_ADDRESS = '0x000000000000000000000000000000000000dead';

const PRICES = {
  search: '$0.001',
  document: '$0.002',
  topic: '$0.001',
};

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

function assertPayTo(payTo, network) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
    throw new Error(
      'PAY_TO_EVM_ADDRESS must be a 0x-prefixed 40-hex EVM address that you control on Base.',
    );
  }
  const normalized = payTo.toLowerCase();
  if (
    isMainnet(network) &&
    (normalized === ZERO_ADDRESS || normalized === BURN_ADDRESS)
  ) {
    throw new Error(
      'PAY_TO_EVM_ADDRESS must be your live Base wallet, not a placeholder or burn address.',
    );
  }
}

async function createFacilitatorClient({ network, facilitatorUrl, facilitatorClient }) {
  if (facilitatorClient) return facilitatorClient;

  if (isMainnet(network)) {
    if (facilitatorUrl && /x402\.org/i.test(facilitatorUrl)) {
      throw new Error(
        'Live Base mainnet cannot use https://x402.org/facilitator. Set CDP_API_KEY_ID and CDP_API_KEY_SECRET for the Coinbase production facilitator.',
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
    tags: ['theology', 'catholic', 'bible', 'scripture', 'knowledge'],
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

function serializeDocument(doc, { includeContent = false } = {}) {
  const payload = {
    path: doc.path,
    title: doc.title,
    topic: doc.topic,
    tags: doc.tags,
    sources: doc.sources,
    scripture: doc.scripture,
    excerpt: doc.excerpt,
  };
  if (includeContent) payload.content = doc.content;
  return payload;
}

export async function createApp(options = {}) {
  if (!options.skipEnvFile) {
    await loadEnvFile(join(__dirname, '.env'));
  }

  const payTo = options.payTo || process.env.PAY_TO_EVM_ADDRESS;
  if (!payTo) {
    throw new Error(
      'PAY_TO_EVM_ADDRESS is required. Set it to the Base mainnet wallet that should receive USDC.',
    );
  }

  const network = options.network || process.env.X402_NETWORK || DEFAULT_NETWORK;
  assertPayTo(payTo, network);

  const facilitatorUrl =
    options.facilitatorUrl || process.env.FACILITATOR_URL || undefined;
  const syncFacilitatorOnStart =
    options.syncFacilitatorOnStart ?? process.env.X402_SYNC_FACILITATOR !== 'false';

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

  const resourceServer = new x402ResourceServer(facilitator).register(
    network,
    new ExactEvmScheme(),
  );

  resourceServer.onAfterSettle(async ({ result }) => {
    console.info('x402 payment settled', {
      network: result?.network,
      transaction: result?.transaction,
    });
  });

  const routeOptions = { network, payTo };
  app.use(
    paymentMiddleware(
      {
        'GET /v1/search': paidRoute(
          PRICES.search,
          'Full-text search over the DaKnowledge Catholic theology index. Humans should use the free site search instead.',
          {
            ...routeOptions,
            input: { q: 'hypostatic union' },
            inputSchema: {
              properties: {
                q: { type: 'string', description: 'Full-text query' },
                limit: {
                  type: 'integer',
                  description: 'Max results (1-50)',
                  default: 10,
                },
              },
              required: ['q'],
            },
            output: {
              example: {
                query: 'hypostatic union',
                count: 1,
                results: [
                  {
                    path: 'site/christology/hypostatic-union.md',
                    title: 'Hypostatic Union',
                    excerpt: 'True God and true man...',
                    score: 10,
                  },
                ],
              },
            },
          },
        ),
        'GET /v1/document': paidRoute(
          PRICES.document,
          'Fetch one indexed DaKnowledge document by engine path.',
          {
            ...routeOptions,
            input: { path: 'site/christology/hypostatic-union.md' },
            inputSchema: {
              properties: {
                path: {
                  type: 'string',
                  description:
                    'Engine path such as site/christology/hypostatic-union.md',
                },
              },
              required: ['path'],
            },
            output: {
              example: {
                path: 'site/christology/hypostatic-union.md',
                title: 'Hypostatic Union',
                topic: 'christology',
                excerpt: 'True God and true man...',
              },
            },
          },
        ),
        'GET /v1/topic': paidRoute(
          PRICES.topic,
          'List indexed DaKnowledge documents for a topic id.',
          {
            ...routeOptions,
            input: { id: 'trinity' },
            inputSchema: {
              properties: {
                id: {
                  type: 'string',
                  description: 'Topic id such as trinity, christology, or prayer',
                },
              },
              required: ['id'],
            },
            output: {
              example: {
                topic: 'trinity',
                count: 1,
                documents: [
                  {
                    path: 'site/trinity/index.md',
                    title: 'The Trinity',
                    excerpt: 'One God in three persons...',
                    topic: 'trinity',
                  },
                ],
              },
            },
          },
        ),
      },
      resourceServer,
      undefined,
      undefined,
      syncFacilitatorOnStart,
    ),
  );

  const publicBaseUrl = options.publicBaseUrl || process.env.PUBLIC_BASE_URL || null;

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      site: 'free',
      api: 'x402',
      live: isMainnet(network),
      network,
      payTo,
    });
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'DaKnowledge x402 API',
      site: SITE_URL,
      note: 'The MkDocs site stays free. Only these programmatic routes charge live USDC on Base.',
      live: isMainnet(network),
      network,
      payTo,
      publicBaseUrl,
      routes: {
        'GET /health': 'free',
        [`GET /v1/search?q=`]: PRICES.search,
        [`GET /v1/document?path=`]: PRICES.document,
        [`GET /v1/topic?id=`]: PRICES.topic,
      },
    });
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
    res.json(serializeDocument(doc, { includeContent: true }));
  });

  app.get('/v1/topic', async (req, res) => {
    const id = String(req.query.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Missing query parameter id' });
    }
    const dk = await getEngine();
    const paths = dk.searchByTopic(id);
    const documents = paths.map((docPath) => {
      const doc = dk.getDocument(docPath);
      return doc ? serializeDocument(doc) : { path: docPath };
    });
    res.json({ topic: id, count: documents.length, documents });
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
          ? 'Live USDC on Base mainnet (eip155:8453). Public MkDocs site remains free.'
          : `Test network ${network}. Public MkDocs site remains free.`,
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
