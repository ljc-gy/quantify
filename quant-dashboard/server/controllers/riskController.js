import { getCache, setCache } from '../utils/cache.js';
import { ok, fail } from '../utils/response.js';
import { mockRiskKline, mockRiskMetrics, mockAssetRisk, mockDashboardSnapshot, mockReturns, mockVolatilityCone } from '../services/mockData.js';

/**
 * GET /api/risk/assessment
 * Returns all risk dashboard data (K-line + metrics + asset breakdown + snapshot + returns).
 */
export function getRiskAssessment(_req, res) {
  try {
    const cacheKey = 'risk:assessment';
    const cached = getCache(cacheKey);
    if (cached) return ok(res, cached);

    const kline = mockRiskKline();
    const metrics = mockRiskMetrics();
    const assetRisk = mockAssetRisk();
    const snapshot = mockDashboardSnapshot();
    const returns = mockReturns();

    const data = { kline, metrics, assetRisk, snapshot, returns };
    setCache(cacheKey, data, 30000);
    ok(res, data);
  } catch (err) {
    fail(res, err.message);
  }
}


/**
 * GET /api/risk/volatility-cone
 * Returns historical volatility cone data (HV distribution across lookback windows).
 */
export function getVolatilityCone(_req, res) {
  try {
    const cacheKey = 'risk:volatility-cone';
    const cached = getCache(cacheKey);
    if (cached) return ok(res, cached);

    const data = mockVolatilityCone();
    setCache(cacheKey, data, 60000);
    ok(res, data);
  } catch (err) {
    fail(res, err.message);
  }
}