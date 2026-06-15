import { ok, fail } from '../utils/response.js';
import * as models from '../models/index.js';

/**
 * GET /api/journal
 */
export function getJournal(req, res) {
  try {
    const userId = req.query.userId || 1;
    const limit = parseInt(req.query.limit) || 100;
    const rows = models.getJournal(userId, limit);
    ok(res, { entries: rows, count: rows.length });
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * POST /api/journal
 */
export function addJournal(req, res) {
  try {
    const userId = req.body.userId || 1;
    const { stockCode, stockName, direction, price, quantity, tradeDate, reason, review } = req.body;
    if (!stockCode || !direction || !price || !quantity) {
      return fail(res, 'stockCode, direction, price, quantity required', 400);
    }
    const result = models.addJournal({
      userId, stockCode, stockName: stockName || stockCode,
      direction, price, quantity, tradeDate: tradeDate || new Date().toISOString().slice(0, 10),
      reason, review,
    });
    ok(res, { id: result.lastInsertRowid, saved: true });
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * PUT /api/journal/:id
 */
export function updateJournal(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return fail(res, 'Invalid id');
    const fields = {};
    const allowed = ['stock_code', 'stock_name', 'direction', 'price', 'quantity', 'trade_date', 'reason', 'review'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }
    models.updateJournal(id, fields);
    ok(res, { updated: true, id });
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * DELETE /api/journal/:id
 */
export function deleteJournal(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return fail(res, 'Invalid id');
    models.deleteJournal(id);
    ok(res, { deleted: true, id });
  } catch (err) {
    fail(res, err.message);
  }
}
