import { getCache, setCache, invalidateCache } from '../utils/cache.js';
import { ok, fail } from '../utils/response.js';
import * as models from '../models/index.js';
import { fetchQuote, normalizeStockCode } from '../services/marketDataService.js';

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function isPlaceholderPrice(price, costPrice) {
  return price <= 0 || (costPrice > 0 && Math.abs(price - costPrice) < 0.001);
}

/**
 * GET /api/portfolio/holdings
 * Returns current holdings from DB.
 */
export function getHoldings(req, res) {
  try {
    const userId = req.query.userId || 1;
    const cacheKey = `portfolio:holdings:${userId}`;
    const cached = getCache(cacheKey);
    if (cached) return ok(res, cached);

    let rows = models.getHoldings(userId);

    const totalValue = rows.reduce((sum, r) => sum + r.market_val, 0);
    const totalPL = rows.reduce((sum, r) => sum + r.profit_loss, 0);

    const data = { holdings: rows, totalValue, totalPL, count: rows.length };
    setCache(cacheKey, data, 30000);
    ok(res, data);
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * POST /api/portfolio/holdings   -- add new holding
 * PUT  /api/portfolio/holdings/:id -- update holding
 *
 * When curPrice looks like a placeholder, refresh it once from market data.
 * Computed fields are then derived from quantity x current price.
 */
export async function saveHolding(req, res) {
  try {
    const userId = req.body.userId || 1;
    const { stockCode, stockName, quantity, costPrice } = req.body;
    if (!stockCode || !quantity) return fail(res, 'stockCode and quantity required', 400);
    const normalizedStockCode = normalizeStockCode(stockCode);

    const qty = toNumber(quantity);
    const cst = toNumber(costPrice);

    // Look up existing holding to preserve cur_price when not provided
    const existing = models.getHoldingByCode(userId, normalizedStockCode);

    // curPrice: explicitly provided > existing DB value > costPrice
    let cur = req.body.curPrice !== undefined
      ? toNumber(req.body.curPrice)
      : toNumber(existing?.cur_price, cst);
    let resolvedStockName = stockName || existing?.stock_name || normalizedStockCode;
    let refreshedQuote = false;

    if (isPlaceholderPrice(cur, cst)) {
      try {
        const quote = await fetchQuote(normalizedStockCode);
        if (quote?.price > 0) {
          cur = quote.price;
          resolvedStockName = stockName || quote.name || resolvedStockName;
          refreshedQuote = true;
        }
      } catch (err) {
        console.warn(`[portfolio] Failed to refresh quote for ${normalizedStockCode}: ${err.message}`);
      }
    }

    // marketVal: explicitly provided > computed from qty x cur
    const mval = !refreshedQuote && req.body.marketVal !== undefined
      ? toNumber(req.body.marketVal)
      : qty * cur;

    // profitLoss: explicitly provided > computed from mval - qty x cst
    const pl = !refreshedQuote && req.body.profitLoss !== undefined
      ? toNumber(req.body.profitLoss)
      : mval - qty * cst;

    // pctChange: explicitly provided > computed as percentage
    const pct = !refreshedQuote && req.body.pctChange !== undefined
      ? toNumber(req.body.pctChange)
      : (cst > 0 ? ((cur - cst) / cst) * 100 : 0);

    models.upsertHolding({
      userId,
      stockCode: normalizedStockCode,
      stockName: resolvedStockName,
      quantity: qty,
      costPrice: cst,
      curPrice: cur,
      marketVal: mval,
      profitLoss: pl,
      pctChange: pct,
    });

    invalidateCache('portfolio:holdings');
    ok(res, { saved: true });
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * DELETE /api/portfolio/holdings/:id
 */
export function deleteHolding(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return fail(res, 'Invalid holding id');
    const userId = req.query.userId || 1;
    models.deleteHolding(id, userId);
    invalidateCache('portfolio:holdings');
    ok(res, { deleted: true, id });
  } catch (err) {
    fail(res, err.message);
  }
}
