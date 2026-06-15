import { Router } from 'express';
import { prepare } from '../utils/initDb.js';

const router = Router();

// GET /api/stock/watchlist
router.get('/watchlist', (_req, res) => {
  const rows = prepare(`
    SELECT s.code, s.name, s.market, s.exchange,
           ms.price, ms.change_pct, ms.volume, ms.high, ms.low, ms.open
    FROM watchlist w
    JOIN stocks s ON s.id = w.stock_id
    LEFT JOIN market_snapshot ms ON ms.stock_id = s.id
    ORDER BY w.added DESC
  `).all();
  res.json({ data: rows, ts: Date.now() });
});

// POST /api/stock/watchlist — add stock to watchlist
router.post('/watchlist', (req, res) => {
  const { code, name, market, exchange = 'SZ' } = req.body;
  if (!code || !name || !market) {
    return res.status(400).json({ error: 'code, name, and market are required' });
  }

  prepare(`
    INSERT INTO stocks (code, name, market, exchange)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET name = excluded.name
  `).run(code, name, market, exchange);

  const stock = prepare('SELECT id FROM stocks WHERE code = ?').get(code);
  if (!stock?.id) {
    return res.status(500).json({ error: 'failed to resolve stock id' });
  }

  prepare(`
    INSERT OR IGNORE INTO watchlist (stock_id) VALUES (?)
  `).run(stock.id);

  res.json({ ok: true, stockId: stock.id });
});

export default router;
