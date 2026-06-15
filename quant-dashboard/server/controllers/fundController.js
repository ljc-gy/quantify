import { ok, fail } from "../utils/response.js";
import * as fm from '../models/fundModels.js';
import { fetchFundNav, resolveFund, fetchFundHistory, buildPortfolioTrend } from '../services/fundNavService.js';
import { buildFundSummary, buildPortfolioSummary as calculatePortfolioSummary } from '../services/fundLedgerService.js';

/* ================================================================
   NAV Snapshots
   ================================================================ */
export function getSnapshots(req, res) {
  try {
    const userId = req.query.userId || 1;
    const fundId = req.query.fundId || null;
    const rows = fm.getSnapshots(userId, fundId);
    ok(res, { snapshots: rows });
  } catch (err) {
    fail(res, err.message);
  }
}

export function addSnapshot(req, res) {
  try {
    const userId = req.body.userId || 1;
    const { fundId, nav, amount, pl, rate, recordedAt } = req.body;
    if (!fundId || nav == null) return fail(res, 'missing fundId or nav', 400);
    const id = fm.addSnapshot({
      userId, fundId: Number(fundId),
      nav: Number(nav), amount: Number(amount) || 0,
      pl: Number(pl) || 0, rate: Number(rate) || 0,
      recordedAt,
    });
    ok(res, { id });
  } catch (err) {
    fail(res, err.message);
  }
}

export function snapshotAll(req, res) {
  try {
    const userId = req.body.userId || 1;
    const navUpdates = req.body.updates || [];
    const ids = [];
    for (const u of navUpdates) {
      const fund = fm.getFundById(u.fundId);
      if (!fund) continue;
      const newNav = Number(u.nav);
      const newAmount = (fund.shares || 0) * newNav;
      const newPl = newAmount - (fund.shares * fund.cum_nav || 0);
      const newRate = fund.cum_nav > 0 ? ((newNav - fund.cum_nav) / fund.cum_nav * 100) : 0;
      const id = fm.addSnapshot({
        userId, fundId: u.fundId,
        nav: newNav, amount: newAmount,
        pl: newPl, rate: newRate,
        recordedAt: u.recordedAt,
      });
      ids.push(id);
    }
    ok(res, { ids });
  } catch (err) {
    fail(res, err.message);
  }
}

/* ================================================================
   Fund CRUD
   ================================================================ */
export function getFunds(req, res) {
  try {
    const userId = req.query.userId || 1;
    const rows = fm.getFunds(userId);
    ok(res, { funds: rows });
  } catch (err) {
    fail(res, err.message);
  }
}

export function addFund(req, res) {
  try {
    const userId = req.body.userId || 1;
    const { code, name, type, shares, nav, cumNav, amount, pl, rate } = req.body;
    if (!name) return fail(res, '基金名称不能为空', 400);
    const id = fm.addFund({
      userId, code: code || '', name, type: type || '股票型基金',
      shares: Number(shares) || 0, nav: Number(nav) || 1,
      cumNav: Number(cumNav) || 1, amount: Number(amount) || 0,
      pl: Number(pl) || 0, rate: Number(rate) || 0,
    });
    fm.addSnapshot({
      userId, fundId: id,
      nav: Number(nav) || 1,
      amount: Number(amount) || 0,
      pl: Number(pl) || 0,
      rate: Number(rate) || 0,
      recordedAt: new Date().toISOString().slice(0, 10),
    });
    if ((Number(shares) || 0) > 0) {
      fm.addTransaction({
        userId,
        fundId: id,
        type: 'buy',
        tradeDate: new Date().toISOString().slice(0, 10),
        shares: Number(shares) || 0,
        nav: Number(cumNav || nav) || 1,
        amount: Number(amount) || ((Number(shares) || 0) * (Number(cumNav || nav) || 1)),
        fee: 0,
        note: '初始持仓',
      });
    }
    ok(res, { id });
  } catch (err) {
    fail(res, err.message);
  }
}

export function updateFund(req, res) {
  try {
    fm.updateFund(req.params.id, req.body);
    ok(res, null, { message: '更新成功' });
  } catch (err) {
    fail(res, err.message);
  }
}

export function deleteFund(req, res) {
  try {
    fm.deleteFund(req.params.id);
    ok(res, null, { message: '删除成功' });
  } catch (err) {
    fail(res, err.message);
  }
}

/* ================================================================
   Fund transactions and summaries
   ================================================================ */
export function getTransactions(req, res) {
  try {
    const userId = req.query.userId || 1;
    const fundId = req.params.fundId;
    ok(res, { transactions: fm.getTransactions(userId, fundId) });
  } catch (err) {
    fail(res, err.message);
  }
}

export function addTransaction(req, res) {
  try {
    const userId = req.body.userId || 1;
    const fundId = Number(req.params.fundId);
    const { type, tradeDate, shares, nav, amount, fee, note } = req.body;
    if (!fundId || !type || !tradeDate) return fail(res, 'fundId, type and tradeDate required', 400);
    const id = fm.addTransaction({
      userId,
      fundId,
      type,
      tradeDate,
      shares: Number(shares) || 0,
      nav: Number(nav) || 0,
      amount: Number(amount) || 0,
      fee: Number(fee) || 0,
      note: note || '',
    });
    ok(res, { id });
  } catch (err) {
    fail(res, err.message);
  }
}

export function updateTransaction(req, res) {
  try {
    fm.updateTransaction(req.params.id, req.body);
    ok(res, null, { message: '更新成功' });
  } catch (err) {
    fail(res, err.message);
  }
}

export function deleteTransaction(req, res) {
  try {
    fm.deleteTransaction(req.params.id);
    ok(res, null, { message: '删除成功' });
  } catch (err) {
    fail(res, err.message);
  }
}

function summarizeFund(userId, fund) {
  let transactions = fm.getTransactions(userId, fund.id);
  const latestNav = fund.code ? fm.getLatestNavCache(fund.code) : null;
  let fallbackNav = latestNav || (fund.nav > 0 ? {
    nav: fund.nav,
    nav_date: fund.updated ? String(fund.updated).slice(0, 10) : null,
    source: 'funds-latest',
  } : null);
  if (transactions.length === 0 && (Number(fund.shares) || 0) > 0) {
    const costNav = Number(fund.cum_nav) || Number(fund.nav) || 1;
    transactions = [{
      type: 'buy',
      trade_date: fund.created ? String(fund.created).slice(0, 10) : new Date().toISOString().slice(0, 10),
      shares: Number(fund.shares) || 0,
      nav: costNav,
      amount: (Number(fund.shares) || 0) * costNav,
      fee: 0,
      note: 'legacy position fallback',
    }];
    if (!latestNav && fund.nav > 0) {
      fallbackNav = {
        nav: fund.nav,
        nav_date: fund.updated ? String(fund.updated).slice(0, 10) : null,
        source: 'legacy-funds-row',
      };
    }
  }
  return buildFundSummary({ fund, transactions, latestNav: fallbackNav });
}

export function getFundSummary(req, res) {
  try {
    const userId = req.query.userId || 1;
    const fund = fm.getFundById(req.params.fundId);
    if (!fund) return fail(res, 'fund not found', 404);
    ok(res, { summary: summarizeFund(userId, fund) });
  } catch (err) {
    fail(res, err.message);
  }
}

export function getPortfolioSummary(req, res) {
  try {
    const userId = req.query.userId || 1;
    const funds = fm.getFunds(userId);
    const summaries = funds.map(fund => summarizeFund(userId, fund));
    const summary = calculatePortfolioSummary({ summaries, trend: [] });
    ok(res, { summary, funds: summaries });
  } catch (err) {
    fail(res, err.message);
  }
}

/* ================================================================
   Auto-invest plans
   ================================================================ */
export function getPlans(req, res) {
  try {
    const userId = req.query.userId || 1;
    const rows = fm.getPlans(userId);
    ok(res, { plans: rows });
  } catch (err) {
    fail(res, err.message);
  }
}

export function addPlan(req, res) {
  try {
    const userId = req.body.userId || 1;
    const { fundId, amount, frequency, nextDate, status } = req.body;
    if (!fundId || !amount) return fail(res, '基金ID和金额不能为空', 400);
    const id = fm.addPlan({
      userId, fundId: Number(fundId),
      amount: Number(amount), frequency: frequency || '每月1日',
      nextDate: nextDate || '', status: status || 'active',
    });
    ok(res, { id });
  } catch (err) {
    fail(res, err.message);
  }
}

export function updatePlan(req, res) {
  try {
    fm.updatePlan(req.params.id, req.body);
    ok(res, null, { message: '更新成功' });
  } catch (err) {
    fail(res, err.message);
  }
}

export function deletePlan(req, res) {
  try {
    fm.deletePlan(req.params.id);
    ok(res, null, { message: '删除成功' });
  } catch (err) {
    fail(res, err.message);
  }
}

/* ================================================================
   Auto-refresh NAV from East Money
   ================================================================ */
export async function refreshNav(req, res) {
  try {
    const userId = req.body.userId || 1;
    const fundId = req.body.fundId || null;

    const funds = fundId
      ? [fm.getFundById(fundId)].filter(Boolean)
      : fm.getFunds(userId);

    if (funds.length === 0) return fail(res, '没有可刷新的基金', 400);

    const results = [];
    for (const fund of funds) {
      if (!fund.code) {
        results.push({ fundId: fund.id, code: '', ok: false, error: '缺少基金代码' });
        continue;
      }

      const navData = await fetchFundNav(fund.code);
      if (!navData) {
        results.push({ fundId: fund.id, code: fund.code, ok: false, error: 'API获取失败' });
        continue;
      }

      const newNav = navData.nav;
      if (navData.name && !fund.name) {
        fm.updateFund(fund.id, { name: navData.name });
        fund.name = navData.name;
      }
      const newAmount = (fund.shares || 0) * newNav;
      const cumNav = fund.cum_nav || 1;
      const newPl = newAmount - (fund.shares * cumNav);
      const newRate = ((newNav - cumNav) / cumNav) * 100;

      fm.addSnapshot({
        userId, fundId: fund.id,
        nav: newNav, amount: newAmount,
        pl: newPl, rate: newRate,
        recordedAt: navData.date || new Date().toISOString().slice(0, 10),
      });

      if (fund.code && navData.date) {
        fm.upsertNavCache({
          fundCode: fund.code,
          navDate: navData.date,
          nav: newNav,
          dailyReturnPct: navData.dailyReturn || 0,
          source: 'eastmoney-lsjz',
          quality: 'fresh',
        });
      }

      results.push({
        fundId: fund.id, code: fund.code, ok: true,
        nav: newNav, amount: newAmount, pl: newPl, rate: newRate,
        date: navData.date,
      });
    }

    ok(res, { results });
  } catch (err) {
    fail(res, err.message);
  }
}

/* ================================================================
   Fund code resolution (name + type from East Money)
   ================================================================ */
export async function resolveFundInfo(req, res) {
  try {
    const { code } = req.params;
    if (!code || code.length < 6) return fail(res, 'Invalid fund code', 400);
    const info = await resolveFund(code);
    if (!info) return fail(res, 'Failed to resolve fund code', 404);
    ok(res, info);
  } catch (err) {
    fail(res, err.message);
  }
}

/* ================================================================
   Yesterday return — fetched from East Money API (real daily returns)
   ================================================================ */
export async function getYesterdayReturn(req, res) {
  try {
    const userId = req.query.userId || 1;
    const funds = fm.getFunds(userId);
    const results = [];

    const navPromises = funds.map(async (fund) => {
      if (!fund.code || fund.code.length < 6) {
        return { fundId: fund.id, yesterdayReturn: 0 };
      }

      try {
        const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${fund.code}&pageIndex=1&pageSize=2`;
        const apiRes = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { Referer: 'https://fund.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' },
        });

        if (!apiRes.ok) {
          return { fundId: fund.id, yesterdayReturn: 0 };
        }

        const json = await apiRes.json();
        if (json.ErrCode !== 0 || !json.Data || !json.Data.LSJZList) {
          return { fundId: fund.id, yesterdayReturn: 0 };
        }

        const list = json.Data.LSJZList;
        if (list.length < 2) {
          const jzzzl = parseFloat(list[0].JZZZL) || 0;
          const navReturn = jzzzl / 100 * (fund.amount || 0);
          return { fundId: fund.id, yesterdayReturn: Math.round(navReturn * 100) / 100 };
        }

        const latest = parseFloat(list[0].DWJZ) || 0;
        const prev = parseFloat(list[1].DWJZ) || 0;
        const navDiff = latest - prev;
        const yesterdayReturn = navDiff * (fund.shares || 0);

        return { fundId: fund.id, yesterdayReturn: Math.round(yesterdayReturn * 100) / 100 };
      } catch (e) {
        console.error(`[getYesterdayReturn] failed for ${fund.code}: ${e.message}`);
        return { fundId: fund.id, yesterdayReturn: 0 };
      }
    });

    const settledResults = await Promise.allSettled(navPromises);
    for (const r of settledResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      }
    }

    ok(res, { date: new Date().toISOString().slice(0, 10), isTradeDay: true, returns: results });
  } catch (err) {
    fail(res, err.message);
  }
}

/* ================================================================
   Portfolio NAV trend — aggregate all funds' NAV history
   ================================================================ */
export async function getPortfolioTrend(req, res) {
  try {
    const userId = req.query.userId || 1;
    const days = parseInt(req.query.days) || 60;
    const funds = fm.getFunds(userId);

    if (funds.length === 0) {
      return ok(res, { dates: [], values: [] });
    }

    const trend = await buildPortfolioTrend(funds, Math.min(days, 120));
    ok(res, trend);
  } catch (err) {
    fail(res, err.message);
  }
}

/* ================================================================
   Fund NAV history from East Money (for charting)
   ================================================================ */
export async function getFundHistory(req, res) {
  try {
    const { code } = req.params;
    if (!code || code.length < 6) return fail(res, 'Invalid fund code', 400);
    const days = parseInt(req.query.days) || 60;
    const data = await fetchFundHistory(code, Math.min(days, 120));
    if (!data) return fail(res, 'Failed to fetch fund history', 502);
    for (const row of data.history || []) {
      fm.upsertNavCache({
        fundCode: code,
        navDate: row.date,
        nav: row.nav,
        dailyReturnPct: row.dailyReturnPct || 0,
        source: data.dataQuality?.source || 'eastmoney-lsjz',
        quality: data.dataQuality?.reliable === false ? 'warning' : 'fresh',
      });
    }
    ok(res, data);
  } catch (err) {
    fail(res, err.message);
  }
}
