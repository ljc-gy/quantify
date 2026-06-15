// Market data service — Workers-compatible version
// Removed DB dependency; data source config is passed as parameter

export function normalizeStockCode(code: string): string {
  const raw = String(code || '').trim().toUpperCase();
  const match = raw.match(/\d{6}/);
  return match ? match[0] : raw;
}

function mockQuote(code: string) {
  const normalizedCode = normalizeStockCode(code);
  const basePrices: Record<string, number> = {
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
    change_pct: +((Math.random() - 0.5) * 2).toFixed(2),
    volume: Math.floor(Math.random() * 1e8),
    high: +(price * 1.005).toFixed(2),
    low: +(price * 0.995).toFixed(2),
    open: +(price * 0.998).toFixed(2),
    prevClose: +(price * 0.997).toFixed(2),
  };
}

async function fetchEastMoneyQuote(code: string) {
  const prefix = code.startsWith('6') ? '1' : '0';
  const secid = `${prefix}.${code}`;
  const fields = 'f43,f44,f45,f46,f47,f48,f50,f51,f52,f57,f58,f60,f116,f117,f169,f170';
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${fields}`;

  const response = await fetch(url, {
    headers: { Referer: 'https://quote.eastmoney.com', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10000),
  });
  const json: any = await response.json();
  const d = json?.data;
  if (!d) throw new Error('No data from East Money');

  return {
    code, name: d.f58 || d.f12 || code,
    price: d.f43 / 100 || 0,
    changePct: d.f170 / 100 || 0,
    change_pct: d.f170 / 100 || 0,
    volume: d.f47 || 0,
    high: d.f44 / 100 || 0,
    low: d.f45 / 100 || 0,
    open: d.f46 / 100 || 0,
    prevClose: d.f60 / 100 || 0,
  };
}

export async function fetchQuote(code: string, source: string = 'mock') {
  const normalizedCode = normalizeStockCode(code);
  if (source === 'eastmoney') {
    try { return await fetchEastMoneyQuote(normalizedCode); }
    catch (err: any) { console.warn(`East Money failed: ${err.message}`); }
  }
  return mockQuote(normalizedCode);
}

export async function fetchQuotes(codes: string[], source: string = 'mock') {
  const normalizedCodes = codes.map(normalizeStockCode);
  const results = await Promise.allSettled(
    normalizedCodes.map(c => fetchQuote(c, source))
  );
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { code: normalizedCodes[i], name: normalizedCodes[i], price: 0, changePct: 0, change_pct: 0, error: 'Failed' };
  });
}
