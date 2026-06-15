import { prepare, run } from '../utils/initDb.js';

// --- Users ---

export function findUserById(id) {
  return prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function findUserByUsername(username) {
  return prepare('SELECT * FROM users WHERE username = ?').get(username);
}

// --- Holdings ---

export function getHoldings(userId = 1) {
  return prepare(
    'SELECT * FROM holdings WHERE user_id = ? ORDER BY market_val DESC'
  ).all(userId);
}

export function getHoldingByCode(userId, stockCode) {
  return prepare(
    'SELECT * FROM holdings WHERE user_id = ? AND stock_code = ?'
  ).get(userId, stockCode);
}

export function upsertHolding({ userId, stockCode, stockName, quantity, costPrice, curPrice, marketVal, profitLoss, pctChange }) {
  const existing = prepare(
    'SELECT id FROM holdings WHERE user_id = ? AND stock_code = ?'
  ).get(userId, stockCode);

  if (existing) {
    run(
      `UPDATE holdings SET stock_name=?, quantity=?, cost_price=?, cur_price=?,
       market_val=?, profit_loss=?, pct_change=?, updated=datetime('now','localtime')
       WHERE id=?`,
      [stockName, quantity, costPrice, curPrice, marketVal, profitLoss, pctChange, existing.id]
    );
    return existing.id;
  }

  const res = prepare(
    `INSERT INTO holdings (user_id, stock_code, stock_name, quantity, cost_price, cur_price, market_val, profit_loss, pct_change)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(userId, stockCode, stockName, quantity, costPrice, curPrice, marketVal, profitLoss, pctChange);
  return res.lastInsertRowid;
}

// Delete a holding by id
export function deleteHolding(id, userId = 1) {
  return run('DELETE FROM holdings WHERE id = ? AND user_id = ?', [id, userId]);
}

// --- Transactions ---

export function getTransactions(userId = 1, limit = 50) {
  return prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created DESC LIMIT ?'
  ).all(userId, limit);
}

export function addTransaction({ userId, stockCode, stockName, type, quantity, price, amount, fee = 0 }) {
  return prepare(
    `INSERT INTO transactions (user_id, stock_code, stock_name, type, quantity, price, amount, fee)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(userId, stockCode, stockName, type, quantity, price, amount, fee);
}

// --- Alerts ---

export function getAlerts(userId = 1) {
  return prepare(
    'SELECT * FROM alerts WHERE user_id = ? ORDER BY created DESC'
  ).all(userId);
}

export function createAlert({ userId, stockCode, stockName, alertType, threshold, direction = 'above' }) {
  return prepare(
    `INSERT INTO alerts (user_id, stock_code, stock_name, alert_type, threshold, direction)
     VALUES (?,?,?,?,?,?)`
  ).run(userId, stockCode, stockName, alertType, threshold, direction);
}

export function updateAlert(id, fields) {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  vals.push(id);
  run(`UPDATE alerts SET ${sets.join(', ')}, updated=datetime('now','localtime') WHERE id=?`, vals);
}

export function deleteAlert(id) {
  run('DELETE FROM alerts WHERE id = ?', [id]);
}

// --- System Config ---

export function getConfig(key) {
  const row = prepare('SELECT value FROM system_config WHERE key = ?').get(key);
  return row?.value ?? null;
}

export function getConfigs() {
  const rows = prepare('SELECT * FROM system_config').all();
  const map = {};
  for (const r of rows) map[r.key] = r;
  return map;
}

export function setConfig(key, value, description = null) {
  const existing = prepare('SELECT id FROM system_config WHERE key = ?').get(key);
  if (existing) {
    run("UPDATE system_config SET value=?, description=COALESCE(?,description), updated=datetime('now','localtime') WHERE key=?",
      [value, description, key]);
  } else {
    run("INSERT INTO system_config (key, value, description) VALUES (?,?,?)", [key, value, description]);
  }
}


// --- Trade Journal ---

export function getJournal(userId = 1, limit = 100) {
  return prepare(
    'SELECT * FROM trade_journal WHERE user_id = ? ORDER BY trade_date DESC, id DESC LIMIT ?'
  ).all(userId, limit);
}

export function addJournal({ userId, stockCode, stockName, direction, price, quantity, tradeDate, reason, review }) {
  return prepare(
    `INSERT INTO trade_journal (user_id, stock_code, stock_name, direction, price, quantity, trade_date, reason, review)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(userId, stockCode, stockName, direction, price, quantity, tradeDate, reason || '', review || '');
}

export function updateJournal(id, fields) {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  vals.push(id);
  run(`UPDATE trade_journal SET ${sets.join(', ')}, updated=datetime('now','localtime') WHERE id=?`, vals);
}

export function deleteJournal(id) {
  run('DELETE FROM trade_journal WHERE id = ?', [id]);
}
