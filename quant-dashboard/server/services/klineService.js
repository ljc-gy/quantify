/**
 * K-line data service — fetches historical OHLCV data from Tencent API.
 * Supports daily, weekly, and monthly A-share K-line data.
 */

const PERIOD_FIELDS = {
  day: 'qfqday',
  week: 'qfqweek',
  month: 'qfqmonth',
};

/**
 * Fetch K-line data for a stock code.
 * @param {string} code - 6-digit stock code
 * @param {'day'|'week'|'month'|number} period - K-line period or legacy limit
 * @param {number} limit - number of bars to fetch (default 120)
 * @returns {Array<{date,open,close,high,low,volume}>}
 */
export async function fetchKline(code, period = 'day', limit = 120) {
  if (typeof period === 'number') {
    limit = period;
    period = 'day';
  }

  const normalizedPeriod = PERIOD_FIELDS[period] ? period : 'day';
  const preferredField = PERIOD_FIELDS[normalizedPeriod];
  const market = code.startsWith('6') ? 'sh' : 'sz';
  const fullCode = `${market}${code}`;
  const url = `http://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${fullCode},${normalizedPeriod},,,${limit},qfq`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 0 || !json.data) throw new Error('No data');

    const rawData = json.data[fullCode]?.[preferredField] || json.data[fullCode]?.[normalizedPeriod] || [];
    if (!rawData.length) throw new Error('Empty kline data');

    return rawData.map(row => ({
      date: row[0],
      open: parseFloat(row[1]),
      close: parseFloat(row[2]),
      high: parseFloat(row[3]),
      low: parseFloat(row[4]),
      volume: parseFloat(row[5]) || 0,
    }));
  } catch (err) {
    console.error(`[kline] Failed to fetch ${code}: ${err.message}`);
    throw err;
  }
}

/**
 * Fetch K-line for multiple codes in batch.
 */
export async function fetchKlines(codes, period = 'day', limit = 120) {
  if (typeof period === 'number') {
    limit = period;
    period = 'day';
  }

  const results = {};
  const promises = codes.map(async (code) => {
    try {
      results[code] = await fetchKline(code, period, limit);
    } catch (e) {
      results[code] = { error: e.message };
    }
  });
  await Promise.allSettled(promises);
  return results;
}
