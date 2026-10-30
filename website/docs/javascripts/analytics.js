/**
 * DaKnowledge first-party pageview beacon.
 * Posts path + referrer host to the x402 API /v1/collect (no cookies, no PII).
 * Uses text/plain so sendBeacon stays a simple request (no CORS preflight).
 */
(function () {
  var ENDPOINT = 'https://daknowledge-x402.onrender.com/v1/collect';
  try {
    var path = location.pathname + (location.search || '');
    var payload = JSON.stringify({
      path: path,
      referrer: document.referrer || '',
      lang: (navigator.language || '').slice(0, 16),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'text/plain' }));
      return;
    }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
      keepalive: true,
      mode: 'cors',
    }).catch(function () {});
  } catch (_) {}
})();
