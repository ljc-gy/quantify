import { Router } from 'express';
import { analyzeStocks } from '../services/strategyEngine.js';
import { ok, fail } from '../utils/response.js';

const router = Router();

/**
 * POST /api/strategy/analyze
 * Body: { codes: string[] }
 * Returns indicator values + buy/sell signals for each stock
 */
router.post('/analyze', async (req, res) => {
  try {
    const { codes } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
      return fail(res, 'codes array required', 400);
    }
    const results = await analyzeStocks(codes);
    ok(res, { results });
  } catch (err) {
    fail(res, err.message);
  }
});

export default router;
