import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { normalizeStockCode } from './marketDataService.js';

const execFileAsync = promisify(execFile);
const EASTMONEY_COMPANY_HEADERS = {
  Referer: 'https://quote.eastmoney.com',
  'User-Agent': 'Mozilla/5.0',
};
const TENCENT_QUOTE_HEADERS = {
  Referer: 'https://stockapp.finance.qq.com/',
  'User-Agent': 'Mozilla/5.0',
};

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scaled(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0 || n === -1) return null;
  return n / 100;
}

function rawNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function marketPrefix(code) {
  return String(code).startsWith('6') ? '1' : '0';
}

function hasValuation(snapshot) {
  return Number.isFinite(snapshot.peDynamic) || Number.isFinite(snapshot.peTtm) || Number.isFinite(snapshot.pb);
}

function buildLevel(score) {
  if (score >= 70) return '稳健';
  if (score >= 55) return '正常';
  if (score >= 40) return '偏弱';
  return '高风险';
}

function formatMarketCap(value) {
  if (!Number.isFinite(value) || value <= 0) return '未知';
  return `${round(value / 100000000)}亿`;
}

export function analyzeCompanyHealthFromSnapshot(snapshot = {}) {
  const code = normalizeStockCode(snapshot.code);
  const name = snapshot.name || code;
  const marketCap = rawNumber(snapshot.marketCap);
  const floatMarketCap = rawNumber(snapshot.floatMarketCap);
  const pe = Number.isFinite(snapshot.peTtm) ? snapshot.peTtm : snapshot.peDynamic;
  const pb = Number.isFinite(snapshot.pb) ? snapshot.pb : null;
  const turnoverRate = Number.isFinite(snapshot.turnoverRate) ? snapshot.turnoverRate : null;
  const volumeRatio = Number.isFinite(snapshot.volumeRatio) ? snapshot.volumeRatio : null;
  const changePct = Number.isFinite(snapshot.changePct) ? snapshot.changePct : null;
  const source = snapshot.source || 'unknown';

  let score = 50;
  const reasons = [];
  const risks = [];

  if (marketCap) {
    if (marketCap >= 50_000_000_000) {
      score += 8;
      reasons.push('公司市值体量较大，长期持有的流动性和抗冲击能力相对更好');
    } else if (marketCap >= 10_000_000_000) {
      score += 4;
      reasons.push('公司市值处于中等以上，交易流动性通常较可控');
    } else if (marketCap < 3_000_000_000) {
      score -= 8;
      risks.push('公司市值偏小，长期波动和流动性风险更高');
    }
  } else {
    risks.push('缺少市值数据，无法判断公司体量和流动性基础');
  }

  if (Number.isFinite(pe)) {
    if (pe <= 0) {
      score -= 12;
      risks.push('市盈率为负或不可用，通常意味着当前盈利承压');
    } else if (pe <= 20) {
      score += 6;
      reasons.push('估值水平不高，长期持有的估值压力相对较小');
    } else if (pe <= 45) {
      score += 2;
      reasons.push('估值处于可观察区间，需要结合行业增速判断');
    } else if (pe > 80) {
      score -= 10;
      risks.push('市盈率很高，长期收益更依赖后续业绩兑现');
    } else {
      score -= 4;
      risks.push('估值偏高，需要确认业绩增长能否支撑');
    }
  } else {
    score -= 4;
    risks.push('缺少估值数据，不能判断盈利和价格是否匹配');
  }

  if (Number.isFinite(pb)) {
    if (pb > 0 && pb <= 2) {
      score += 4;
      reasons.push('市净率较温和，资产估值压力不算高');
    } else if (pb >= 8) {
      score -= 6;
      risks.push('市净率偏高，市场已经给了较强预期');
    }
  }

  if (Number.isFinite(turnoverRate)) {
    if (turnoverRate >= 12) {
      score -= 6;
      risks.push('换手率过高，短期资金博弈较重');
    } else if (turnoverRate >= 2 && turnoverRate <= 8) {
      score += 3;
      reasons.push('换手率适中，交易活跃但不过度拥挤');
    }
  }

  if (Number.isFinite(volumeRatio) && volumeRatio >= 3) {
    score -= 3;
    risks.push('量比明显放大，短期情绪扰动偏强');
  }
  if (Number.isFinite(changePct) && changePct <= -5) {
    score -= 4;
    risks.push('当日跌幅较大，需要确认是否有基本面或消息面冲击');
  }

  const enoughFields = Boolean(marketCap) && hasValuation({ peDynamic: snapshot.peDynamic, peTtm: snapshot.peTtm, pb });
  const sourceReliable = source === 'eastmoney-company' || source === 'tencent-quote';
  const reliable = sourceReliable && enoughFields;
  if (!reliable) score = Math.min(score, 55);

  const finalScore = clamp(Math.round(score), 0, 100);
  const level = buildLevel(finalScore);
  const confidenceLevel = reliable ? '中' : '低';
  const firstSignal = reasons[0] || risks[0] || '公司基础数据不完整，先保持观察';

  return {
    code,
    name,
    score: finalScore,
    level,
    summary: `${name} 公司状态${level}，市值约${formatMarketCap(marketCap)}。${firstSignal}`,
    metrics: {
      marketCap,
      floatMarketCap,
      pe,
      peDynamic: Number.isFinite(snapshot.peDynamic) ? round(snapshot.peDynamic) : null,
      peTtm: Number.isFinite(snapshot.peTtm) ? round(snapshot.peTtm) : null,
      pb: Number.isFinite(pb) ? round(pb) : null,
      turnoverRate: Number.isFinite(turnoverRate) ? round(turnoverRate) : null,
      volumeRatio: Number.isFinite(volumeRatio) ? round(volumeRatio) : null,
      changePct: Number.isFinite(changePct) ? round(changePct) : null,
    },
    reasons: reasons.slice(0, 4),
    risks: risks.slice(0, 4),
    confidence: {
      level: confidenceLevel,
      notes: reliable
        ? ['基于东财行情快照、估值、市值和交易活跃度，只能作为基础画像']
        : ['公司估值或市值字段不足，先降低置信度；后续可接入财报营收、利润和现金流'],
    },
    dataQuality: {
      source,
      reliable,
      warnings: reliable ? [] : ['公司基础字段不足，不能作为完整基本面结论'],
    },
  };
}

export function parseEastMoneyCompanySnapshot(code, d = {}) {
  const normalizedCode = normalizeStockCode(code || d.f57);
  return {
    code: normalizedCode,
    name: d.f58 || d.f57 || normalizedCode,
    price: scaled(d.f43),
    changePct: scaled(d.f170),
    marketCap: rawNumber(d.f116),
    floatMarketCap: rawNumber(d.f117),
    peDynamic: scaled(d.f162),
    peTtm: scaled(d.f164),
    pb: scaled(d.f167),
    turnoverRate: scaled(d.f168),
    volumeRatio: scaled(d.f50),
    source: 'eastmoney-company',
  };
}

export function parseTencentCompanySnapshot(code, fields = []) {
  const normalizedCode = normalizeStockCode(code || fields[2]);
  const marketCapYi = numberOrNull(fields[45]);
  const floatMarketCapYi = numberOrNull(fields[44]);
  return {
    code: normalizedCode,
    name: fields[1] || normalizedCode,
    price: numberOrNull(fields[3]),
    changePct: numberOrNull(fields[32]),
    marketCap: marketCapYi ? marketCapYi * 100000000 : null,
    floatMarketCap: floatMarketCapYi ? floatMarketCapYi * 100000000 : null,
    peDynamic: numberOrNull(fields[52]),
    peTtm: numberOrNull(fields[39]),
    pb: numberOrNull(fields[46]),
    turnoverRate: numberOrNull(fields[38]),
    volumeRatio: numberOrNull(fields[49]),
    source: 'tencent-quote',
  };
}

async function fetchJsonWithCurl(url) {
  const args = [
    '-L',
    '-sS',
    '--max-time',
    '10',
    '-A',
    EASTMONEY_COMPANY_HEADERS['User-Agent'],
    '-e',
    EASTMONEY_COMPANY_HEADERS.Referer,
    url,
  ];
  const { stdout } = await execFileAsync('curl.exe', args, { timeout: 12000, windowsHide: true });
  if (!stdout) throw new Error('Empty response from curl fallback');
  return JSON.parse(stdout);
}

async function fetchTencentSnapshot(code) {
  const normalizedCode = normalizeStockCode(code);
  const symbol = `${normalizedCode.startsWith('6') ? 'sh' : 'sz'}${normalizedCode}`;
  const url = `https://qt.gtimg.cn/q=${symbol}`;
  const response = await fetch(url, {
    headers: TENCENT_QUOTE_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  const buffer = await response.arrayBuffer();
  let text;
  try {
    text = new TextDecoder('gbk').decode(buffer);
  } catch (_) {
    text = new TextDecoder('utf-8').decode(buffer);
  }
  const match = text.match(/="([^"]*)";?/);
  if (!match) throw new Error('No company snapshot from Tencent quote');
  return parseTencentCompanySnapshot(normalizedCode, match[1].split('~'));
}

export async function fetchCompanySnapshot(code) {
  const normalizedCode = normalizeStockCode(code);
  const secid = `${marketPrefix(normalizedCode)}.${normalizedCode}`;
  const fields = [
    'f43', 'f57', 'f58', 'f116', 'f117', 'f162', 'f164',
    'f167', 'f168', 'f170', 'f50',
  ].join(',');
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${fields}`;
  let json;
  try {
    const response = await fetch(url, {
      headers: EASTMONEY_COMPANY_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    json = await response.json();
  } catch (err) {
    try {
      json = await fetchJsonWithCurl(url);
    } catch (_) {
      return fetchTencentSnapshot(normalizedCode);
    }
  }
  const d = json?.data;
  if (!d) throw new Error('No company snapshot from East Money');
  return parseEastMoneyCompanySnapshot(normalizedCode, d);
}

export async function analyzeCompanyHealth(code) {
  const snapshot = await fetchCompanySnapshot(code);
  return analyzeCompanyHealthFromSnapshot(snapshot);
}
