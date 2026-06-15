import { Router } from 'express';

const router = Router();

// New controllers
import { getMarketRealtime, getMarketHistory } from '../controllers/marketController.js';
import { fetchQuote, fetchQuotes } from '../services/marketDataService.js';
import { fetchKline } from '../services/klineService.js';

// GET /api/market/realtime -- intraday price data
router.get('/realtime', getMarketRealtime);

// GET /api/market/history -- 24h volume history
router.get('/history', getMarketHistory);


// GET /api/market/quote/:code
router.get('/quote/:code', async (req, res) => {
  try {
    const quote = await fetchQuote(req.params.code);
    res.json({ code: 0, data: quote });
  } catch (err) {
    res.status(500).json({ code: -1, error: err.message });
  }
});

// POST /api/market/quotes
router.post('/quotes', async (req, res) => {
  try {
    const { codes } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ code: -1, error: 'codes array required' });
    }
    const quotes = await fetchQuotes(codes);
    res.json({ code: 0, data: quotes });
  } catch (err) {
    res.status(500).json({ code: -1, error: err.message });
  }
});

// GET /api/market/index -- simulated market indices
router.get('/index', (_req, res) => {
  const indices = [
    { code: '000001', name: '上证指数', price: 3350.62, changePct: 0.42 },
    { code: '399001', name: '深证成指', price: 10820.45, changePct: -0.18 },
    { code: '399006', name: '创业板指', price: 2185.37, changePct: 0.67 },
    { code: '000688', name: '科创50',  price: 962.11,  changePct: 1.23 },
  ];
  res.json({ data: indices, ts: Date.now() });
});

// GET /api/market/sectors -- simulated sector data
router.get('/sectors', (_req, res) => {
  const sectors = [
    { name: '半导体',   changePct: 3.21 },
    { name: '人工智能', changePct: 2.87 },
    { name: '新能源',   changePct: -0.54 },
    { name: '医药',     changePct: -0.83 },
    { name: '消费电子', changePct: 1.42 },
    { name: '券商',     changePct: 0.76 },
    { name: '军工',     changePct: 1.18 },
    { name: '银行',     changePct: 0.33 },
  ];
  res.json({ data: sectors, ts: Date.now() });
});

export default router;


// GET /api/market/kline/:code — candlestick history from Tencent API
router.get('/kline/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const limit = parseInt(req.query.limit) || 120;
    const period = ['day', 'week', 'month'].includes(req.query.period) ? req.query.period : 'day';

    const klines = await fetchKline(code, period, Math.min(limit, 365));
    
    res.json({ code: 0, data: { name: code, period, klines } });
  } catch (err) {
    res.status(500).json({ code: -1, error: err.message });
  }
});
