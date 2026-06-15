import { getCache, setCache } from '../utils/cache.js';
import { ok, fail } from '../utils/response.js';
import { mockRealtime, mockVolumeHistory } from '../services/mockData.js';

/**
 * GET /api/market/realtime
 * Returns intraday price data + snapshot for the realtime cards.
 */
export function getMarketRealtime(_req, res) {
  try {
    const cacheKey = 'market:realtime';
    const cached = getCache(cacheKey);
    if (cached) return ok(res, cached);

    // TODO: East Money API — /api/qt/stock/trends2/get
    // const resp = await fetch('http://push2.eastmoney.com/api/qt/stock/get?...');
    // Transform into { times, prices, volume, high, low, open, prevClose, change }

    const data = mockRealtime();
    setCache(cacheKey, data, 10000);
    ok(res, data);
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * GET /api/market/history
 * Returns 24h volume history for bar chart.
 */
export function getMarketHistory(_req, res) {
  try {
    const cacheKey = 'market:history';
    const cached = getCache(cacheKey);
    if (cached) return ok(res, cached);

    // TODO: Tushare stk_factor(ts_code, start_date, end_date)
    // Transform daily volume into hourly buckets

    const data = mockVolumeHistory();
    setCache(cacheKey, data, 60000);
    ok(res, data);
  } catch (err) {
    fail(res, err.message);
  }
}
