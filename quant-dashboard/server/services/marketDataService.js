/**
 * Market data service -- supports multiple data sources:
 *   - mock:    simulated random-walk data (default)
 *   - tushare: Tushare Pro API (https://tushare.pro)
 *   - eastmoney: East Money public API (no auth required)
 *
 * Set data source via: PUT /api/config/data_source  { value: "tushare" }
 * Set API keys via:    PUT /api/config/tushare_token { value: "your_token" }
 */

import * as models from '../models/index.js';

// Cache the current config with 30s TTL
let cachedSource = null;
let cachedToken = null;
let cacheTime = 0;

function readDataSourceConfig() {
  const source = models.getConfig('data_source');
  const token = models.getConfig('tushare_token');
  return { source: source || 'mock', token: token || '' };
}

function getDataSource() {
  const now = Date.now();
  if (now - cacheTime > 30000) {
    const cfg = readDataSourceConfig();
    cachedSource = cfg.source;
    cachedToken = cfg.token;
    cacheTime = now;
    console.log('[market] Data source resolved:', cachedSource);
  }
  return { source: cachedSource, token: cachedToken };
}

export function normalizeStockCode(code) {
  const raw = String(code || '').trim().toUpperCase();
  const match = raw.match(/\d{6}/);
  return match ? match[0] : raw;
}

/** Generate a mock quote for the given code. */
function mockQuote(code) {
  const normalizedCode = normalizeStockCode(code);
  const basePrices = {
    '000001': 3350, '399001': 10820, '300750': 215, '002594': 282,
    '688981': 62, '300059': 23, '600519': 1750, '000858': 154,
    '601012': 22, '600276': 44, '002415': 31, '600036': 35,
    '300124': 62, '601318': 42, '601991': 7.35, '002272': 18.32, '002837': 63.38,
  };
  const base = basePrices[normalizedCode] || 50;
  const price = +(base * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2);
  return {
    code: normalizedCode, name: normalizedCode, price,
    changePct: +((Math.random() - 0.5) * 2).toFixed(2),
    volume: Math.floor(Math.random() * 1e8),
    high: +(price * 1.005).toFixed(2),
    low: +(price * 0.995).toFixed(2),
    open: +(price * 0.998).toFixed(2),
    prevClose: +(price * 0.997).toFixed(2),
  };
}

/** Fetch real-time quote for a single stock. */
export async function fetchQuote(code) {
  const normalizedCode = normalizeStockCode(code);
  const { source, token } = getDataSource();

  if (source === 'mock') {
    return mockQuote(normalizedCode);
  }

  if (source === 'eastmoney') {
    try {
      return await fetchEastMoneyQuote(normalizedCode);
    } catch (err) {
      console.warn(`[market] East Money failed for ${normalizedCode}, using fallback quote: ${err.message}`);
      return { ...mockQuote(normalizedCode), source: 'fallback' };
    }
  }

  if (source === 'tushare') {
    try {
      return await fetchTushareQuote(normalizedCode, token);
    } catch (err) {
      console.warn(`[market] Tushare failed for ${normalizedCode}, using fallback quote: ${err.message}`);
      return { ...mockQuote(normalizedCode), source: 'fallback' };
    }
  }

  console.warn(`[market] Unknown data source "${source}", falling back to mock`);
  return mockQuote(normalizedCode);
}

/** Fetch quotes for multiple codes in batch. */
export async function fetchQuotes(codes) {
  const normalizedCodes = codes.map(normalizeStockCode);
  const results = await Promise.allSettled(normalizedCodes.map(c => fetchQuote(c)));
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { code: normalizedCodes[i], name: normalizedCodes[i], price: 0, changePct: 0, error: r.reason?.message || 'Failed' };
  });
}

// --- East Money public API ---

async function fetchEastMoneyQuote(code) {
  // Determine market prefix: SH -> 1.xxxxxx, SZ -> 0.xxxxxx
  const prefix = code.startsWith('6') ? '1' : '0';
  const secid = `${prefix}.${code}`;
  const fields = 'f43,f44,f45,f46,f47,f48,f50,f51,f52,f57,f58,f60,f116,f117,f169,f170';
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${fields}`;

  try {
    const response = await fetch(url, {
      headers: { Referer: 'https://quote.eastmoney.com', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    const json = await response.json();
    const d = json?.data;
    if (!d) throw new Error('No data from East Money');

    return {
      code,
      name: d.f58 || d.f12 || code,
      price: d.f43 / 100 || 0,
      changePct: d.f170 / 100 || 0,
      volume: d.f47 || 0,
      high: d.f44 / 100 || 0,
      low: d.f45 / 100 || 0,
      open: d.f46 / 100 || 0,
      prevClose: d.f60 / 100 || 0,
    };
  } catch (err) {
    console.error(`[eastmoney] Failed to fetch ${code}: ${err.message}`);
    throw err;
  }
}

// --- Tushare Pro API ---

async function fetchTushareQuote(code, token) {
  if (!token) throw new Error('Tushare token not configured');

  const suffix = code.startsWith('6') ? 'SH' : 'SZ';
  const tsCode = `${code}.${suffix}`;
  const url = 'http://api.tushare.pro';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: 'daily',
        token,
        params: { ts_code: tsCode, limit: 2 },
      }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await response.json();
    if (json.code !== 0) throw new Error(json.msg || 'Tushare API error');

    const items = json.data?.items || [];
    if (items.length === 0) throw new Error('No data from Tushare');

    const today = items[0];
    const yesterday = items[1] || today;

    const price = today[2]; // close
    const prevClose = yesterday[2];
    const changePct = prevClose ? +(((price - prevClose) / prevClose) * 100).toFixed(2) : 0;

    return {
      code, name: code, price, changePct,
      volume: today[9] || 0,
      high: today[3] || price,
      low: today[4] || price,
      open: today[1] || price,
      prevClose,
    };
  } catch (err) {
    console.error(`[tushare] Failed to fetch ${code}: ${err.message}`);
    throw err;
  }
}
