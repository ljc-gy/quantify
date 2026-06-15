import { Router } from 'express';
import { ok, fail } from '../utils/response.js';
import {
  analyzeFundLongTerm,
  analyzeFundLongTermFromHistory,
  analyzeStockLongTerm,
  fundHistoryFromSnapshots,
} from '../services/longTermAnalysisService.js';
import { buildTrendRadar } from '../services/trendRadarService.js';
import { analyzeCompanyHealth } from '../services/companyHealthService.js';
import { scanMarketForStrongFunds } from '../services/marketFundScanService.js';
import { readFileSync } from 'node:fs';
import { applyMacroOverlay } from '../services/macroOverlayService.js';
import * as fm from '../models/fundModels.js';

const router = Router();

async function analyzeStocks(codes, options = {}) {
  const results = [];
  for (const code of codes) {
    try {
      const analysis = await analyzeStockLongTerm(code, {
        period: options.period || 'day',
        limit: Math.min(Number(options.limit) || 360, 520),
      });
      try {
        analysis.company = await analyzeCompanyHealth(code);
      } catch (companyErr) {
        analysis.company = { code, score: 0, level: '数据不足', summary: '公司基础画像暂时获取失败：' + companyErr.message, dataQuality: { reliable: false, warnings: [companyErr.message] }, confidence: { level: '低', notes: ['公司状态数据未获取成功'] } };
      }
      results.push(analysis);
    } catch (err) { results.push({ type: 'stock', code, error: err.message }); }
  }
  return results;
}

async function analyzeFunds(userId, days) {
  const funds = fm.getFunds(userId).filter(f => f.code);
  const results = [];
  for (const fund of funds) {
    try {
      let analysis = await analyzeFundLongTerm(fund, { days });
      if (!analysis.dataQuality?.points) {
        const snapshots = fm.getSnapshots(userId, fund.id);
        const history = fundHistoryFromSnapshots(snapshots);
        if (history.length) analysis = analyzeFundLongTermFromHistory({ fund, history, source: 'snapshot' });
      }
      results.push(analysis);
    } catch (err) { results.push({ type: 'fund', code: fund.code, name: fund.name, error: err.message }); }
  }
  return results;
}

router.post('/stocks', async (req, res) => {
  try {
    const codes = Array.isArray(req.body.codes) ? req.body.codes : [];
    if (codes.length === 0) return fail(res, 'codes array required', 400);
    const results = await analyzeStocks(codes, req.body);
    ok(res, { results });
  } catch (err) { fail(res, err.message); }
});

router.post('/stock-radar', async (req, res) => {
  try {
    const codes = Array.isArray(req.body.codes) ? req.body.codes : [];
    if (codes.length === 0) return fail(res, 'codes array required', 400);
    const results = await analyzeStocks(codes, req.body);
    ok(res, buildTrendRadar(results));
  } catch (err) { fail(res, err.message); }
});

router.get('/funds', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const days = Math.min(Number(req.query.days) || 360, 520);
    const results = await analyzeFunds(userId, days);
    ok(res, { results });
  } catch (err) { fail(res, err.message); }
});

router.get('/fund-radar', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const days = Math.min(Number(req.query.days) || 360, 520);
    const results = await analyzeFunds(userId, days);
    const withMacro = results.map(function(r) {
      if (r.error) return r;
      return { ...r, macro: applyMacroOverlay(r) };
    });
    ok(res, buildTrendRadar(withMacro));
  } catch (err) { fail(res, err.message); }
});

router.get('/top10', (req, res) => {
  try {
    const data = JSON.parse(readFileSync(
      './data/top-funds.json', 'utf8'
    ));
    ok(res, data);
  } catch (err) {
    fail(res, 'Top 10 data not available. Run a scan first.', 404);
  }
});

router.get('/market-fund-scan', async (req, res) => {
  try {
    const scanDays = Math.min(Number(req.query.scanDays) || 360, 520);
    const maxPerCategory = Math.min(Number(req.query.maxPerCategory) || 100, 200);
    const minScore = Number(req.query.minScore) || 55;
    const categoriesParam = req.query.categories || '';
    const options = { scanDays, maxPerCategory, minScore };
    if (categoriesParam) {
      const allowedCats = categoriesParam.split(',').map(s => s.trim()).filter(Boolean);
      const allCats = ['股票型', '混合型', '指数型', 'QDII'];
      const filtered = allCats.filter(c => allowedCats.includes(c) || allowedCats.includes('all'));
      if (filtered.length > 0) options.categories = filtered;
    }
    const result = await scanMarketForStrongFunds(options);
    ok(res, result);
  } catch (err) {
    console.error('[market-fund-scan] route error:', err);
    fail(res, err.message, 500);
  }
});

export default router;
