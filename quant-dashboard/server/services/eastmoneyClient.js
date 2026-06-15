const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Referer: 'https://fund.eastmoney.com/',
};

function withParams(url, params = {}) {
  const nextUrl = new URL(url);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null) {
      nextUrl.searchParams.set(key, String(value));
    }
  }
  return nextUrl.toString();
}

function rateLimitedStatus(status) {
  return status === 403 || status === 429;
}

export function createEastMoneyClient({
  fetchImpl = null,
  sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  now = () => Date.now(),
  random = () => Math.random(),
  minIntervalMs = 1100,
  jitterMs = 300,
  timeoutMs = 10000,
  maxRetries = 1,
  retryDelayMs = 250,
} = {}) {
  let lastCallAt = 0;

  async function throttle() {
    const elapsed = now() - lastCallAt;
    const wait = minIntervalMs - elapsed;
    if (wait > 0) {
      await sleep(wait + Math.floor(random() * jitterMs));
    }
    lastCallAt = now();
  }

  async function getJson(url, {
    params,
    headers,
    source = 'eastmoney',
    timeout = timeoutMs,
  } = {}) {
    const startedAt = now();
    const targetUrl = withParams(url, params);
    const attemptsAllowed = Math.max(0, Number(maxRetries) || 0) + 1;
    let attempts = 0;
    let status = 0;
    let error = null;

    for (let index = 0; index < attemptsAllowed; index += 1) {
      attempts += 1;
      await throttle();

      try {
        const requestFetch = fetchImpl || globalThis.fetch;
        const response = await requestFetch(targetUrl, {
          headers: { ...DEFAULT_HEADERS, ...(headers || {}) },
          signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout
            ? AbortSignal.timeout(timeout)
            : undefined,
        });
        status = response.status || 0;

        if (!response.ok) {
          const body = response.text ? await response.text() : '';
          error = `HTTP ${status}${body ? `: ${body.slice(0, 120)}` : ''}`;
        } else {
          const data = await response.json();
          return {
            ok: true,
            data,
            meta: {
              ok: true,
              status,
              source,
              requestedAt: new Date(startedAt).toISOString(),
              durationMs: Math.max(0, now() - startedAt),
              attempts,
              rateLimited: false,
              error: null,
            },
          };
        }
      } catch (err) {
        status = 0;
        error = err?.message || 'East Money request failed';
      }

      if (index < attemptsAllowed - 1) {
        await sleep(retryDelayMs * (index + 1));
      }
    }

    return {
      ok: false,
      data: null,
      meta: {
        ok: false,
        status,
        source,
        requestedAt: new Date(startedAt).toISOString(),
        durationMs: Math.max(0, now() - startedAt),
        attempts,
        rateLimited: rateLimitedStatus(status),
        error,
      },
    };
  }

  return { getJson };
}

export const eastMoneyClient = createEastMoneyClient();
