-- quantify D1 schema v1
-- Run with: wrangler d1 execute quantify-db --file=migrations/0001_schema.sql

CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL UNIQUE,
  password    TEXT    NOT NULL,
  nickname    TEXT,
  role        TEXT    NOT NULL DEFAULT 'user',
  api_key     TEXT,
  created     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stocks (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  code     TEXT    NOT NULL UNIQUE,
  name     TEXT    NOT NULL,
  market   TEXT    NOT NULL,
  exchange TEXT    NOT NULL DEFAULT 'SZ',
  created  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watchlist (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_id  INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  added     TEXT    NOT NULL DEFAULT (datetime('now'))
);

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
  updated      TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stock_id)
);

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
  created     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated     TEXT    NOT NULL DEFAULT (datetime('now'))
);

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
  created     TEXT    NOT NULL DEFAULT (datetime('now'))
);

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
  created     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_config (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         TEXT    NOT NULL UNIQUE,
  value       TEXT    NOT NULL,
  description TEXT,
  updated     TEXT    NOT NULL DEFAULT (datetime('now'))
);

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
  created     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auto_invest_plans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fund_id     INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  amount      REAL    NOT NULL,
  frequency   TEXT    NOT NULL,
  next_date   TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'active',
  created     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fund_nav_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_id     INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nav         REAL    NOT NULL DEFAULT 0,
  amount      REAL    NOT NULL DEFAULT 0,
  pl          REAL    NOT NULL DEFAULT 0,
  rate        REAL    NOT NULL DEFAULT 0,
  recorded_at TEXT    NOT NULL,
  created     TEXT    NOT NULL DEFAULT (datetime('now'))
);

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
  created     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fund_nav_cache (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_code        TEXT    NOT NULL,
  nav_date         TEXT    NOT NULL,
  nav              REAL    NOT NULL DEFAULT 0,
  daily_return_pct REAL    NOT NULL DEFAULT 0,
  source           TEXT    NOT NULL DEFAULT '',
  fetched_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  quality          TEXT    NOT NULL DEFAULT 'fresh',
  UNIQUE(fund_code, nav_date)
);

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
  created     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Seed default data
INSERT OR IGNORE INTO users (id, username, password, nickname, role) VALUES (1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrator', 'admin');
INSERT OR IGNORE INTO system_config (key, value, description) VALUES ('risk_warn', '15.3', 'Risk warning threshold');
INSERT OR IGNORE INTO system_config (key, value, description) VALUES ('risk_max', '99', 'Risk max threshold');
INSERT OR IGNORE INTO system_config (key, value, description) VALUES ('ws_interval', '3000', 'WebSocket push interval in ms');
INSERT OR IGNORE INTO system_config (key, value, description) VALUES ('data_source', 'mock', 'Data source: mock / tushare / eastmoney');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stocks_code ON stocks(code);
CREATE INDEX IF NOT EXISTS idx_snapshot_updated ON market_snapshot(updated);
CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_funds_user ON funds(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_user ON auto_invest_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_fund ON fund_nav_snapshots(fund_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON fund_nav_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_fund ON fund_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_user ON fund_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fund_nav_cache_code_date ON fund_nav_cache(fund_code, nav_date);
CREATE INDEX IF NOT EXISTS idx_journal_user ON trade_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON trade_journal(trade_date);
