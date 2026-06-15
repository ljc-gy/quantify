// Quantify API — Cloudflare Pages Function (Hono)
// Catch-all handler for all /api/* routes

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ok, fail } from '../../src/response';
import * as models from '../../src/models';
import { fetchQuote, fetchQuotes } from '../../src/services/marketDataService';
import { fetchKline } from '../../src/services/klineService';

type Bindings = { DB: D1Database };
const app = new Hono<{ Bindings: Bindings }>();

// CORS — allow all origins for personal use
app.use('/api/*', cors({ origin: '*' }));

// ─── Health ───────────────────────────────────────────────────────
app.get('/api/health', (c) => ok({ status: 'ok', uptime: 0 }));

// ─── Market ──────────────────────────────────────────────────────
app.get('/api/market/quote/:code', async (c) => {
  try {
    const config = await models.getConfig(c.env.DB, 'data_source');
    const source = config?.value || 'mock';
    const quote = await fetchQuote(c.req.param('code'), source);
    return ok(quote);
  } catch (err: any) { return fail(err.message); }
});

app.post('/api/market/quotes', async (c) => {
  try {
    const { codes } = await c.req.json();
    if (!Array.isArray(codes) || codes.length === 0) return fail('codes array required', 400);
    const config = await models.getConfig(c.env.DB, 'data_source');
    const quotes = await fetchQuotes(codes, config?.value || 'mock');
    return ok(quotes);
  } catch (err: any) { return fail(err.message); }
});

app.get('/api/market/index', (_c) => {
  const indices = [
    { code: '000001', name: '上证指数', price: 3350.62, changePct: 0.42 },
    { code: '399001', name: '深证成指', price: 10820.45, changePct: -0.18 },
    { code: '399006', name: '创业板指', price: 2185.37, changePct: 0.67 },
    { code: '000688', name: '科创50', price: 962.11, changePct: 1.23 },
  ];
  return ok(indices);
});

app.get('/api/market/sectors', (_c) => {
  const sectors = [
    { name: '半导体', changePct: 3.21 }, { name: '人工智能', changePct: 2.87 },
    { name: '新能源', changePct: -0.54 }, { name: '医药', changePct: -0.83 },
    { name: '消费电子', changePct: 1.42 }, { name: '券商', changePct: 0.76 },
    { name: '军工', changePct: 1.18 }, { name: '银行', changePct: 0.33 },
  ];
  return ok(sectors);
});

app.get('/api/market/kline/:code', async (c) => {
  try {
    const code = c.req.param('code');
    const limit = parseInt(c.req.query('limit') || '120');
    const period = ['day','week','month'].includes(c.req.query('period') || '') ? c.req.query('period')! : 'day';
    const klines = await fetchKline(code, period, Math.min(limit, 365));
    return ok({ name: code, period, klines });
  } catch (err: any) { return fail(err.message); }
});

// ─── Stock ───────────────────────────────────────────────────────
app.get('/api/stock/watchlist', async (c) => {
  const rows = await models.getWatchlist(c.env.DB);
  return ok(rows);
});

app.post('/api/stock/watchlist', async (c) => {
  try {
    const { code, name, market, exchange } = await c.req.json();
    if (!code || !name || !market) return fail('code, name, and market are required', 400);
    const stockId = await models.addToWatchlist(c.env.DB, { code, name, market, exchange: exchange || 'SZ' });
    return ok({ ok: true, stockId });
  } catch (err: any) { return fail(err.message); }
});

// ─── Portfolio ───────────────────────────────────────────────────
app.get('/api/portfolio/holdings', async (c) => {
  const rows = await models.getHoldings(c.env.DB);
  return ok(rows);
});

app.post('/api/portfolio/holdings', async (c) => {
  try {
    const body = await c.req.json();
    await models.upsertHolding(c.env.DB, {
      userId: body.userId || 1, stockCode: body.stock_code || body.stockCode,
      stockName: body.stock_name || body.stockName || '', quantity: body.quantity || 0,
      costPrice: body.cost_price || body.costPrice || 0, curPrice: body.cur_price || body.curPrice || 0,
      marketVal: body.market_val || body.marketVal || 0, profitLoss: body.profit_loss || body.profitLoss || 0,
      pctChange: body.pct_change || body.pctChange || 0,
    });
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.put('/api/portfolio/holdings/:id', async (c) => {
  try {
    const body = await c.req.json();
    await models.upsertHolding(c.env.DB, {
      userId: body.userId || 1, stockCode: body.stock_code || body.stockCode,
      stockName: body.stock_name || body.stockName || '', quantity: body.quantity || 0,
      costPrice: body.cost_price || body.costPrice || 0, curPrice: body.cur_price || body.curPrice || 0,
      marketVal: body.market_val || body.marketVal || 0, profitLoss: body.profit_loss || body.profitLoss || 0,
      pctChange: body.pct_change || body.pctChange || 0,
    });
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.delete('/api/portfolio/holdings/:id', async (c) => {
  try {
    await models.deleteHoldingById(c.env.DB, parseInt(c.req.param('id')));
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

// ─── Alert ──────────────────────────────────────────────────────
app.get('/api/alert/list', async (c) => {
  const rows = await models.getAlerts(c.env.DB);
  return ok(rows);
});

app.post('/api/alert/set', async (c) => {
  try {
    const body = await c.req.json();
    const result = await models.createAlert(c.env.DB, {
      userId: body.userId || 1, stockCode: body.stock_code || body.stockCode,
      stockName: body.stock_name || body.stockName, alertType: body.alert_type || body.alertType,
      threshold: body.threshold, direction: body.direction || 'above',
    });
    return ok({ id: result });
  } catch (err: any) { return fail(err.message); }
});

app.delete('/api/alert/:id', async (c) => {
  try {
    await models.deleteAlertById(c.env.DB, parseInt(c.req.param('id')));
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.patch('/api/alert/:id', async (c) => {
  try {
    const body = await c.req.json();
    await models.updateAlert(c.env.DB, parseInt(c.req.param('id')), body);
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

// ─── Config ─────────────────────────────────────────────────────
app.get('/api/config', async (c) => {
  try {
    const rows = await models.getConfigs(c.env.DB);
    const config: Record<string, string> = {};
    for (const r of rows) config[r.key as string] = r.value as string;
    return ok(config);
  } catch (err: any) { return fail(err.message); }
});

app.get('/api/config/:key', async (c) => {
  try {
    const row = await models.getConfig(c.env.DB, c.req.param('key'));
    if (!row) return fail('Config key not found', 404);
    return ok({ key: c.req.param('key'), value: row.value });
  } catch (err: any) { return fail(err.message); }
});

app.put('/api/config/:key', async (c) => {
  try {
    const { value } = await c.req.json();
    if (value === undefined) return fail('Missing value', 400);
    await models.setConfig(c.env.DB, c.req.param('key'), String(value));
    return ok({ key: c.req.param('key'), value: String(value) });
  } catch (err: any) { return fail(err.message); }
});

// ─── Journal ────────────────────────────────────────────────────
app.get('/api/journal', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const rows = await models.getJournal(c.env.DB, 1, limit);
  return ok(rows);
});

app.post('/api/journal', async (c) => {
  try {
    const body = await c.req.json();
    await models.addJournal(c.env.DB, {
      userId: body.userId || 1, stockCode: body.stock_code || body.stockCode,
      stockName: body.stock_name || body.stockName, direction: body.direction,
      price: body.price, quantity: body.quantity, tradeDate: body.trade_date || body.tradeDate,
      reason: body.reason, review: body.review,
    });
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.put('/api/journal/:id', async (c) => {
  try {
    const body = await c.req.json();
    await models.updateJournal(c.env.DB, parseInt(c.req.param('id')), body);
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.delete('/api/journal/:id', async (c) => {
  try {
    await models.deleteJournalById(c.env.DB, parseInt(c.req.param('id')));
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

// ─── Fund ───────────────────────────────────────────────────────
app.get('/api/fund/list', async (c) => {
  const rows = await models.getFunds(c.env.DB);
  return ok(rows);
});

app.post('/api/fund/add', async (c) => {
  try {
    const body = await c.req.json();
    await models.addFund(c.env.DB, {
      userId: body.userId || 1, code: body.code, name: body.name, type: body.type || '混合型',
      shares: body.shares || 0, nav: body.nav || 0, cumNav: body.cum_nav || body.cumNav || 0,
      amount: body.amount || 0, pl: body.pl || 0, rate: body.rate || 0,
    });
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.put('/api/fund/:id', async (c) => {
  try {
    const body = await c.req.json();
    await models.updateFund(c.env.DB, parseInt(c.req.param('id')), body);
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.delete('/api/fund/:id', async (c) => {
  try {
    await models.deleteFundById(c.env.DB, parseInt(c.req.param('id')));
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

// Fund snapshots
app.get('/api/fund/snapshots', async (c) => {
  const fundId = c.req.query('fundId');
  const rows = await models.getSnapshots(c.env.DB, 1, fundId ? parseInt(fundId) : undefined);
  return ok(rows);
});

app.post('/api/fund/snapshot', async (c) => {
  try {
    const body = await c.req.json();
    await models.addSnapshot(c.env.DB, {
      userId: body.userId || 1, fundId: body.fundId,
      nav: body.nav, amount: body.amount || 0, pl: body.pl || 0, rate: body.rate || 0,
      recordedAt: body.recordedAt || body.recorded_at,
    });
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

// Fund plans
app.get('/api/fund/plans', async (c) => {
  const rows = await models.getPlans(c.env.DB);
  return ok(rows);
});

app.post('/api/fund/plans', async (c) => {
  try {
    const body = await c.req.json();
    await models.addPlan(c.env.DB, {
      userId: body.userId || 1, fundId: body.fundId,
      amount: body.amount, frequency: body.frequency, nextDate: body.next_date || body.nextDate,
    });
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.put('/api/fund/plans/:id', async (c) => {
  try {
    const body = await c.req.json();
    await models.updatePlan(c.env.DB, parseInt(c.req.param('id')), body);
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.delete('/api/fund/plans/:id', async (c) => {
  try {
    await models.deletePlanById(c.env.DB, parseInt(c.req.param('id')));
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

// Fund transactions
app.get('/api/fund/:fundId/transactions', async (c) => {
  const rows = await models.getFundTransactions(c.env.DB, 1, parseInt(c.req.param('fundId')));
  return ok(rows);
});

app.post('/api/fund/:fundId/transactions', async (c) => {
  try {
    const body = await c.req.json();
    await models.addFundTransaction(c.env.DB, {
      fundId: parseInt(c.req.param('fundId')),
      type: body.type, tradeDate: body.trade_date || body.tradeDate,
      shares: body.shares, nav: body.nav, amount: body.amount, fee: body.fee, note: body.note,
    });
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.put('/api/fund/transactions/:id', async (c) => {
  try {
    const body = await c.req.json();
    await models.updateFundTransaction(c.env.DB, parseInt(c.req.param('id')), body);
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

app.delete('/api/fund/transactions/:id', async (c) => {
  try {
    await models.deleteFundTransaction(c.env.DB, parseInt(c.req.param('id')));
    return ok(null);
  } catch (err: any) { return fail(err.message); }
});

// ─── Strategy ───────────────────────────────────────────────────
app.post('/api/strategy/analyze', async (c) => {
  try {
    const { codes } = await c.req.json();
    if (!Array.isArray(codes) || codes.length === 0) return fail('codes array required', 400);
    // Import strategy engine dynamically — uses technicalindicators
    const { analyzeStocks } = await import('../../src/services/strategyEngine');
    const results = await analyzeStocks(codes);
    return ok({ results });
  } catch (err: any) { return fail(err.message); }
});

// ─── Import (JSON-based, no file upload needed) ──────────────────
app.post('/api/import/json', async (c) => {
  try {
    const body = await c.req.json();
    const userId = parseInt(body.userId || '1', 10);
    const holdings = body.holdings || body.data || [];
    if (!Array.isArray(holdings) || holdings.length === 0) return fail('No holdings data provided', 400);

    let imported = 0;
    for (const h of holdings) {
      const code = h.stock_code || h.code;
      if (!code) continue;
      const name = h.stock_name || h.name || code;
      const qty = parseInt(h.quantity || '0', 10);
      const cost = parseFloat(h.cost_price || h.costPrice || '0');
      if (qty <= 0) continue;

      await models.upsertHolding(c.env.DB, {
        userId, stockCode: code, stockName: name, quantity: qty,
        costPrice: cost, curPrice: cost, marketVal: qty * cost,
        profitLoss: 0, pctChange: 0,
      });
      imported++;
    }
    return ok({ imported, total: holdings.length });
  } catch (err: any) { return fail(err.message); }
});

// ─── Long-Term Analysis (simplified) ─────────────────────────
app.post('/api/long-term/stocks', async (c) => {
  try {
    const { codes } = await c.req.json();
    if (!Array.isArray(codes) || codes.length === 0) return fail('codes array required', 400);
    // Return basic analysis with klines
    const results = [];
    for (const code of codes) {
      try {
        const klines = await fetchKline(code, 'day', 360);
        const last = klines[klines.length - 1];
        results.push({
          type: 'stock', code,
          price: last?.close || 0,
          bars: klines.length,
          startDate: klines[0]?.date,
          endDate: last?.date,
        });
      } catch (err: any) { results.push({ type: 'stock', code, error: err.message }); }
    }
    return ok({ results });
  } catch (err: any) { return fail(err.message); }
});

// ─── Asset / Risk (stub — porting full services later) ───────────
app.get('/api/asset/overview', async (c) => {
  const holdings = await models.getHoldings(c.env.DB);
  const totalValue = holdings.reduce((sum: number, h: any) => sum + (h.market_val || 0), 0);
  const totalPL = holdings.reduce((sum: number, h: any) => sum + (h.profit_loss || 0), 0);
  return ok({ totalValue, totalPL, count: holdings.length, holdings });
});

app.get('/api/risk/assessment', async (c) => {
  const holdings = await models.getHoldings(c.env.DB);
  return ok({ holdings: holdings.length, riskLevel: holdings.length > 10 ? 'high' : holdings.length > 5 ? 'medium' : 'low' });
});

app.get('/api/risk/volatility-cone', async (c) => {
  return ok({ message: 'Volatility cone data requires kline history. Use /api/long-term/stocks for analysis.' });
});

// ─── Export ─────────────────────────────────────────────────────
export default app;

// Required for Cloudflare Pages Functions
export const onRequest = app.fetch.bind(app);
