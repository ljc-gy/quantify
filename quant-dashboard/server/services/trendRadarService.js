function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function metricNumber(metrics, key) {
  const value = Number(metrics?.[key]);
  return Number.isFinite(value) ? value : 0;
}

function scoreMomentum(metrics) {
  const oneYear = metricNumber(metrics, 'oneYearReturn');
  const halfYear = metricNumber(metrics, 'halfYearReturn');
  const consistency = metricNumber(metrics, 'trendConsistencyPct');
  const raw = 50 + oneYear * 0.55 + halfYear * 0.35 + (consistency - 55) * 0.45;
  return clamp(raw, 0, 100);
}

function scoreRisk(metrics) {
  const drawdown = Math.abs(metricNumber(metrics, 'drawdownPct'));
  const currentDrawdown = Math.abs(metricNumber(metrics, 'currentDrawdownPct'));
  const volatility = Math.abs(metricNumber(metrics, 'volatilityPct'));
  const penalty = drawdown * 1.25 + currentDrawdown * 0.8 + Math.max(0, volatility - 25) * 0.45;
  return clamp(100 - penalty, 0, 100);
}

function scoreValidation(candidate) {
  const samples = Number(candidate.validation?.samples || 0);
  const hitRate = Number(candidate.validation?.hitRatePct || 0);
  const reliable = candidate.dataQuality?.reliable !== false;
  const sampleScore = clamp(samples * 10, 0, 45);
  const hitScore = hitRate ? clamp((hitRate - 40) * 1.1, 0, 45) : 0;
  return clamp(sampleScore + hitScore + (reliable ? 10 : 0), 0, 100);
}

function buildReasons(candidate, radar) {
  const reasons = [];
  const metrics = candidate.metrics || {};
  if ((candidate.score || 0) >= 70) reasons.push(`score ${candidate.score}，长期结构偏强`);
  if (metricNumber(metrics, 'trendConsistencyPct') >= 70) reasons.push(`趋势一致性 ${round(metricNumber(metrics, 'trendConsistencyPct'))}%`);
  if (metricNumber(metrics, 'oneYearReturn') >= 18) reasons.push(`近一年收益 ${round(metricNumber(metrics, 'oneYearReturn'))}%`);
  if (Math.abs(metricNumber(metrics, 'drawdownPct')) <= 15) reasons.push(`回撤控制在 ${round(metricNumber(metrics, 'drawdownPct'))}% 附近`);
  if (radar.momentumScore >= 75) reasons.push('动量强于观察池平均水平');
  return reasons.slice(0, 4);
}

function buildWarnings(candidate, radar) {
  const warnings = [];
  const metrics = candidate.metrics || {};
  if (candidate.dataQuality?.reliable === false) warnings.push(...(candidate.dataQuality.warnings || ['data quality is not reliable']));
  if (metricNumber(metrics, 'positionPct') >= 88) warnings.push(`当前位置分位偏高：${round(metricNumber(metrics, 'positionPct'))}%`);
  if (Math.abs(metricNumber(metrics, 'drawdownPct')) >= 25) warnings.push(`历史回撤达到 ${round(metricNumber(metrics, 'drawdownPct'))}%`);
  if (radar.riskScore < 55) warnings.push('风险分低于强势候选阈值');
  return Array.from(new Set(warnings)).slice(0, 4);
}

export function classifyTrendCandidate(candidate) {
  const rawScore = clamp(Number(candidate.score || 0), 0, 100);
  const momentumScore = round(scoreMomentum(candidate.metrics || {}));
  const riskScore = round(scoreRisk(candidate.metrics || {}));
  const validationScore = round(scoreValidation(candidate));
  const reliable = candidate.dataQuality?.reliable !== false;
  const strengthScore = round(
    rawScore * 0.45 +
    momentumScore * 0.3 +
    riskScore * 0.15 +
    validationScore * 0.1
  );

  let cappedScore = strengthScore;
  if (!reliable) cappedScore = Math.min(cappedScore, 69);

  const radar = {
    strengthScore: cappedScore,
    rawStrengthScore: strengthScore,
    momentumScore,
    riskScore,
    validationScore,
    tier: 'weak',
    reasons: [],
    warnings: [],
  };

  if (cappedScore >= 72 && rawScore >= 68 && momentumScore >= 65 && riskScore >= 55) {
    radar.tier = 'strong';
  } else if (cappedScore >= 50 || rawScore >= 55) {
    radar.tier = 'watch';
  }

  radar.reasons = buildReasons(candidate, radar);
  radar.warnings = buildWarnings(candidate, radar);
  return radar;
}

export function buildTrendRadar(results = []) {
  const errors = [];
  const ranked = [];

  for (const item of results) {
    if (!item || item.error) {
      if (item) errors.push(item);
      continue;
    }
    const radar = classifyTrendCandidate(item);
    ranked.push({ ...item, radar });
  }

  ranked.sort((a, b) => {
    const radarDiff = b.radar.strengthScore - a.radar.strengthScore;
    if (radarDiff !== 0) return radarDiff;
    return (b.score || 0) - (a.score || 0);
  });

  const strong = ranked.filter(item => item.radar.tier === 'strong');
  const watch = ranked.filter(item => item.radar.tier === 'watch');
  const weak = ranked.filter(item => item.radar.tier === 'weak');

  return {
    summary: {
      total: ranked.length,
      strong: strong.length,
      watch: watch.length,
      weak: weak.length,
      averageStrengthScore: ranked.length
        ? round(ranked.reduce((sum, item) => sum + item.radar.strengthScore, 0) / ranked.length)
        : 0,
    },
    results: ranked,
    strong,
    watch,
    weak,
    errors,
  };
}
