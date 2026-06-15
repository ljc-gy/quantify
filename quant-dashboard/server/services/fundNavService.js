/**
 * East Money fund NAV & info fetching service.
 * Uses fundgz API for real-time NAV + name, and historical API for confirmed NAV.
 */

import { eastMoneyClient } from './eastmoneyClient.js';

const EASTMONEY_FUND_HEADERS = {
  Referer: 'https://fund.eastmoney.com/',
  'User-Agent': 'Mozilla/5.0',
};

async function fetchEastMoneyJson(url, options = {}) {
  const result = await eastMoneyClient.getJson(url, {
    headers: EASTMONEY_FUND_HEADERS,
    source: options.source || 'eastmoney-fund',
    timeout: options.timeout,
  });
  return result.ok ? result.data : null;
}

async function fetchEastMoneyText(url, timeout = 8000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: EASTMONEY_FUND_HEADERS,
  });
  if (!res.ok) return null;
  return res.text();
}

/**
 * Infer fund type from fund name keywords
 * @param {string} name
 * @returns {string}
 */
function inferFundType(name) {
  if (!name) return '混合型基金';
  if (/债券|债/.test(name)) return '债券型基金';
  if (/货币|货基/.test(name)) return '货币型基金';
  if (/指数/.test(name)) return '指数型基金';
  if (/ETF/.test(name)) return 'ETF基金';
  if (/QDII/.test(name)) return 'QDII基金';
  if (/FOF/.test(name)) return 'FOF基金';
  if (/混合/.test(name)) return '混合型基金';
  if (/股票/.test(name)) return '股票型基金';
  return '混合型基金';
}

function isValidFundDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp);
}

/**
 * Validate a NAV history before it is used by long-term scoring.
 * @param {Array<{date: string, nav: number}>} history
 * @param {number} requestedDays
 * @returns {{source: string, requestedDays: number, returnedPoints: number, valid: boolean, reliable: boolean, checks: object, warnings: string[]}}
 */
export function validateFundHistory(history = [], requestedDays = 0) {
  const rows = Array.isArray(history) ? history : [];
  const requested = Math.max(0, Number(requestedDays) || 0);
  const checks = {
    invalidRows: 0,
    duplicateDates: 0,
    outOfOrderRows: 0,
    abnormalMoves: 0,
  };
  const warnings = [];
  const seenDates = new Set();
  let lastDate = null;
  let lastNav = null;

  for (const row of rows) {
    const date = row?.date;
    const nav = Number(row?.nav);
    if (!isValidFundDate(date) || !Number.isFinite(nav) || nav <= 0) {
      checks.invalidRows += 1;
      continue;
    }
    if (seenDates.has(date)) checks.duplicateDates += 1;
    seenDates.add(date);
    if (lastDate && date < lastDate) checks.outOfOrderRows += 1;
    if (lastNav && lastNav > 0) {
      const movePct = Math.abs(((nav - lastNav) / lastNav) * 100);
      if (movePct > 25) checks.abnormalMoves += 1;
    }
    lastDate = date;
    lastNav = nav;
  }

  if (!rows.length) warnings.push('基金历史净值为空，不能用于长期研判');
  if (checks.invalidRows) warnings.push(`存在${checks.invalidRows}条无效净值或日期`);
  if (checks.duplicateDates) warnings.push(`存在${checks.duplicateDates}个重复净值日期`);
  if (checks.outOfOrderRows) warnings.push(`存在${checks.outOfOrderRows}处日期倒序或错序`);
  if (checks.abnormalMoves) warnings.push(`存在${checks.abnormalMoves}处单日净值异常跳变，需要人工复核是否分红或拆分`);
  if (requested >= 120 && rows.length < 120) warnings.push('长期研判至少需要约120个交易日净值，当前样本不足');
  if (requested > 0 && rows.length < Math.min(requested, 120)) warnings.push(`东财返回${rows.length}条，少于请求的${requested}条`);

  const severeIssue = checks.invalidRows > 0 || checks.duplicateDates > 0 || checks.outOfOrderRows > 0;
  const valid = rows.length > 0 && !severeIssue && !(requested >= 120 && rows.length < 120);
  const reliable = valid && (requested < 120 || rows.length >= 120);

  return {
    source: 'eastmoney-lsjz',
    requestedDays: requested,
    returnedPoints: rows.length,
    valid,
    reliable,
    checks,
    warnings,
  };
}

/**
 * Resolve fund code to { name, type } using East Money fundgz API
 * @param {string} code - 6-digit fund code
 * @returns {{ name: string, type: string } | null}
 */
export async function resolveFund(code) {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js`;
  try {
    const text = await fetchEastMoneyText(url);
    if (!text) return null;
    // Response: jsonpgz({"fundcode":"001665","name":"平安鑫安混合C",...});
    const match = text.match(/"name":"([^"]+)"/);
    if (!match) return null;
    const name = match[1];
    const type = inferFundType(name);
    return { name, type };
  } catch (e) {
    console.error(`[fundNavService] resolve failed for ${code}:`, e.message);
    return null;
  }
}

/**
 * Fetch fund NAV from East Money history API (confirmed unit NAV)
 * @param {string} code - 6-digit fund code
 * @returns {{ nav: number, date: string, name: string, dailyReturn: number } | null}
 */
export async function fetchFundNav(code) {
  // First get the name from fundgz API
  let fundName = null;
  const gzUrl = `https://fundgz.1234567.com.cn/js/${code}.js`;
  try {
    const gzText = await fetchEastMoneyText(gzUrl);
    if (gzText) {
      const nameMatch = gzText.match(/"name":"([^"]+)"/);
      if (nameMatch) fundName = nameMatch[1];
    }
  } catch (_) { /* non-critical */ }

  // Fetch confirmed NAV from history API
  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`;
  try {
    const json = await fetchEastMoneyJson(url, { source: 'eastmoney-lsjz', timeout: 8000 });
    if (!json) return null;
    if (json.ErrCode !== 0 || !json.Data) return null;
    const list = json.Data.LSJZList;
    if (!list || list.length === 0) return null;
    const latest = list[0];
    const nav = parseFloat(latest.DWJZ);
    const date = latest.FSRQ || '';
    if (isNaN(nav) || nav <= 0) return null;
    const jzzzl = parseFloat(latest.JZZZL) || 0;
    return { nav, date, name: fundName, dailyReturn: jzzzl };
  } catch (e) {
    console.error(`[fundNavService] fetch failed for ${code}:`, e.message);
    return null;
  }
}

/**
 * Batch fetch NAV for multiple fund codes.
 * @param {string[]} codes
 * @returns {Promise<Map<string, {nav:number, date:string, name:string}>>}
 */
export async function fetchAllFundNav(codes) {
  const results = new Map();
  const promises = codes.map(async (code) => {
    const data = await fetchFundNav(code);
    if (data) results.set(code, data);
  });
  await Promise.allSettled(promises);
  return results;
}

/**
 * Fetch fund NAV history from East Money.
 * @param {string} code - 6-digit fund code
 * @param {number} days - number of records to fetch (default 60)
 * @returns {{ history: Array<{date: string, nav: number}>, name: string } | null}
 */
export async function fetchFundHistory(code, days = 60) {
  let fundName = null;
  try {
    const gzText = await fetchEastMoneyText(`https://fundgz.1234567.com.cn/js/${code}.js`, 5000);
    if (gzText) {
      const nameMatch = gzText.match(/"name":"([^"]+)"/);
      if (nameMatch) fundName = nameMatch[1];
    }
  } catch (_) { /* non-critical */ }

  const targetDays = Math.max(1, Math.min(Number(days) || 60, 520));
  const pageSize = 20;
  const pages = Math.ceil(targetDays / pageSize);
  const history = [];

  try {
    for (let pageIndex = 1; pageIndex <= pages; pageIndex++) {
      const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=${pageIndex}&pageSize=${pageSize}`;
      const json = await fetchEastMoneyJson(url, { source: 'eastmoney-lsjz-history', timeout: 10000 });
      if (!json) break;
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
    const normalizedHistory = history.slice(0, targetDays).reverse();
    return {
      history: normalizedHistory,
      name: fundName,
      dataQuality: validateFundHistory(normalizedHistory, targetDays),
    };
  } catch (e) {
    console.error(`[fundNavService] history fetch failed for ${code}:`, e.message);
    return null;
  }
}


/**
 * Build aggregated portfolio NAV trend by fetching NAV history for all funds.
 * Returns daily portfolio values: each fund's shares * NAV at each date, summed.
 * @param {Array} funds - array of fund objects with { id, code, shares }
 * @param {number} days - number of history days to fetch per fund (default 60)
 * @returns { dates: string[], values: number[] }
 */
export async function buildPortfolioTrend(funds, days) {
  const limit = days || 60;
  const dateMap = {};

  const promises = funds.map(async (fund) => {
    if (!fund.code || !fund.shares) return;

    try {
      const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${fund.code}&pageIndex=1&pageSize=${limit}`;
      const json = await fetchEastMoneyJson(url, { source: 'eastmoney-lsjz-trend', timeout: 10000 });
      if (!json) return;
      if (json.ErrCode !== 0 || !json.Data || !json.Data.LSJZList) return;

      for (const item of json.Data.LSJZList) {
        const date = item.FSRQ || '';
        const nav = parseFloat(item.DWJZ) || 0;
        if (!date || nav <= 0) continue;
        const value = nav * fund.shares;
        if (!dateMap[date]) dateMap[date] = 0;
        dateMap[date] += value;
      }
    } catch (e) {
      console.error(`[buildPortfolioTrend] failed for ${fund.code}: ${e.message}`);
    }
  });

  await Promise.allSettled(promises);

  const dates = Object.keys(dateMap).sort();
  return {
    dates,
    values: dates.map(d => dateMap[d]),
  };
}
