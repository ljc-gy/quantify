/**
 * East Money real-time stock quote service.
 * API: push2.eastmoney.com/api/qt/stock/get
 *
 * @param {string} code - 6-digit stock code (e.g. "000001", "600519")
 * @returns {{ price: number, name: string, changePct: number, high: number, low: number, open: number, prevClose: number } | null}
 */
export async function fetchStockQuote(code) {
  // Determine market: 0=SH, 1=SZ
  const prefix = code.startsWith('6') ? '1' : '0';
  const secid = `${prefix}.${code}`;
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f169,f170,f46,f44,f51,f168,f47,f164,f116,f60,f45,f52,f50,f48,f167,f117,f162`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Referer: 'https://quote.eastmoney.com', 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data;
    if (!d) return null;
    return {
      price: d.f43 / 100 || 0,
      name: d.f58 || code,
      changePct: d.f170 / 100 || 0,
      high: d.f44 / 100 || 0,
      low: d.f45 / 100 || 0,
      open: d.f46 / 100 || 0,
      prevClose: d.f48 / 100 || 0,
      volume: d.f47 || 0,
    };
  } catch (e) {
    console.error(`[stockService] fetch failed for ${code}:`, e.message);
    return null;
  }
}

/**
 * Batch fetch quotes for multiple stock codes.
 */
export async function fetchStockQuotes(codes) {
  const results = [];
  const promises = codes.map(async (code) => {
    const data = await fetchStockQuote(code);
    if (data) results.push({ code, ...data });
  });
  await Promise.allSettled(promises);
  return results;
}
