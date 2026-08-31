import {
  AGENT_INTENTS,
  AGENT_KEYWORDS,
  AGENT_REFERENCE_BLURB,
  TOPIC_IDS,
} from './agent-keywords.js';

export const API_NAME = 'DaKnowledge';
export const API_DESCRIPTION =
  'Curated Catholic theology knowledge base for AI agents. Search, cite Scripture and the Catechism, fetch documents, and get cited answers from the indexed Magisterium-aligned corpus — not a generic LLM.';
export const SITE_URL = 'https://belongarobert.github.io/DaKnowledge/';
export const DEFAULT_PUBLIC_BASE_URL = 'https://daknowledge-x402.onrender.com';
export const USDC_BASE_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const SERVICE_TAGS = [...AGENT_KEYWORDS];

export const PRICES = {
  search: '$0.05',
  topic: '$0.05',
  scripture: '$0.05',
  ccc: '$0.05',
  document: '$0.05',
  ask: '$0.05',
};

/** @param {string} price e.g. '$0.05' */
export function priceToMicroUnits(price) {
  const match = String(price).match(/\$([\d.]+)/);
  if (!match) throw new Error(`Invalid price: ${price}`);
  return String(Math.round(Number(match[1]) * 1_000_000));
}

/** @param {string} base */
export function absUrl(base, path) {
  const root = String(base || DEFAULT_PUBLIC_BASE_URL).replace(/\/$/, '');
  return `${root}${path.startsWith('/') ? path : `/${path}`}`;
}

export const ROUTE_CATALOG = [
  {
    key: 'search',
    method: 'GET',
    path: '/v1/search',
    price: PRICES.search,
    description:
      'Full-text search over the curated DaKnowledge Catholic index. Humans should use the free site search.',
    input: { q: 'hypostatic union' },
    inputSchema: {
      properties: {
        q: { type: 'string', description: 'Full-text query' },
        limit: { type: 'integer', description: 'Max results (1-50)', default: 10 },
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
  {
    key: 'document',
    method: 'GET',
    path: '/v1/document',
    price: PRICES.document,
    description:
      'Fetch one indexed document by engine path (excerpt plus optional full markdown).',
    input: { path: 'site/christology/hypostatic-union.md' },
    inputSchema: {
      properties: {
        path: {
          type: 'string',
          description: 'Engine path such as site/christology/hypostatic-union.md',
        },
        full: { type: 'string', description: 'Set to 1 for full markdown content' },
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
  {
    key: 'topic',
    method: 'GET',
    path: '/v1/topic/:topic',
    price: PRICES.topic,
    description: 'List indexed documents for a topic id such as trinity or christology.',
    input: { topic: 'trinity' },
    inputSchema: {
      properties: {
        topic: { type: 'string', description: 'Topic id' },
      },
      required: ['topic'],
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
  {
    key: 'scripture',
    method: 'GET',
    path: '/v1/scripture',
    price: PRICES.scripture,
    description: 'Look up indexed pages that cite a Scripture reference.',
    input: { ref: 'John 1:14' },
    inputSchema: {
      properties: {
        ref: { type: 'string', description: 'Verse reference such as John 1:14' },
      },
      required: ['ref'],
    },
    output: {
      example: {
        ref: 'John 1:14',
        count: 1,
        documents: [
          {
            path: 'site/christology/hypostatic-union.md',
            title: 'Hypostatic Union',
            excerpt: 'The Word became flesh...',
            topic: 'christology',
          },
        ],
      },
    },
  },
  {
    key: 'ccc',
    method: 'GET',
    path: '/v1/ccc',
    price: PRICES.ccc,
    description: 'Look up indexed pages that cite a Catechism paragraph number.',
    input: { n: '234' },
    inputSchema: {
      properties: {
        n: { type: 'string', description: 'CCC paragraph number such as 234' },
      },
      required: ['n'],
    },
    output: {
      example: {
        ccc: '234',
        count: 1,
        documents: [
          {
            path: 'site/trinity/index.md',
            title: 'The Trinity',
            excerpt: 'The central mystery of Christian faith and life...',
            topic: 'trinity',
          },
        ],
      },
    },
  },
  {
    key: 'ask',
    method: 'GET',
    path: '/v1/ask',
    price: PRICES.ask,
    description:
      'Cited synthesis from the curated index: a short answer plus CCC, Scripture, and source paths. Not a generic LLM.',
    input: { q: 'What is the hypostatic union?' },
    inputSchema: {
      properties: {
        q: { type: 'string', description: 'Question or topic to answer from the index' },
      },
      required: ['q'],
    },
    output: {
      example: {
        query: 'What is the hypostatic union?',
        answer: 'The Son assumed a human nature in the unity of his person...',
        citations: {
          paths: [
            {
              path: 'site/christology/hypostatic-union.md',
              title: 'Hypostatic Union',
              topic: 'christology',
            },
          ],
          scripture: ['John 1:14'],
          ccc: ['464', '467'],
          sources: [],
        },
      },
    },
  },
];

function bazaarInput(route) {
  const queryParams = route.inputSchema?.properties
    ? Object.fromEntries(
        Object.entries(route.inputSchema.properties)
          .filter(([key]) => route.input[key] !== undefined)
          .map(([key]) => [key, route.input[key]]),
      )
    : route.input;
  return {
    type: 'http',
    method: route.method,
    queryParams,
  };
}

function facilitatorLabel(network, facilitatorUrl) {
  if (/cdp\.coinbase\.com/i.test(facilitatorUrl || '')) return 'coinbase';
  if (network === 'eip155:8453') return 'coinbase';
  return 'x402.org';
}

/**
 * @param {{
 *   network: string;
 *   payTo: string;
 *   publicBaseUrl?: string | null;
 *   facilitatorUrl?: string | null;
 * }} opts
 */
export function buildWellKnownCatalog(opts) {
  const publicBaseUrl = opts.publicBaseUrl || DEFAULT_PUBLIC_BASE_URL;
  const asset =
    opts.network === 'eip155:8453' ? USDC_BASE_MAINNET : USDC_BASE_MAINNET;

  return {
    x402Version: 2,
    name: API_NAME,
    description: API_DESCRIPTION,
    site: SITE_URL,
    publicBaseUrl,
    network: opts.network,
    facilitator: facilitatorLabel(opts.network, opts.facilitatorUrl),
    facilitatorUrl: opts.facilitatorUrl || null,
    payTo: opts.payTo,
    tags: SERVICE_TAGS,
    iconUrl: `${SITE_URL}assets/images/crucifix.svg`,
    keywords: AGENT_KEYWORDS,
    agentReference: AGENT_REFERENCE_BLURB,
    topics: TOPIC_IDS,
    intents: AGENT_INTENTS,
    discovery: {
      catalog: absUrl(publicBaseUrl, '/.well-known/x402.json'),
      openapi: absUrl(publicBaseUrl, '/openapi.json'),
      index: absUrl(publicBaseUrl, '/'),
      humanDocs: `${SITE_URL}study/developers/`,
      llmsTxt: `${SITE_URL}llms.txt`,
      bazaarSearch:
        'https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=DaKnowledge',
      bazaarMcp: 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/mcp',
    },
    services: ROUTE_CATALOG.map((route) => ({
      method: route.method,
      path: route.path,
      url: absUrl(publicBaseUrl, route.path),
      description: route.description,
      price: route.price,
      amount: priceToMicroUnits(route.price),
      asset,
      discoverable: true,
      tags: SERVICE_TAGS,
      input: bazaarInput(route),
      output: route.output,
      inputSchema: route.inputSchema,
      demo: {
        available: true,
        queryParam: 'demo=1',
        example: `${absUrl(publicBaseUrl, route.path)}${route.path.includes('?') ? '&' : '?'}demo=1`,
      },
    })),
  };
}

/**
 * @param {{
 *   publicBaseUrl?: string | null;
 *   network: string;
 * }} opts
 */
export function buildOpenApiSpec(opts) {
  const publicBaseUrl = opts.publicBaseUrl || DEFAULT_PUBLIC_BASE_URL;
  const serverUrl = publicBaseUrl.replace(/\/$/, '');

  const paths = {
    '/': {
      get: {
        summary: 'Free discovery index',
        tags: ['discovery'],
        responses: { 200: { description: 'JSON service catalog' } },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['discovery'],
        responses: { 200: { description: 'Service health' } },
      },
    },
    '/v1/stats': {
      get: {
        summary: 'Index statistics (free)',
        tags: ['discovery'],
        responses: { 200: { description: 'Document counts' } },
      },
    },
  };

  for (const route of ROUTE_CATALOG) {
    const openApiPath = route.path.replace(':topic', '{topic}');
    const parameters = [];
    if (route.path.includes(':topic')) {
      parameters.push({
        name: 'topic',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    }
    for (const [name, schema] of Object.entries(route.inputSchema?.properties || {})) {
      if (route.path.includes(`:${name}`)) continue;
      parameters.push({
        name,
        in: 'query',
        required: route.inputSchema.required?.includes(name) ?? false,
        schema,
      });
    }

    paths[openApiPath] = {
      get: {
        summary: route.description,
        description: `Paid x402 route. ${route.price} USDC per call on ${opts.network}.`,
        tags: ['paid'],
        parameters,
        responses: {
          200: {
            description: 'JSON result',
            content: {
              'application/json': {
                example: route.output.example,
              },
            },
          },
          402: { description: 'Payment required (x402 PAYMENT-REQUIRED header)' },
        },
        'x-x402-price': route.price,
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: `${API_NAME} x402 API`,
      description: API_DESCRIPTION,
      version: '1.0.0',
      contact: {
        url: SITE_URL,
      },
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: 'discovery', description: 'Free catalog and health endpoints' },
      { name: 'paid', description: 'x402-paid retrieval routes ($0.05 USDC each)' },
    ],
    paths,
    externalDocs: {
      description: 'Human-readable developer guide',
      url: `${SITE_URL}study/developers/`,
    },
  };
}

export function buildRobotsTxt(publicBaseUrl) {
  const base = (publicBaseUrl || DEFAULT_PUBLIC_BASE_URL).replace(/\/$/, '');
  return `# DaKnowledge x402 API — agents welcome
User-agent: *
Allow: /
Allow: /.well-known/x402.json
Allow: /.well-known/agent.json
Allow: /agent.json
Allow: /openapi.json
Allow: /v1/stats

# Free discovery
# Catalog: ${base}/.well-known/x402.json
# Agent card: ${base}/.well-known/agent.json
# OpenAPI: ${base}/openapi.json
# Demo previews: add ?demo=1 to any /v1 paid route
# Human site (free): ${SITE_URL}
# llms.txt: ${SITE_URL}llms.txt
`;
}

/**
 * Agent card for A2A / directory crawlers.
 * @param {{
 *   network: string;
 *   payTo: string;
 *   publicBaseUrl?: string | null;
 *   facilitatorUrl?: string | null;
 * }} opts
 */
export function buildAgentCard(opts) {
  const publicBaseUrl = opts.publicBaseUrl || DEFAULT_PUBLIC_BASE_URL;
  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    name: API_NAME,
    description: API_DESCRIPTION,
    url: base,
    provider: {
      organization: API_NAME,
      url: SITE_URL,
    },
    version: '1.0.0',
    documentationUrl: `${SITE_URL}study/developers/`,
    iconUrl: `${SITE_URL}assets/images/crucifix.svg`,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      x402: true,
    },
    x402Support: true,
    keywords: AGENT_KEYWORDS,
    agentReference: AGENT_REFERENCE_BLURB,
    topics: TOPIC_IDS,
    intents: AGENT_INTENTS,
    defaultInputModes: ['text', 'application/json'],
    defaultOutputModes: ['application/json'],
    skills: ROUTE_CATALOG.map((route) => ({
      id: route.key,
      name: route.path,
      description: route.description,
      tags: SERVICE_TAGS,
      examples: [JSON.stringify(route.input)],
      inputModes: ['text'],
      outputModes: ['application/json'],
      price: route.price,
      endpoint: absUrl(publicBaseUrl, route.path),
      demo: `${absUrl(publicBaseUrl, route.path)}${route.path.includes('?') ? '&' : '?'}demo=1`,
    })),
    discovery: {
      wellKnown: absUrl(publicBaseUrl, '/.well-known/x402.json'),
      openapi: absUrl(publicBaseUrl, '/openapi.json'),
      llmsTxt: `${SITE_URL}llms.txt`,
      llmsFullTxt: `${SITE_URL}llms-full.txt`,
      bazaarMcp: 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/mcp',
      directories: [
        'https://x402-list.com/services?q=DaKnowledge',
        'https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=DaKnowledge',
      ],
    },
    network: opts.network,
    payTo: opts.payTo,
    facilitator: opts.facilitatorUrl || null,
  };
}

export function buildDiscoveryIndex(opts) {
  const publicBaseUrl = opts.publicBaseUrl || DEFAULT_PUBLIC_BASE_URL;
  return {
    name: `${API_NAME} x402 API`,
    site: SITE_URL,
    note: 'The MkDocs site stays free. Only programmatic /v1 agent routes require x402 payment.',
    network: opts.network,
    facilitator: opts.facilitatorUrl || (opts.network === 'eip155:8453' ? 'cdp' : 'x402.org'),
    publicBaseUrl,
    keywords: AGENT_KEYWORDS,
    agentReference: AGENT_REFERENCE_BLURB,
    topics: TOPIC_IDS,
    intents: AGENT_INTENTS,
    links: {
      wellKnown: absUrl(publicBaseUrl, '/.well-known/x402.json'),
      agentCard: absUrl(publicBaseUrl, '/.well-known/agent.json'),
      openapi: absUrl(publicBaseUrl, '/openapi.json'),
      llmsTxt: `${SITE_URL}llms.txt`,
      llmsFullTxt: `${SITE_URL}llms-full.txt`,
      agentsReference: `${SITE_URL}study/agents-reference/`,
      bazaarMcp: 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/mcp',
      bazaarSearch:
        'https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=DaKnowledge',
      x402List: 'https://x402-list.com/services?q=DaKnowledge',
    },
    humanDocs: `${SITE_URL}study/developers/`,
    discovery: {
      local: 'GET / (this document)',
      wellKnown: 'GET /.well-known/x402.json (agent catalog — crawl without paying)',
      agentCard: 'GET /.well-known/agent.json (A2A-style agent card)',
      openapi: 'GET /openapi.json (OpenAPI 3.1 for tools and agents)',
      demo:
        'Add ?demo=1 to any paid /v1 route for a free truncated preview (same JSON shape as paid).',
      bazaar:
        'Paid routes declare the x402 Bazaar extension. After a settled payment through CDP, agents can find DaKnowledge via GET /discovery/resources or the Bazaar MCP server. Until listed, use /.well-known/x402.json or GET /.',
      recommendedFlow:
        '1) GET /v1/ask?q=… for cited answers, 2) GET /v1/search?q=… to explore, 3) GET /v1/document?path=… for full text, 4) GET /v1/scripture or /v1/ccc for verse/paragraph lookups.',
    },
    routes: {
      'GET /': 'free',
      'GET /health': 'free',
      'GET /v1/stats': 'free',
      'GET /.well-known/x402.json': 'free',
      'GET /.well-known/agent.json': 'free',
      'GET /openapi.json': 'free',
      'GET /v1/*?demo=1': 'free preview',
      'GET /v1/search?q=': PRICES.search,
      'GET /v1/document?path=': PRICES.document,
      'GET /v1/topic/:topic': PRICES.topic,
      'GET /v1/scripture?ref=': PRICES.scripture,
      'GET /v1/ccc?n=': PRICES.ccc,
      'GET /v1/ask?q=': PRICES.ask,
    },
  };
}
