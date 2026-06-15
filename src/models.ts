// All model functions — replaces models/index.js + models/fundModels.js
// Uses D1 database via the `prepare` and `run` helpers from db.ts

import { prepare, run } from './db';
import type { Env } from './db';

type DB = D1Database;

// ─── Users ────────────────────────────────────────────────────────
export function findUserById(db: DB, id: number) {
  return prepare(db, 'SELECT * FROM users WHERE id = ?').get(id);
}
export function findUserByUsername(db: DB, username: string) {
  return prepare(db, 'SELECT * FROM users WHERE username = ?').get(username);
}

// ─── Holdings ─────────────────────────────────────────────────────
export function getHoldings(db: DB, userId = 1) {
  return prepare(db, 'SELECT * FROM holdings WHERE user_id = ? ORDER BY market_val DESC').all(userId);
}
export function getHoldingByCode(db: DB, userId: number, stockCode: string) {
  return prepare(db, 'SELECT * FROM holdings WHERE user_id = ? AND stock_code = ?').get(userId, stockCode);
}
export function upsertHolding(db: DB, params: {
  userId: number; stockCode: string; stockName: string; quantity: number;
  costPrice: number; curPrice: number; marketVal: number; profitLoss: number; pctChange: number;
}) {
  const { userId, stockCode, stockName, quantity, costPrice, curPrice, marketVal, profitLoss, pctChange } = params;
  return db.prepare(
    `INSERT INTO holdings (user_id, stock_code, stock_name, quantity, cost_price, cur_price, market_val, profit_loss, pct_change)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       stock_name=excluded.stock_name, quantity=excluded.quantity, cost_price=excluded.cost_price,
       cur_price=excluded.cur_price, market_val=excluded.market_val, profit_loss=excluded.profit_loss,
       pct_change=excluded.pct_change, updated=datetime('now')`
  ).bind(userId, stockCode, stockName, quantity, costPrice, curPrice, marketVal, profitLoss, pctChange).run();
}
export async function deleteHoldingById(db: DB, id: number, userId = 1) {
  await run(db, 'DELETE FROM holdings WHERE id = ? AND user_id = ?', [id, userId]);
}

// ─── Transactions ─────────────────────────────────────────────────
export function getTransactions(db: DB, userId = 1, limit = 50) {
  return prepare(db, 'SELECT * FROM transactions WHERE user_id = ? ORDER BY created DESC LIMIT ?').all(userId, limit);
}
export function addTransaction(db: DB, params: {
  userId: number; stockCode: string; stockName: string; type: string;
  quantity: number; price: number; amount: number; fee?: number;
}) {
  const { userId, stockCode, stockName, type, quantity, price, amount, fee = 0 } = params;
  return prepare(db,
    'INSERT INTO transactions (user_id, stock_code, stock_name, type, quantity, price, amount, fee) VALUES (?,?,?,?,?,?,?,?)'
  ).run(userId, stockCode, stockName, type, quantity, price, amount, fee);
}

// ─── Alerts ───────────────────────────────────────────────────────
export function getAlerts(db: DB, userId = 1) {
  return prepare(db, 'SELECT * FROM alerts WHERE user_id = ? ORDER BY created DESC').all(userId);
}
export function createAlert(db: DB, params: {
  userId: number; stockCode: string; stockName?: string; alertType: string;
  threshold: number; direction?: string;
}) {
  const { userId, stockCode, stockName, alertType, threshold, direction = 'above' } = params;
  return prepare(db,
    'INSERT INTO alerts (user_id, stock_code, stock_name, alert_type, threshold, direction) VALUES (?,?,?,?,?,?)'
  ).run(userId, stockCode, stockName, alertType, threshold, direction);
}
export async function updateAlert(db: DB, id: number, fields: Record<string, any>) {
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(fields)) { sets.push(`${k}=?`); vals.push(v); }
  vals.push(id);
  await run(db, `UPDATE alerts SET ${sets.join(',')}, updated=datetime('now') WHERE id=?`, vals);
}
export async function deleteAlertById(db: DB, id: number) {
  await run(db, 'DELETE FROM alerts WHERE id = ?', [id]);
}

// ─── System Config ────────────────────────────────────────────────
export function getConfig(db: DB, key: string) {
  return prepare(db, 'SELECT value FROM system_config WHERE key = ?').get(key);
}
export function getConfigs(db: DB) {
  return prepare(db, 'SELECT * FROM system_config').all();
}
export async function setConfig(db: DB, key: string, value: string, description?: string) {
  const existing = await prepare(db, 'SELECT id FROM system_config WHERE key = ?').get(key);
  if (existing) {
    await run(db, "UPDATE system_config SET value=?, description=COALESCE(?,description), updated=datetime('now') WHERE key=?",
      [value, description || null, key]);
  } else {
    await run(db, "INSERT INTO system_config (key, value, description) VALUES (?,?,?)", [key, value, description || null]);
  }
}

// ─── Trade Journal ────────────────────────────────────────────────
export function getJournal(db: DB, userId = 1, limit = 100) {
  return prepare(db, 'SELECT * FROM trade_journal WHERE user_id = ? ORDER BY trade_date DESC, id DESC LIMIT ?').all(userId, limit);
}
export function addJournal(db: DB, params: {
  userId: number; stockCode: string; stockName: string; direction: string;
  price: number; quantity: number; tradeDate: string; reason?: string; review?: string;
}) {
  const { userId, stockCode, stockName, direction, price, quantity, tradeDate, reason, review } = params;
  return prepare(db,
    'INSERT INTO trade_journal (user_id, stock_code, stock_name, direction, price, quantity, trade_date, reason, review) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(userId, stockCode, stockName, direction, price, quantity, tradeDate, reason || '', review || '');
}
export async function updateJournal(db: DB, id: number, fields: Record<string, any>) {
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(fields)) { sets.push(`${k}=?`); vals.push(v); }
  vals.push(id);
  await run(db, `UPDATE trade_journal SET ${sets.join(',')}, updated=datetime('now') WHERE id=?`, vals);
}
export async function deleteJournalById(db: DB, id: number) {
  await run(db, 'DELETE FROM trade_journal WHERE id = ?', [id]);
}

// ─── Stocks / Watchlist ───────────────────────────────────────────
export function getWatchlist(db: DB) {
  return prepare(db, `SELECT s.code, s.name, s.market, s.exchange,
    ms.price, ms.change_pct, ms.volume, ms.high, ms.low, ms.open
    FROM watchlist w JOIN stocks s ON s.id = w.stock_id
    LEFT JOIN market_snapshot ms ON ms.stock_id = s.id
    ORDER BY w.added DESC`).all();
}
export async function addToWatchlist(db: DB, params: { code: string; name: string; market: string; exchange?: string }) {
  const { code, name, market, exchange = 'SZ' } = params;
  await run(db,
    'INSERT INTO stocks (code, name, market, exchange) VALUES (?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name',
    [code, name, market, exchange]);
  const stock = await prepare(db, 'SELECT id FROM stocks WHERE code = ?').get(code);
  await run(db, 'INSERT OR IGNORE INTO watchlist (stock_id) VALUES (?)', [stock?.id]);
  return stock?.id;
}

// ─── Funds ───────────────────────────────────────────────────────
export function getFunds(db: DB, userId = 1) {
  return prepare(db, 'SELECT * FROM funds WHERE user_id = ? ORDER BY amount DESC').all(userId);
}
export function getFundById(db: DB, id: number) {
  return prepare(db, 'SELECT * FROM funds WHERE id = ?').get(id);
}
export function addFund(db: DB, params: {
  userId: number; code: string; name: string; type: string;
  shares: number; nav: number; cumNav: number; amount: number; pl: number; rate: number;
}) {
  return prepare(db, 'INSERT INTO funds (user_id, code, name, type, shares, nav, cum_nav, amount, pl, rate) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(params.userId, params.code, params.name, params.type, params.shares, params.nav, params.cumNav, params.amount, params.pl, params.rate);
}
export async function updateFund(db: DB, id: number, fields: Record<string, any>) {
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(fields)) { sets.push(`${k}=?`); vals.push(v); }
  vals.push(id);
  await run(db, `UPDATE funds SET ${sets.join(',')}, updated=datetime('now') WHERE id=?`, vals);
}
export async function deleteFundById(db: DB, id: number) {
  await run(db, 'DELETE FROM funds WHERE id = ?', [id]);
}

// ─── Fund Snapshots ──────────────────────────────────────────────
export function getSnapshots(db: DB, userId = 1, fundId?: number) {
  if (fundId) {
    return prepare(db, 'SELECT * FROM fund_nav_snapshots WHERE user_id = ? AND fund_id = ? ORDER BY recorded_at ASC').all(userId, fundId);
  }
  return prepare(db, `SELECT s.*, f.name as fund_name, f.code as fund_code, f.type as fund_type
    FROM fund_nav_snapshots s JOIN funds f ON f.id = s.fund_id WHERE s.user_id = ? ORDER BY s.recorded_at ASC`).all(userId);
}
export async function addSnapshot(db: DB, params: {
  userId: number; fundId: number; nav: number; amount: number;
  pl: number; rate: number; recordedAt?: string;
}) {
  const date = params.recordedAt || new Date().toISOString().slice(0, 10);
  await prepare(db, 'INSERT INTO fund_nav_snapshots (fund_id, user_id, nav, amount, pl, rate, recorded_at) VALUES (?,?,?,?,?,?,?)')
    .run(params.fundId, params.userId, params.nav, params.amount, params.pl, params.rate, date);
  await run(db, "UPDATE funds SET nav=?, amount=?, pl=?, rate=?, updated=datetime('now') WHERE id=?",
    [params.nav, params.amount, params.pl, params.rate, params.fundId]);
}
export function getLatestSnapshot(db: DB, fundId: number) {
  return prepare(db, 'SELECT * FROM fund_nav_snapshots WHERE fund_id = ? ORDER BY recorded_at DESC LIMIT 1').get(fundId);
}

// ─── Auto-invest Plans ───────────────────────────────────────────
export function getPlans(db: DB, userId = 1) {
  return prepare(db, `SELECT p.*, f.name as fund_name, f.code as fund_code
    FROM auto_invest_plans p JOIN funds f ON f.id = p.fund_id WHERE p.user_id = ? ORDER BY p.created DESC`).all(userId);
}
export function addPlan(db: DB, params: {
  userId: number; fundId: number; amount: number; frequency: string; nextDate: string; status?: string;
}) {
  return prepare(db, 'INSERT INTO auto_invest_plans (user_id, fund_id, amount, frequency, next_date, status) VALUES (?,?,?,?,?,?)')
    .run(params.userId, params.fundId, params.amount, params.frequency, params.nextDate, params.status || 'active');
}
export async function updatePlan(db: DB, id: number, fields: Record<string, any>) {
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(fields)) { sets.push(`${k}=?`); vals.push(v); }
  vals.push(id);
  await run(db, `UPDATE auto_invest_plans SET ${sets.join(',')}, updated=datetime('now') WHERE id=?`, vals);
}
export async function deletePlanById(db: DB, id: number) {
  await run(db, 'DELETE FROM auto_invest_plans WHERE id = ?', [id]);
}

// ─── Fund Transactions ──────────────────────────────────────────
export function getFundTransactions(db: DB, userId = 1, fundId?: number) {
  if (fundId) {
    return prepare(db, 'SELECT * FROM fund_transactions WHERE user_id = ? AND fund_id = ? ORDER BY trade_date ASC, id ASC').all(userId, fundId);
  }
  return prepare(db, `SELECT t.*, f.name as fund_name, f.code as fund_code
    FROM fund_transactions t JOIN funds f ON f.id = t.fund_id WHERE t.user_id = ? ORDER BY t.trade_date ASC, t.id ASC`).all(userId);
}
export function addFundTransaction(db: DB, params: {
  userId?: number; fundId: number; type: string; tradeDate: string;
  shares?: number; nav?: number; amount?: number; fee?: number; note?: string;
}) {
  return prepare(db, 'INSERT INTO fund_transactions (user_id, fund_id, type, trade_date, shares, nav, amount, fee, note) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(params.userId || 1, params.fundId, params.type, params.tradeDate,
      Number(params.shares) || 0, Number(params.nav) || 0, Number(params.amount) || 0, Number(params.fee) || 0, params.note || '');
}
export async function updateFundTransaction(db: DB, id: number, fields: Record<string, any>) {
  const allowed = new Set(['type', 'trade_date', 'shares', 'nav', 'amount', 'fee', 'note']);
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.has(k)) continue;
    const key = k === 'tradeDate' ? 'trade_date' : k;
    sets.push(`${key}=?`); vals.push(v);
  }
  if (sets.length === 0) return;
  vals.push(id);
  await run(db, `UPDATE fund_transactions SET ${sets.join(',')}, updated=datetime('now') WHERE id=?`, vals);
}
export async function deleteFundTransaction(db: DB, id: number) {
  await run(db, 'DELETE FROM fund_transactions WHERE id = ?', [id]);
}

// ─── Fund NAV Cache ─────────────────────────────────────────────
export async function upsertNavCache(db: DB, params: {
  fundCode: string; navDate: string; nav: number; dailyReturnPct?: number; source?: string; quality?: string;
}) {
  await run(db, `INSERT INTO fund_nav_cache (fund_code, nav_date, nav, daily_return_pct, source, quality, fetched_at)
    VALUES (?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(fund_code, nav_date) DO UPDATE SET nav=excluded.nav, daily_return_pct=excluded.daily_return_pct,
    source=excluded.source, quality=excluded.quality, fetched_at=datetime('now')`,
    [params.fundCode, params.navDate, Number(params.nav) || 0, Number(params.dailyReturnPct) || 0,
     params.source || 'eastmoney-lsjz', params.quality || 'fresh']);
}
export function getLatestNavCache(db: DB, fundCode: string) {
  return prepare(db, 'SELECT * FROM fund_nav_cache WHERE fund_code = ? ORDER BY nav_date DESC LIMIT 1').get(fundCode);
}
export function getNavCacheHistory(db: DB, fundCode: string, limit = 120) {
  return prepare(db, `SELECT * FROM (
    SELECT * FROM fund_nav_cache WHERE fund_code = ? ORDER BY nav_date DESC LIMIT ?)
    ORDER BY nav_date ASC`).all(fundCode, Number(limit) || 120);
}
