import { ok, fail } from '../utils/response.js';
import { invalidateCache } from '../utils/cache.js';
import * as models from '../models/index.js';

/**
 * GET /api/alert/list
 * Returns all alerts for a user.
 */
export function getAlerts(req, res) {
  try {
    const userId = req.query.userId || 1;
    const rows = models.getAlerts(userId);
    ok(res, { alerts: rows });
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * POST /api/alert/set
 * Create or update a price alert.
 * Body: { stockCode, stockName?, alertType, threshold, direction? }
 */
export function setAlert(req, res) {
  try {
    const userId = req.body.userId || 1;
    const { stockCode, stockName, alertType, threshold, direction } = req.body;

    if (!stockCode || !alertType || threshold == null) {
      return fail(res, 'stockCode, alertType, and threshold are required', 400);
    }

    const result = models.createAlert({
      userId,
      stockCode,
      stockName: stockName || '',
      alertType,
      threshold: Number(threshold),
      direction: direction || 'above',
    });

    invalidateCache('alert');
    ok(res, { id: result.lastInsertRowid }, { message: 'Alert created' });
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * DELETE /api/alert/:id
 * Remove an alert.
 */
export function deleteAlert(req, res) {
  try {
    const { id } = req.params;
    models.deleteAlert(id);
    invalidateCache('alert');
    ok(res, null, { message: 'Alert deleted' });
  } catch (err) {
    fail(res, err.message);
  }
}

/**
 * PATCH /api/alert/:id
 * Update alert fields (enabled, threshold, etc.)
 */
export function updateAlert(req, res) {
  try {
    const { id } = req.params;
    models.updateAlert(id, req.body);
    invalidateCache('alert');
    ok(res, null, { message: 'Alert updated' });
  } catch (err) {
    fail(res, err.message);
  }
}


/**
 * POST /api/alert/auto-sl-tp
 * Auto-generate stop-loss (-8%) and take-profit (+15%) alerts for all holdings.
 * Removes old auto-generated alerts first, then creates new ones.
 */
export function autoSLTP(req, res) {
  try {
    const userId = req.body.userId || 1;
    const slPct = req.body.slPct || -8;
    const tpPct = req.body.tpPct || 15;
    
    const holdings = models.getHoldings(userId);
    if (!holdings.length) return ok(res, { created: 0, message: 'No holdings' });
    
    // Remove old auto-generated alerts (those with alert_type = 'stop_loss' or 'take_profit')
    const oldAlerts = models.getAlerts(userId);
    for (const a of oldAlerts) {
      if (a.alert_type === 'stop_loss' || a.alert_type === 'take_profit') {
        models.deleteAlert(a.id);
      }
    }
    
    let created = 0;
    for (const h of holdings) {
      const curPrice = h.cur_price || h.cost_price;
      const costPrice = h.cost_price;
      
      // Stop-loss: costPrice * (1 + slPct/100), e.g. cost * 0.92
      const slPrice = +(costPrice * (1 + slPct / 100)).toFixed(2);
      models.createAlert({
        userId,
        stockCode: h.stock_code,
        stockName: h.stock_name,
        alertType: 'stop_loss',
        threshold: slPrice,
        direction: 'below',
      });
      
      // Take-profit: costPrice * (1 + tpPct/100), e.g. cost * 1.15
      const tpPrice = +(costPrice * (1 + tpPct / 100)).toFixed(2);
      models.createAlert({
        userId,
        stockCode: h.stock_code,
        stockName: h.stock_name,
        alertType: 'take_profit',
        threshold: tpPrice,
        direction: 'above',
      });
      
      created += 2;
    }
    
    invalidateCache('alerts');
    ok(res, { created, message: `Generated ${created} alerts (SL=${Math.abs(slPct)}%, TP=${tpPct}%)` });
  } catch (err) {
    fail(res, err.message);
  }
}
