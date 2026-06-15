import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { readFileSync, unlinkSync } from 'fs';
import { ok, fail } from '../utils/response.js';
import * as models from '../models/index.js';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// POST /api/import/csv — import holdings from CSV
// CSV columns: stock_code, stock_name, quantity, cost_price
router.post('/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return fail(res, 'No file uploaded', 400);
    const userId = parseInt(req.body.userId || '1', 10);

    const raw = readFileSync(req.file.path, 'utf-8');
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let imported = 0;
    let errors = [];

    for (const row of records) {
      const code = row.stock_code || row.code || row['代码'];
      const name = row.stock_name || row.name || row['名称'];
      const qty = parseInt(row.quantity || row['数量'] || '0', 10);
      const cost = parseFloat(row.cost_price || row['成本价'] || '0');

      if (!code || !name || qty <= 0) {
        errors.push(`Skipped row: missing code/name/quantity — ${JSON.stringify(row)}`);
        continue;
      }

      const curPrice = cost; // Default current price = cost (will update via market data)
      const marketVal = qty * curPrice;

      models.upsertHolding({
        userId,
        stockCode: code,
        stockName: name,
        quantity: qty,
        costPrice: cost,
        curPrice,
        marketVal,
        profitLoss: 0,
        pctChange: 0,
      });
      imported++;
    }

    // Clean up uploaded file
    try { unlinkSync(req.file.path); } catch (_) { /* ignore */ }

    ok(res, { imported, errors: errors.length > 0 ? errors : undefined, total: records.length });
  } catch (err) {
    try { unlinkSync(req.file?.path); } catch (_) { /* ignore */ }
    fail(res, err.message);
  }
});

// POST /api/import/json — import holdings from JSON body
router.post('/json', (req, res) => {
  try {
    const userId = parseInt(req.body.userId || '1', 10);
    const holdings = req.body.holdings || req.body.data || [];

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return fail(res, 'No holdings data provided', 400);
    }

    let imported = 0;
    for (const h of holdings) {
      if (!h.stock_code && !h.code) continue;
      const code = h.stock_code || h.code;
      const name = h.stock_name || h.name || code;
      const qty = parseInt(h.quantity || '0', 10);
      const cost = parseFloat(h.cost_price || h.costPrice || '0');

      if (qty <= 0) continue;

      const curPrice = cost;
      const marketVal = qty * curPrice;

      models.upsertHolding({
        userId,
        stockCode: code,
        stockName: name,
        quantity: qty,
        costPrice: cost,
        curPrice,
        marketVal,
        profitLoss: 0,
        pctChange: 0,
      });
      imported++;
    }

    ok(res, { imported, total: holdings.length });
  } catch (err) {
    fail(res, err.message);
  }
});

export default router;
