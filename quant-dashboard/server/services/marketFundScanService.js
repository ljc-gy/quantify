import { analyzeFundLongTermFromHistory } from './longTermAnalysisService.js';
import { classifyTrendCandidate } from './trendRadarService.js';
import { createEastMoneyClient } from './eastmoneyClient.js';
import { applyMacroOverlay } from './macroOverlayService.js';

const client = createEastMoneyClient({ minIntervalMs: 900, jitterMs: 200, timeoutMs: 12000, maxRetries: 1 });

const EASTMONEY_FUND_HEADERS = { Referer: 'https://fund.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' };
const SCAN_CATEGORIES = [
  { ft: 'gp',  label: '股票型' },
  { ft: 'hh',  label: '混合型' },
  { ft: 'zs',  label: '指数型' },
  { ft: 'qdii', label: 'QDII' },
];
const PAGE_SIZE = 100;
const CONCURRENCY = 3;

/**
 * Fetch NAV history from Sina Finance (fallback when East Money fails).
 */
async function fetchSinaNavHistory(code, targetDays) {
  const pageSize = 10;
  const pages = Math.ceil(targetDays / pageSize);
  const history = [];
  try {
    for (let pageIndex = 1; pageIndex <= pages; pageIndex++) {
      const url = 'https://stock.finance.sina.com.cn/fundInfo/api/openapi.php/CaihuiFundInfoService.getNav?symbol=' + code + '&page=' + pageIndex + '&num=' + pageSize;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://finance.sina.com.cn/' },
      });
      if (!res.ok) break;
      const json = await res.json();
      if (json.result?.status?.code !== 0) break;
      const items = json.result?.data?.data;
      if (!items || !items.length) break;
      for (const item of items) {
        const nav = parseFloat(item.jjjz);
        const date = (item.fbrq || '').slice(0, 10);
        if (date && !isNaN(nav) && nav > 0) history.push({ date, nav });
        if (history.length >= targetDays) break;
      }
      if (items.length < pageSize || history.length >= targetDays) break;
    }
    if (history.length === 0) return null;
    return history.reverse();
  } catch (e) { return null; }
}

function parseRankRecord(record) {
  const parts = record.split(',');
  if (parts.length < 18) return null;
  const code = parts[0];
  const name = parts[1];
  const inceptionDate = parts[16] || '';
  if (!code || code.length < 6 || !name) return null;
  const parseNum = (s) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 0; };
  return {
    code, name, inceptionDate,
    unitNav: parseNum(parts[4]), cumNav: parseNum(parts[5]),
    returns: { daily: parseNum(parts[6]), week1: parseNum(parts[7]), month1: parseNum(parts[8]), month3: parseNum(parts[9]), month6: parseNum(parts[10]), year1: parseNum(parts[11]), year2: parseNum(parts[12]), year3: parseNum(parts[13]), ytd: parseNum(parts[14]), inception: parseNum(parts[15]) },
  };
}

async function fetchRankPage(ft, page, size) {
  const pn = size || 100;
  const pi = page || 1;
  const url = 'https://fund.eastmoney.com/data/rankhandler.aspx?op=ph&dt=kf&ft=' + ft + '&sc=1n&st=desc&pi=' + pi + '&pn=' + pn + '&v=0.1';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: EASTMONEY_FUND_HEADERS });
    if (!res.ok) return null;
    const text = await res.text();
    // Extract JSON from var rankData = ...
    const prefix = 'var rankData = ';
    const idx = text.indexOf(prefix);
    if (idx < 0) return null;
    let depth = 0, start = idx + prefix.length, end = start;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (start >= end) return null;
    const jsonStr = text.slice(start, end);
    const data = new Function("return " + jsonStr)();
    return {
      records: (data.datas || []).map(parseRankRecord).filter(Boolean),
      total: data.allRecords || 0,
      pages: data.allPages || 0,
    };
  } catch (e) {
    console.error('[marketFundScan] fetchRankPage ft=' + ft + ' err=' + (e.message || e));
    return null;
  }
}

async function fetchCategoryCandidates(ft, label, maxCandidates) {
  const candidates = [];
  const maxPages = Math.ceil(maxCandidates / PAGE_SIZE);
  for (let page = 1; page <= maxPages; page++) {
    const result = await fetchRankPage(ft, page, PAGE_SIZE);
    if (!result || !result.records.length) break;
    for (const record of result.records) {
      if (!record.inceptionDate) continue;
      const inceptionYear = parseInt(record.inceptionDate.slice(0, 4), 10);
      if (isNaN(inceptionYear) || inceptionYear >= 2024) continue;
      candidates.push({ ...record, category: label });
      if (candidates.length >= maxCandidates) break;
    }
    if (candidates.length >= maxCandidates) break;
    if (!result.records.length || result.records.length < PAGE_SIZE) break;
  }
  return candidates;
}

async function fetchFundNavHistory(code, days) {
  const targetDays = Math.min(days || 360, 520);
  const pageSize = 20;
  const pages = Math.ceil(targetDays / pageSize);
  const history = [];
  try {
    for (let pageIndex = 1; pageIndex <= pages; pageIndex++) {
      const url = 'https://api.fund.eastmoney.com/f10/lsjz?fundCode=' + code + '&pageIndex=' + pageIndex + '&pageSize=' + pageSize;
      let result = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        result = await client.getJson(url, { headers: EASTMONEY_FUND_HEADERS, source: 'market-scan-lsjz', timeout: 12000 });
        if (result && result.ok) break;
        if (attempt < 2) await new Promise(function(r) { setTimeout(r, 1500 * (attempt + 1)); });
      }
      if (!result || !result.ok || !result.data) break;
      const json = result.data;
      if (json.ErrCode !== 0 || !json.Data) break;
      const list = json.Data.LSJZList;
      if (!list || list.length === 0) break;
      for (const item of list) {
        const nav = parseFloat(item.DWJZ) || 0;
        if (item.FSRQ && nav > 0) history.push({ date: item.FSRQ, nav });
        if (history.length >= targetDays) break;
      }
      if (list.length < pageSize || history.length >= targetDays) break;
    }
    if (history.length === 0) return null;
    return history.reverse();
  } catch (e) { return null; }
}

/** Fetch NAV history, trying East Money first then Sina Finance */
async function fetchNavHistoryWithFallback(code, days) {
  const targetDays = Math.min(days || 360, 520);
  // Try East Money first
  const emHistory = await fetchFundNavHistory(code, targetDays);
  if (emHistory && emHistory.length >= 60) return emHistory;
  // Fallback to Sina
  console.log('[marketFundScan] East Money failed for ' + code + ', trying Sina...');
  const sinaHistory = await fetchSinaNavHistory(code, targetDays);
  return sinaHistory;
}

async function analyzeCandidate(candidate, scanDays) {
  const history = await fetchNavHistoryWithFallback(candidate.code, scanDays);
  if (!history || history.length < 60) {
    return { code: candidate.code, name: candidate.name, category: candidate.category, error: 'history too short (' + (history ? history.length : 0) + ' pts)' };
  }
  const analysis = analyzeFundLongTermFromHistory({
    fund: { code: candidate.code, name: candidate.name, cum_nav: null },
    history,
    source: 'eastmoney-lsjz-market-scan',
    historyQuality: { source: 'eastmoney-lsjz', requestedDays: scanDays, returnedPoints: history.length, valid: true, reliable: history.length >= 120, checks: {} },
  });
  const radar = classifyTrendCandidate(analysis);
  return { ...analysis, category: candidate.category, rankReturns: candidate.returns, rankInceptionDate: candidate.inceptionDate, radar };
}

async function analyzeBatch(candidates, scanDays, concurrency) {
  const results = [];
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(function(c) { return analyzeCandidate(c, scanDays); }));
    for (const r of batchResults) { results.push(r.status === 'fulfilled' ? r.value : { error: r.reason ? r.reason.message : 'failed' }); }
    if (i + concurrency < candidates.length) await new Promise(function(r) { setTimeout(r, 500); });
  }
  return results;
}

export async function scanMarketForStrongFunds(options) {
  const opts = options || {};
  const scanDays = Math.min(opts.scanDays || 360, 520);
  const maxPerCategory = Math.min(opts.maxPerCategory || 30, 300);
  const minScore = opts.minScore != null ? opts.minScore : 55;

  const startTime = Date.now();
  const allCandidates = [];
  const categoryStats = {};

  console.log('[marketFundScan] Phase 1: gathering candidates...');
  for (const cat of SCAN_CATEGORIES) {
    const candidates = await fetchCategoryCandidates(cat.ft, cat.label, maxPerCategory);
    categoryStats[cat.label] = candidates.length;
    allCandidates.push(...candidates);
    console.log('[marketFundScan]   ' + cat.label + ': ' + candidates.length);
  }
  console.log('[marketFundScan] Total: ' + allCandidates.length);

  console.log('[marketFundScan] Phase 2: analyzing ' + allCandidates.length + ' funds...');
  const analysisResults = await analyzeBatch(allCandidates, scanDays, CONCURRENCY);

  const errors = [], ranked = [];
  for (const item of analysisResults) {
    if (item.error) { errors.push(item); continue; }
    ranked.push(item);
  }
  ranked.sort(function(a, b) { return (b.radar ? b.radar.strengthScore : 0) - (a.radar ? a.radar.strengthScore : 0); });
  const qualified = ranked.filter(function(item) { return (item.radar ? item.radar.strengthScore : 0) >= minScore; });
  const strong = qualified.filter(function(item) { return item.radar && item.radar.tier === 'strong'; });
  const watch = qualified.filter(function(item) { return item.radar && item.radar.tier === 'watch'; });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('[marketFundScan] Done ' + durationSec + 's. q=' + qualified.length + ' s=' + strong.length + ' w=' + watch.length + ' e=' + errors.length);

  return {
    meta: {
      scanDate: new Date().toISOString(), scanDays, durationSec: parseFloat(durationSec),
      categories: SCAN_CATEGORIES.map(function(c) { return { label: c.label, ft: c.ft }; }),
      candidatesScanned: allCandidates.length, categoryStats,
    },
    summary: {
      totalAnalyzed: ranked.length, qualified: qualified.length, strong: strong.length, watch: watch.length, errors: errors.length,
      averageStrengthScore: ranked.length ? Math.round(ranked.reduce(function(s, r) { return s + (r.radar ? r.radar.strengthScore : 0); }, 0) / ranked.length * 10) / 10 : 0,
      topFund: strong[0] ? strong[0].name + ' (' + strong[0].code + ') - ' + strong[0].radar.strengthScore : null,
    },
    strong, watch, allQualified: qualified, errors: errors.slice(0, 50),
  };
}
