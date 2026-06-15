import { getCache, setCache } from '../utils/cache.js';
import { ok, fail } from '../utils/response.js';
import { mockAssetOverview } from '../services/mockData.js';

/**
 * GET /api/asset/overview
 * Returns 30-day asset trend for the dashboard overview card.
 */
export function getAssetOverview(_req, res) {
  try {
    const cacheKey = 'asset:overview';
    const cached = getCache(cacheKey);
    if (cached) return ok(res, cached);

    // TODO: swap to Tushare / East Money when ready
    // const realData = await tushareClient.daily({ ts_code: '000001.SH', limit: 30 });
    // Transform realData into { dates, values } shape...

    const data = mockAssetOverview();
    setCache(cacheKey, data, 60000);
    ok(res, data);
  } catch (err) {
    fail(res, err.message);
  }
}
