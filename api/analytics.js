/**
 * In-process analytics for DaKnowledge.
 * Aggregates human pageviews (beacon) and agent/API traffic.
 * Render free disks are ephemeral — weekly GitHub Action snapshots persist history.
 */

const FREE_PATHS = new Set([
  '/',
  '/health',
  '/metrics',
  '/metrics/detail',
  '/openapi.json',
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
  '/agent.json',
  '/.well-known/x402.json',
  '/.well-known/agent.json',
  '/.well-known/ai.txt',
  '/v1/stats',
  '/v1/collect',
]);

const MAX_TOP = 25;
const MAX_RECENT = 40;
const MAX_PATH_LEN = 200;
const COLLECT_WINDOW_MS = 60_000;
const COLLECT_MAX_PER_WINDOW = 120;

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function emptyDay(day) {
  return {
    day,
    pageviews: 0,
    uniquePaths: {},
    referrers: {},
    api: {
      total: 0,
      demo: 0,
      paid200: 0,
      paymentRequired: 0,
      settled: 0,
      settleFailure: 0,
      errors: 0,
      byRoute: {},
    },
  };
}

function classifyUa(ua) {
  const s = String(ua || '').toLowerCase();
  if (!s) return 'unknown';
  if (/bot|crawl|spider|slurp|facebookexternalhit|preview|wget|curl|python-requests|go-http|axios|node-fetch|httpclient/i.test(s)) {
    return 'bot';
  }
  if (/mozilla|chrome|safari|firefox|edg\//i.test(s)) return 'browser';
  return 'agent';
}

function normalizePath(raw) {
  let path = String(raw || '/').trim() || '/';
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      path = new URL(path).pathname;
    }
  } catch {
    path = '/';
  }
  path = path.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > MAX_PATH_LEN) path = path.slice(0, MAX_PATH_LEN);
  return path;
}

function referrerHost(raw) {
  const s = String(raw || '').trim();
  if (!s) return '(direct)';
  try {
    return new URL(s).hostname || '(direct)';
  } catch {
    return '(direct)';
  }
}

function bump(map, key, n = 1) {
  map[key] = (map[key] || 0) + n;
}

function topEntries(map, limit = MAX_TOP) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export function createAnalyticsStore(options = {}) {
  const startedAt = new Date().toISOString();
  const days = new Map();
  const recent = [];
  const collectHits = [];
  let lifetimePageviews = 0;
  let lifetimeApi = 0;
  let lifetimeSettled = 0;

  function dayBucket(isoTs) {
    const key = dayKey(isoTs ? new Date(isoTs) : new Date());
    if (!days.has(key)) days.set(key, emptyDay(key));
    return days.get(key);
  }

  function pushRecent(event) {
    recent.unshift(event);
    if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
  }

  function allowCollect() {
    const now = Date.now();
    while (collectHits.length && now - collectHits[0] > COLLECT_WINDOW_MS) {
      collectHits.shift();
    }
    if (collectHits.length >= COLLECT_MAX_PER_WINDOW) return false;
    collectHits.push(now);
    return true;
  }

  function recordPageview(input = {}) {
    if (!allowCollect()) return { ok: false, error: 'rate_limited' };
    const path = normalizePath(input.path);
    const ref = referrerHost(input.referrer);
    const lang = String(input.lang || '').slice(0, 16) || null;
    const bucket = dayBucket();
    bucket.pageviews += 1;
    bump(bucket.uniquePaths, path);
    bump(bucket.referrers, ref);
    lifetimePageviews += 1;
    const event = {
      type: 'pageview',
      ts: new Date().toISOString(),
      path,
      referrer: ref,
      lang,
      uaClass: classifyUa(input.ua),
    };
    pushRecent(event);
    return { ok: true, event };
  }

  function recordApiHit(input = {}) {
    const route = String(input.route || input.path || 'unknown');
    const status = Number(input.status) || 0;
    const demo = Boolean(input.demo);
    const outcome = String(input.outcome || status);
    const bucket = dayBucket();
    bucket.api.total += 1;
    bump(bucket.api.byRoute, route);
    lifetimeApi += 1;

    if (outcome === 'settled' || input.settled) {
      bucket.api.settled += 1;
      lifetimeSettled += 1;
    } else if (outcome === 'settle_failure') {
      bucket.api.settleFailure += 1;
    } else if (demo) {
      bucket.api.demo += 1;
    } else if (status === 402 || outcome === '402') {
      bucket.api.paymentRequired += 1;
    } else if (
      status === 200 &&
      route.startsWith('/v1/') &&
      !FREE_PATHS.has(route.split('?')[0])
    ) {
      bucket.api.paid200 += 1;
    } else if (status >= 500) {
      bucket.api.errors += 1;
    }

    const event = {
      type: 'api',
      ts: new Date().toISOString(),
      route,
      status,
      demo,
      outcome,
      ms: input.ms ?? null,
      uaClass: classifyUa(input.ua),
    };
    pushRecent(event);
    return { ok: true, event };
  }

  function snapshot({ detail = false } = {}) {
    const today = dayKey();
    const todayBucket = days.get(today) || emptyDay(today);
    const allPaths = {};
    const allRefs = {};
    const allRoutes = {};
    let pageviews7 = 0;
    let api7 = 0;
    let demo7 = 0;
    let paid7 = 0;
    let req402_7 = 0;
    let settled7 = 0;

    const dayList = [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 6);
    const cutoffKey = dayKey(cutoff);

    for (const d of dayList) {
      for (const [k, v] of Object.entries(d.uniquePaths)) bump(allPaths, k, v);
      for (const [k, v] of Object.entries(d.referrers)) bump(allRefs, k, v);
      for (const [k, v] of Object.entries(d.api.byRoute)) bump(allRoutes, k, v);
      if (d.day >= cutoffKey) {
        pageviews7 += d.pageviews;
        api7 += d.api.total;
        demo7 += d.api.demo;
        paid7 += d.api.paid200;
        req402_7 += d.api.paymentRequired;
        settled7 += d.api.settled;
      }
    }

    const summary = {
      ok: true,
      service: 'DaKnowledge analytics',
      startedAt,
      generatedAt: new Date().toISOString(),
      note:
        'In-process counters reset on Render cold starts. Weekly GitHub Action snapshots persist history under data/analytics/.',
      lifetime: {
        pageviews: lifetimePageviews,
        apiHits: lifetimeApi,
        settled: lifetimeSettled,
      },
      last7Days: {
        pageviews: pageviews7,
        apiHits: api7,
        demos: demo7,
        paid200: paid7,
        paymentRequired: req402_7,
        settled: settled7,
      },
      today: {
        day: today,
        pageviews: todayBucket.pageviews,
        apiHits: todayBucket.api.total,
        demos: todayBucket.api.demo,
        paid200: todayBucket.api.paid200,
        paymentRequired: todayBucket.api.paymentRequired,
        settled: todayBucket.api.settled,
      },
      topPages: topEntries(allPaths),
      topReferrers: topEntries(allRefs),
      topApiRoutes: topEntries(allRoutes),
    };

    if (detail) {
      summary.days = dayList.map((d) => ({
        day: d.day,
        pageviews: d.pageviews,
        api: { ...d.api, byRoute: topEntries(d.api.byRoute) },
        topPages: topEntries(d.uniquePaths, 10),
        topReferrers: topEntries(d.referrers, 10),
      }));
      summary.recent = recent.slice(0, MAX_RECENT);
    }

    return summary;
  }

  return {
    recordPageview,
    recordApiHit,
    snapshot,
    isFreePath(path) {
      const p = String(path || '').split('?')[0];
      return FREE_PATHS.has(p) || p.startsWith('/.well-known/');
    },
  };
}

export { FREE_PATHS, classifyUa, normalizePath, referrerHost };
