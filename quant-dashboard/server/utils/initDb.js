import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import initSqlJs from 'sql.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, '..', 'db');
const DB_PATH = join(DB_DIR, 'quant.db');

let db;
let SQL;

async function getDb() {
  if (!db) {
    SQL = await initSqlJs();

    if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function prepare(sql) {
  return {
    all(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    get(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row;
    },
    run(...params) {
      db.run(sql, params);
      const lastInsertRowid = db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] || 0;
      saveDb();
      return {
        lastInsertRowid,
      };
    },
  };
}

async function initDb() {
  await getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS stocks (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      code     TEXT    NOT NULL UNIQUE,
      name     TEXT    NOT NULL,
      market   TEXT    NOT NULL,
      exchange TEXT    NOT NULL DEFAULT 'SZ',
      created  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_id  INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
      added     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS market_snapshot (
      stock_id     INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
      price        REAL    NOT NULL DEFAULT 0,
      change_pct   REAL    NOT NULL DEFAULT 0,
      volume       REAL    NOT NULL DEFAULT 0,
      turnover     REAL    NOT NULL DEFAULT 0,
      high         REAL    NOT NULL DEFAULT 0,
      low          REAL    NOT NULL DEFAULT 0,
      open         REAL    NOT NULL DEFAULT 0,
      prev_close   REAL    NOT NULL DEFAULT 0,
      updated      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (stock_id)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_stocks_code ON stocks(code)');
  db.run('CREATE INDEX IF NOT EXISTS idx_snapshot_updated ON market_snapshot(updated)');

  // 鈹€鈹€ users: user accounts 鈹€鈹€
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      nickname    TEXT,
      role        TEXT    NOT NULL DEFAULT 'user',
      api_key     TEXT,
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 鈹€鈹€ holdings: positions 鈹€鈹€
  db.run(`
    CREATE TABLE IF NOT EXISTS holdings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_code  TEXT    NOT NULL,
      stock_name  TEXT    NOT NULL,
      quantity    INTEGER NOT NULL DEFAULT 0,
      cost_price  REAL    NOT NULL DEFAULT 0,
      cur_price   REAL    NOT NULL DEFAULT 0,
      market_val  REAL    NOT NULL DEFAULT 0,
      profit_loss REAL    NOT NULL DEFAULT 0,
      pct_change  REAL    NOT NULL DEFAULT 0,
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 鈹€鈹€ transactions: trade records 鈹€鈹€
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_code  TEXT    NOT NULL,
      stock_name  TEXT    NOT NULL,
      type        TEXT    NOT NULL,
      quantity    INTEGER NOT NULL,
      price       REAL    NOT NULL,
      amount      REAL    NOT NULL,
      fee         REAL    NOT NULL DEFAULT 0,
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 鈹€鈹€ alerts: price alerts 鈹€鈹€
  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_code  TEXT    NOT NULL,
      stock_name  TEXT,
      alert_type  TEXT    NOT NULL,
      threshold   REAL    NOT NULL,
      direction   TEXT    NOT NULL DEFAULT 'above',
      enabled     INTEGER NOT NULL DEFAULT 1,
      triggered   INTEGER NOT NULL DEFAULT 0,
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 鈹€鈹€ system_config: key-value settings 鈹€鈹€
  db.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      key         TEXT    NOT NULL UNIQUE,
      value       TEXT    NOT NULL,
      description TEXT,
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // Seed default user and config if empty
  const userCount = db.exec("SELECT COUNT(*) FROM users")[0]?.values[0][0] || 0;
  if (userCount === 0) {
    const pwHash = createHash('sha256').update('admin123').digest('hex');
    db.run("INSERT INTO users (username, password, nickname, role) VALUES ('admin', ?, 'Administrator', 'admin')", [pwHash]);
  }

  const configCount = db.exec("SELECT COUNT(*) FROM system_config")[0]?.values[0][0] || 0;
  if (configCount === 0) {
    db.run("INSERT INTO system_config (key, value, description) VALUES ('risk_warn', '15.3', 'Risk warning threshold')");
    db.run("INSERT INTO system_config (key, value, description) VALUES ('risk_max', '99', 'Risk max threshold')");
    db.run("INSERT INTO system_config (key, value, description) VALUES ('ws_interval', '3000', 'WebSocket push interval in ms')");
    db.run("INSERT INTO system_config (key, value, description) VALUES ('data_source', 'mock', 'Data source: mock / tushare / eastmoney')");
  }

  db.run('CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id)');
  // --- funds: fund holdings ---
  db.run(`
    CREATE TABLE IF NOT EXISTS funds (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code        TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      type        TEXT    NOT NULL,
      shares      REAL    NOT NULL DEFAULT 0,
      nav         REAL    NOT NULL DEFAULT 0,
      cum_nav     REAL    NOT NULL DEFAULT 0,
      amount      REAL    NOT NULL DEFAULT 0,
      pl          REAL    NOT NULL DEFAULT 0,
      rate        REAL    NOT NULL DEFAULT 0,
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // --- auto_invest_plans ---
  db.run(`
    CREATE TABLE IF NOT EXISTS auto_invest_plans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fund_id     INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
      amount      REAL    NOT NULL,
      frequency   TEXT    NOT NULL,
      next_date   TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'active',
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

    // --- fund_nav_snapshots: historical NAV tracking ---
  db.run(`
    CREATE TABLE IF NOT EXISTS fund_nav_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      fund_id     INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nav         REAL    NOT NULL DEFAULT 0,
      amount      REAL    NOT NULL DEFAULT 0,
      pl          REAL    NOT NULL DEFAULT 0,
      rate        REAL    NOT NULL DEFAULT 0,
      recorded_at TEXT    NOT NULL,
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_funds_user ON funds(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_plans_user ON auto_invest_plans(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_snapshots_fund ON fund_nav_snapshots(fund_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_snapshots_user ON fund_nav_snapshots(user_id)');

  db.run(`
    CREATE TABLE IF NOT EXISTS fund_transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fund_id     INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
      type        TEXT    NOT NULL,
      trade_date  TEXT    NOT NULL,
      shares      REAL    NOT NULL DEFAULT 0,
      nav         REAL    NOT NULL DEFAULT 0,
      amount      REAL    NOT NULL DEFAULT 0,
      fee         REAL    NOT NULL DEFAULT 0,
      note        TEXT    NOT NULL DEFAULT '',
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fund_nav_cache (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      fund_code        TEXT    NOT NULL,
      nav_date         TEXT    NOT NULL,
      nav              REAL    NOT NULL DEFAULT 0,
      daily_return_pct REAL    NOT NULL DEFAULT 0,
      source           TEXT    NOT NULL DEFAULT '',
      fetched_at       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      quality          TEXT    NOT NULL DEFAULT 'fresh',
      UNIQUE(fund_code, nav_date)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_fund_transactions_fund ON fund_transactions(fund_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_fund_transactions_user ON fund_transactions(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_fund_nav_cache_code_date ON fund_nav_cache(fund_code, nav_date)');

  // --- trade_journal: trading diary ---
  db.run(`
    CREATE TABLE IF NOT EXISTS trade_journal (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_code  TEXT    NOT NULL,
      stock_name  TEXT    NOT NULL,
      direction   TEXT    NOT NULL,
      price       REAL    NOT NULL,
      quantity    INTEGER NOT NULL,
      trade_date  TEXT    NOT NULL,
      reason      TEXT    NOT NULL DEFAULT '',
      review      TEXT    NOT NULL DEFAULT '',
      pnl         REAL    NOT NULL DEFAULT 0,
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_journal_user ON trade_journal(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_journal_date ON trade_journal(trade_date)');




  // --- trade_journal: trading diary ---
  db.run(`
    CREATE TABLE IF NOT EXISTS trade_journal (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stock_code  TEXT    NOT NULL,
      stock_name  TEXT    NOT NULL,
      direction   TEXT    NOT NULL,
      price       REAL    NOT NULL,
      quantity    INTEGER NOT NULL,
      trade_date  TEXT    NOT NULL,
      reason      TEXT    NOT NULL DEFAULT '',
      review      TEXT    NOT NULL DEFAULT '',
      pnl         REAL    NOT NULL DEFAULT 0,
      created     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_journal_user ON trade_journal(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_journal_date ON trade_journal(trade_date)');


  saveDb();
  console.log('[db] initialized successfully');
}

export { getDb, run, prepare, saveDb, initDb };
