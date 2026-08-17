import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import express from 'express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { DaKnowledge } from '../src/engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const DEFAULT_NETWORK = 'eip155:84532'; // Base Sepolia
const DEFAULT_FACILITATOR = 'https://x402.org/facilitator';
const DEFAULT_PORT = 4021;
const MAINNET_NETWORK = 'eip155:8453';

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

function paidRoute(price, description, { network, payTo }) {
  return {
    accepts: {
      scheme: 'exact',
      price,
      network,
      payTo,
    },
    description,
    mimeType: 'application/json',
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
      'PAY_TO_EVM_ADDRESS is required. Copy api/.env.example to api/.env and set a receiving wallet.',
    );
  }

  const network = options.network || process.env.X402_NETWORK || DEFAULT_NETWORK;
  const facilitatorUrl =
    options.facilitatorUrl || process.env.FACILITATOR_URL || DEFAULT_FACILITATOR;
  const syncFacilitatorOnStart =
    options.syncFacilitatorOnStart ?? process.env.X402_SYNC_FACILITATOR !== 'false';

  if (network === MAINNET_NETWORK && /x402\.org/i.test(facilitatorUrl)) {
    console.warn(
      'Base mainnet (eip155:8453) needs a production facilitator, not https://x402.org/facilitator.',
    );
  }

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

  const resourceServer = new x402ResourceServer(
    new HTTPFacilitatorClient({ url: facilitatorUrl }),
  ).register(network, new ExactEvmScheme());

  const routeOptions = { network, payTo };
  app.use(
    paymentMiddleware(
      {
        'GET /v1/search': paidRoute(
          '$0.001',
          'Full-text search over the DaKnowledge index',
          routeOptions,
        ),
        'GET /v1/document': paidRoute(
          '$0.002',
          'Fetch one indexed document by path',
          routeOptions,
        ),
        'GET /v1/topic': paidRoute(
          '$0.001',
          'List indexed documents for a topic id',
          routeOptions,
        ),
      },
      resourceServer,
      undefined,
      undefined,
      syncFacilitatorOnStart,
    ),
  );

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      site: 'free',
      api: 'x402',
      network,
    });
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'DaKnowledge x402 API',
      site: 'https://belongarobert.github.io/DaKnowledge/',
      note: 'The MkDocs site stays free. Only these programmatic routes require x402 payment.',
      network,
      facilitator: facilitatorUrl,
      routes: {
        'GET /health': 'free',
        'GET /v1/search?q=': '$0.001',
        'GET /v1/document?path=': '$0.002',
        'GET /v1/topic?id=': '$0.001',
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
  return await new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`DaKnowledge x402 API listening on http://localhost:${port}`);
      console.log('Public MkDocs site remains free on GitHub Pages.');
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
