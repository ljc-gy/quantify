import { fetchKline } from './klineService.js';
import { fetchFundHistory } from './fundNavService.js';

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function movingAverage(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, n) => sum + n, 0) / period;
}

function pctChange(current, previous) {
  if (!previous || previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

function maxDrawdownPct(values) {
  let peak = values[0] || 0;
  let maxDd = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const dd = ((value - peak) / peak) * 100;
      if (dd < maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

function volatilityPct(values) {
  if (values.length < 3) return 0;
  const returns = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  if (!returns.length) return 0;
  const avg = returns.reduce((sum, n) => sum + n, 0) / returns.length;
  const variance = returns.reduce((sum, n) => sum + (n - avg) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function percentilePosition(values, current) {
  if (!values.length) return 50;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;
  return ((current - min) / (max - min)) * 100;
}

function currentDrawdownPct(values) {
  if (!values.length) return 0;
  const peak = Math.max(...values);
  const latest = values[values.length - 1];
  if (peak <= 0) return 0;
  return ((latest - peak) / peak) * 100;
}

function recoveryBars(values) {
  if (values.length < 2) return 0;
  const latest = values[values.length - 1];
  let lastPeakIndex = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] >= values[lastPeakIndex]) lastPeakIndex = i;
  }
  if (lastPeakIndex === values.length - 1) return 0;

  const peak = values[lastPeakIndex];
  const recovered = peak > 0 && latest >= peak * 0.97;
  return recovered ? values.length - 1 - lastPeakIndex : values.length - 1 - lastPeakIndex;
}

function trendConsistencyPct(values, maPeriod = 60) {
  if (values.length < maPeriod + 20) return 0;
  let above = 0;
  let total = 0;
  for (let i = maPeriod - 1; i < values.length; i++) {
    const ma = values.slice(i - maPeriod + 1, i + 1).reduce((sum, n) => sum + n, 0) / maPeriod;
    if (values[i] > ma) above++;
    total++;
  }
  return total ? (above / total) * 100 : 0;
}

function isLowQualitySource(source) {
  return source === 'fallback' || source === 'snapshot';
}

function buildConfidence({ points, source, validation, dataReliable }) {
  const notes = [];
  let level = '中';
  if (!dataReliable || points < 120 || isLowQualitySource(source)) {
    level = '低';
    notes.push('历史数据不足或来自快照，适合观察，不适合单独做决策');
  } else if (points >= 240 && validation.samples >= 6 && validation.hitRatePct >= 55) {
    level = '高';
    notes.push('样本数量和滚动验证表现相对更稳');
  } else {
    notes.push('数据满足基础判断，但仍需结合估值、行业和仓位');
  }
  if (validation.samples < 4) notes.push('滚动验证样本少，方向参考价值有限');
  return { level, notes };
}

function scoreCeiling({ points, source, validation, dataReliable }) {
  if (!dataReliable || points < 120 || isLowQualitySource(source)) return 60;
  if (points < 240 || validation.samples < 4) return 85;
  return 95;
}

function analyzeValidation(values, { lookback = 120, forward = 20, step = 20 } = {}) {
  const trades = [];
  if (values.length < lookback + forward) {
    return { samples: 0, hitRatePct: 0, avgForwardReturnPct: 0, avgForwardDrawdownPct: 0 };
  }

  for (let start = 0; start + lookback + forward <= values.length; start += step) {
    const window = values.slice(start, start + lookback);
    const future = values.slice(start + lookback - 1, start + lookback + forward);
    const latest = window[window.length - 1];
    const ma60 = movingAverage(window, 60);
    const ma120 = movingAverage(window, 120);
    const windowDrawdown = maxDrawdownPct(window);
    const signal = ma60 && ma120 && latest > ma60 && latest > ma120 && windowDrawdown > -35;
    if (!signal) continue;

    const end = future[future.length - 1];
    trades.push({
      returnPct: pctChange(end, latest),
      drawdownPct: maxDrawdownPct(future),
    });
  }

  if (!trades.length) {
    return { samples: 0, hitRatePct: 0, avgForwardReturnPct: 0, avgForwardDrawdownPct: 0 };
  }
  const hitRate = trades.filter(t => t.returnPct > 0).length / trades.length * 100;
  const avgReturn = trades.reduce((sum, t) => sum + t.returnPct, 0) / trades.length;
  const avgDrawdown = trades.reduce((sum, t) => sum + t.drawdownPct, 0) / trades.length;
  return {
    samples: trades.length,
    hitRatePct: round(hitRate),
    avgForwardReturnPct: round(avgReturn),
    avgForwardDrawdownPct: round(avgDrawdown),
  };
}

function buildAction(score, dataReliable) {
  if (!dataReliable) return score >= 58 ? '观察' : '谨慎';
  if (score >= 70) return '持有';
  if (score >= 55) return '观察';
  if (score >= 40) return '谨慎';
  return '回避';
}

function buildDataQuality(points, source = 'market', historyQuality = null) {
  const warnings = [];
  if (points < 120) warnings.push('历史数据少于120个交易点，长期判断可信度偏低');
  if (source === 'fallback') warnings.push('当前包含兜底数据，不能作为严格交易依据');
  if (source === 'snapshot') warnings.push('当前使用本地快照净值，不是完整市场历史数据');
  if (historyQuality?.valid === false) warnings.push('历史净值校验未通过，长期结论只能作为观察');
  if (Array.isArray(historyQuality?.warnings)) warnings.push(...historyQuality.warnings);
  const uniqueWarnings = Array.from(new Set(warnings));
  const sourceReliable = !isLowQualitySource(source);
  const historyReliable = historyQuality ? historyQuality.reliable !== false && historyQuality.valid !== false : true;
  return {
    points,
    source,
    reliable: points >= 120 && sourceReliable && historyReliable,
    warnings: uniqueWarnings,
    historyQuality: historyQuality ? {
      requestedDays: historyQuality.requestedDays,
      returnedPoints: historyQuality.returnedPoints,
      valid: historyQuality.valid,
      reliable: historyQuality.reliable,
      checks: historyQuality.checks,
    } : null,
  };
}

function analyzeSeries({ type, code, name, values, costBasis = null, source = 'market', historyQuality = null }) {
  const points = values.length;
  const dataQuality = buildDataQuality(points, source, historyQuality);
  if (!points) {
    return {
      type,
      code,
      name: name || code,
      score: 0,
      action: '谨慎',
      summary: `${name || code} 暂无足够历史数据，先不要依赖系统结论。`,
      metrics: {},
      reasons: [],
      risks: ['缺少历史序列'],
      dataQuality,
    };
  }

  const latest = values[values.length - 1];
  const ma20 = movingAverage(values, 20);
  const ma60 = movingAverage(values, 60);
  const ma120 = movingAverage(values, 120);
  const ma240 = movingAverage(values, 240);
  const first = values[0];
  const oneYearBase = values[Math.max(0, values.length - 240)] || first;
  const halfYearBase = values[Math.max(0, values.length - 120)] || first;
  const oneYearReturn = pctChange(latest, oneYearBase);
  const halfYearReturn = pctChange(latest, halfYearBase);
  const drawdown = maxDrawdownPct(values);
  const currentDrawdown = currentDrawdownPct(values);
  const vol = volatilityPct(values);
  const position = percentilePosition(values, latest);
  const costGapPct = costBasis ? pctChange(latest, costBasis) : null;
  const consistency = trendConsistencyPct(values);
  const recovery = recoveryBars(values);
  const validation = analyzeValidation(values);

  let score = 50;
  const reasons = [];
  const risks = [];

  if (ma60 && latest > ma60) { score += 10; reasons.push('价格站在60周期均线上方，中期趋势没有走坏'); }
  else if (ma60) { score -= 10; risks.push('价格低于60周期均线，中期趋势偏弱'); }

  if (ma120 && latest > ma120) { score += 12; reasons.push('价格站在120周期均线上方，长期趋势偏强'); }
  else if (ma120) { score -= 12; risks.push('价格低于120周期均线，长期趋势需要修复'); }

  if (ma240 && latest > ma240) { score += 8; reasons.push('价格仍在年线之上，长期资金结构较稳'); }
  else if (ma240) { score -= 8; risks.push('价格低于年线，长期持有体验可能较差'); }

  if (oneYearReturn > 20) { score += 10; reasons.push(`近一年涨幅约${round(oneYearReturn)}%，趋势延续性较好`); }
  else if (oneYearReturn < -15) { score -= 12; risks.push(`近一年跌幅约${round(Math.abs(oneYearReturn))}%，需要控制仓位`); }

  if (halfYearReturn > 8) score += 5;
  if (halfYearReturn < -8) score -= 6;

  if (drawdown > -12) { score += 6; reasons.push('最大回撤较温和，长期波动压力不大'); }
  else if (drawdown < -30) { score -= 12; risks.push(`历史最大回撤约${round(Math.abs(drawdown))}%，波动承受要求高`); }
  else if (drawdown < -20) { score -= 6; risks.push(`历史最大回撤约${round(Math.abs(drawdown))}%，需要分批和止损纪律`); }

  if (position > 85) risks.push('当前位置接近历史高位，追高性价比一般');
  if (position < 25) reasons.push('当前位置处于历史偏低区域，适合继续观察修复信号');

  if (consistency >= 70) { score += 6; reasons.push(`近阶段约${round(consistency)}%时间站在60周期均线上方，趋势一致性较好`); }
  else if (consistency > 0 && consistency < 45) { score -= 8; risks.push('价格频繁跌破60周期均线，趋势不够顺滑'); }

  if (currentDrawdown < -12) { score -= 5; risks.push(`当前距离阶段高点回撤约${round(Math.abs(currentDrawdown))}%`); }
  if (validation.samples >= 4 && validation.hitRatePct < 45) { score -= 6; risks.push('滚动验证样本表现偏弱，当前信号需要打折'); }
  if (validation.samples >= 4 && validation.hitRatePct >= 60 && validation.avgForwardReturnPct > 0) {
    score += 4;
    reasons.push(`滚动验证${validation.samples}个样本中胜率约${validation.hitRatePct}%`);
  }

  if (costGapPct !== null) {
    if (costGapPct > 8) reasons.push(`当前价格高于持仓成本约${round(costGapPct)}%，持仓有安全垫`);
    if (costGapPct < -8) risks.push(`当前价格低于持仓成本约${round(Math.abs(costGapPct))}%，需要复盘买入逻辑`);
  }

  if (!dataQuality.reliable) score = Math.min(score, 60);
  score = Math.min(score, scoreCeiling({ points, source, validation, dataReliable: dataQuality.reliable }));
  score = clamp(Math.round(score), 0, 100);
  const action = buildAction(score, dataQuality.reliable);
  const label = name || code;
  const confidence = buildConfidence({ points, source, validation, dataReliable: dataQuality.reliable });

  return {
    type,
    code,
    name: label,
    score,
    action,
    summary: `${label} 长期评分 ${score}，建议：${action}。${reasons[0] || risks[0] || '目前信号不够明确，适合继续跟踪。'}`,
    metrics: {
      latest: round(latest, type === 'fund' ? 4 : 2),
      ma20: round(ma20),
      ma60: round(ma60),
      ma120: round(ma120),
      ma240: round(ma240),
      halfYearReturn: round(halfYearReturn),
      oneYearReturn: round(oneYearReturn),
      drawdownPct: round(drawdown),
      currentDrawdownPct: round(currentDrawdown),
      volatilityPct: round(vol),
      positionPct: round(position),
      trendConsistencyPct: round(consistency),
      recoveryBars: recovery,
      costGapPct: costGapPct === null ? null : round(costGapPct),
    },
    reasons: reasons.slice(0, 4),
    risks: risks.slice(0, 4),
    dataQuality,
    confidence,
    validation,
  };
}

export function analyzeStockLongTermFromBars({ code, name, bars, source = 'market' }) {
  const values = (bars || []).map(b => Number(b.close)).filter(v => Number.isFinite(v) && v > 0);
  return analyzeSeries({ type: 'stock', code, name, values, source });
}

export function analyzeFundLongTermFromHistory({ fund, history, source = 'market', historyQuality = null }) {
  const values = (history || []).map(h => Number(h.nav)).filter(v => Number.isFinite(v) && v > 0);
  return analyzeSeries({
    type: 'fund',
    code: fund.code,
    name: fund.name,
    values,
    costBasis: Number(fund.cum_nav) || null,
    source: historyQuality?.source || source,
    historyQuality,
  });
}

export function fundHistoryFromSnapshots(snapshots = []) {
  const byDate = new Map();
  for (const snapshot of snapshots) {
    const date = snapshot.recorded_at || snapshot.date;
    const nav = Number(snapshot.nav);
    if (!date || !Number.isFinite(nav) || nav <= 0) continue;
    byDate.set(date, { date, nav });
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function analyzeStockLongTerm(code, options = {}) {
  const limit = options.limit || 360;
  const period = options.period || 'day';
  const bars = await fetchKline(code, period, limit);
  return analyzeStockLongTermFromBars({ code, bars, source: 'market' });
}

export async function analyzeFundLongTerm(fund, options = {}) {
  const days = Math.min(options.days || 360, 360);
  const data = await fetchFundHistory(fund.code, days);
  return analyzeFundLongTermFromHistory({
    fund,
    history: data?.history || [],
    source: data?.dataQuality?.source || 'eastmoney-lsjz',
    historyQuality: data?.dataQuality || null,
  });
}
