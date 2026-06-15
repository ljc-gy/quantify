import { prepare } from "../utils/initDb.js";

const TRANSACTION_FIELDS = new Set(['type', 'trade_date', 'shares', 'nav', 'amount', 'fee', 'note']);

function normalizeTransactionFields(fields) {
  const normalized = {};
  if (fields.type !== undefined) normalized.type = fields.type;
  if (fields.tradeDate !== undefined) normalized.trade_date = fields.tradeDate;
  if (fields.trade_date !== undefined) normalized.trade_date = fields.trade_date;
  if (fields.shares !== undefined) normalized.shares = Number(fields.shares) || 0;
  if (fields.nav !== undefined) normalized.nav = Number(fields.nav) || 0;
  if (fields.amount !== undefined) normalized.amount = Number(fields.amount) || 0;
  if (fields.fee !== undefined) normalized.fee = Number(fields.fee) || 0;
  if (fields.note !== undefined) normalized.note = fields.note || '';
  return normalized;
}
/* ================================================================
   NAV Snapshots
   ================================================================ */
export function getSnapshots(userId = 1, fundId = null) {
  if (fundId) {
    return prepare(
      'SELECT * FROM fund_nav_snapshots WHERE user_id = ? AND fund_id = ? ORDER BY recorded_at ASC'
    ).all(userId, fundId);
  }
  return prepare(
    'SELECT s.*, f.name as fund_name, f.code as fund_code, f.type as fund_type FROM fund_nav_snapshots s JOIN funds f ON f.id = s.fund_id WHERE s.user_id = ? ORDER BY s.recorded_at ASC'
  ).all(userId);
}

export function addSnapshot({ userId, fundId, nav, amount, pl, rate, recordedAt }) {
  const date = recordedAt || new Date().toISOString().slice(0, 10);
  const result = prepare(
    `INSERT INTO fund_nav_snapshots (fund_id, user_id, nav, amount, pl, rate, recorded_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(fundId, userId, nav, amount, pl, rate, date);
  // Also update the fund record with latest NAV
  // Update fund with latest NAV but preserve cum_nav as cost basis
  prepare(
    `UPDATE funds SET nav=?, amount=?, pl=?, rate=?, updated=datetime('now','localtime') WHERE id=?`
  ).run(nav, amount, pl, rate, fundId);
  return result.lastInsertRowid;
}

export function getLatestSnapshot(fundId) {
  return prepare(
    'SELECT * FROM fund_nav_snapshots WHERE fund_id = ? ORDER BY recorded_at DESC LIMIT 1'
  ).get(fundId);
}

/* ================================================================
   Funds
   ================================================================ */
export function getFunds(userId = 1) {
  return prepare(
    'SELECT * FROM funds WHERE user_id = ? ORDER BY amount DESC'
  ).all(userId);
}

export function getFundById(id) {
  return prepare('SELECT * FROM funds WHERE id = ?').get(id);
}

export function addFund({ userId, code, name, type, shares, nav, cumNav, amount, pl, rate }) {
  const result = prepare(
    `INSERT INTO funds (user_id, code, name, type, shares, nav, cum_nav, amount, pl, rate)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(userId, code, name, type, shares, nav, cumNav, amount, pl, rate);
  return result.lastInsertRowid;
}

export function updateFund(id, fields) {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  vals.push(id);
  prepare(`UPDATE funds SET ${sets.join(', ')}, updated=datetime('now','localtime') WHERE id=?`).run(...vals);
}

export function deleteFund(id) {
  prepare('DELETE FROM funds WHERE id = ?').run(id);
}

/* ================================================================
   Auto-invest plans
   ================================================================ */
export function getPlans(userId = 1) {
  return prepare(
    `SELECT p.*, f.name as fund_name, f.code as fund_code
     FROM auto_invest_plans p
     JOIN funds f ON f.id = p.fund_id
     WHERE p.user_id = ?
     ORDER BY p.created DESC`
  ).all(userId);
}

export function addPlan({ userId, fundId, amount, frequency, nextDate, status = 'active' }) {
  const result = prepare(
    `INSERT INTO auto_invest_plans (user_id, fund_id, amount, frequency, next_date, status)
     VALUES (?,?,?,?,?,?)`
  ).run(userId, fundId, amount, frequency, nextDate, status);
  return result.lastInsertRowid;
}

export function updatePlan(id, fields) {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  vals.push(id);
  prepare(`UPDATE auto_invest_plans SET ${sets.join(', ')}, updated=datetime('now','localtime') WHERE id=?`).run(...vals);
}

export function deletePlan(id) {
  prepare('DELETE FROM auto_invest_plans WHERE id = ?').run(id);
}

/* ================================================================
   Fund transactions
   ================================================================ */
export function getTransactions(userId = 1, fundId = null) {
  if (fundId) {
    return prepare(
      'SELECT * FROM fund_transactions WHERE user_id = ? AND fund_id = ? ORDER BY trade_date ASC, id ASC'
    ).all(userId, fundId);
  }
  return prepare(
    `SELECT t.*, f.name as fund_name, f.code as fund_code
     FROM fund_transactions t
     JOIN funds f ON f.id = t.fund_id
     WHERE t.user_id = ?
     ORDER BY t.trade_date ASC, t.id ASC`
  ).all(userId);
}

export function addTransaction({ userId = 1, fundId, type, tradeDate, shares = 0, nav = 0, amount = 0, fee = 0, note = '' }) {
  const result = prepare(
    `INSERT INTO fund_transactions (user_id, fund_id, type, trade_date, shares, nav, amount, fee, note)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(userId, fundId, type, tradeDate, Number(shares) || 0, Number(nav) || 0, Number(amount) || 0, Number(fee) || 0, note || '');
  return result.lastInsertRowid;
}

export function updateTransaction(id, fields) {
  const normalized = normalizeTransactionFields(fields);
  const sets = [];
  const vals = [];
  for (const [key, value] of Object.entries(normalized)) {
    if (!TRANSACTION_FIELDS.has(key)) continue;
    sets.push(`${key} = ?`);
    vals.push(value);
  }
  if (sets.length === 0) return;
  vals.push(id);
  prepare(`UPDATE fund_transactions SET ${sets.join(', ')}, updated=datetime('now','localtime') WHERE id=?`).run(...vals);
}

export function deleteTransaction(id) {
  prepare('DELETE FROM fund_transactions WHERE id = ?').run(id);
}

/* ================================================================
   Fund NAV cache
   ================================================================ */
export function upsertNavCache({ fundCode, navDate, nav, dailyReturnPct = 0, source = 'eastmoney-lsjz', quality = 'fresh' }) {
  prepare(
    `INSERT INTO fund_nav_cache (fund_code, nav_date, nav, daily_return_pct, source, quality, fetched_at)
     VALUES (?,?,?,?,?,?,datetime('now','localtime'))
     ON CONFLICT(fund_code, nav_date) DO UPDATE SET
       nav=excluded.nav,
       daily_return_pct=excluded.daily_return_pct,
       source=excluded.source,
       quality=excluded.quality,
       fetched_at=datetime('now','localtime')`
  ).run(fundCode, navDate, Number(nav) || 0, Number(dailyReturnPct) || 0, source, quality);
}

export function getLatestNavCache(fundCode) {
  return prepare(
    'SELECT * FROM fund_nav_cache WHERE fund_code = ? ORDER BY nav_date DESC LIMIT 1'
  ).get(fundCode);
}

export function getNavCacheHistory(fundCode, limit = 120) {
  return prepare(
    `SELECT * FROM (
       SELECT * FROM fund_nav_cache WHERE fund_code = ? ORDER BY nav_date DESC LIMIT ?
     ) ORDER BY nav_date ASC`
  ).all(fundCode, Number(limit) || 120);
}
