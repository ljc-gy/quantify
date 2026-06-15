import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrendRadar } from '../services/trendRadarService.js';

const baseMetrics = {
  oneYearReturn: 18,
  halfYearReturn: 9,
  drawdownPct: -14,
  currentDrawdownPct: -3,
  trendConsistencyPct: 72,
  positionPct: 64,
};

function candidate(overrides = {}) {
  return {
    type: 'fund',
    code: '001234',
    name: 'Test Fund',
    score: 68,
    action: 'observe',
    metrics: { ...baseMetrics },
    dataQuality: { reliable: true, warnings: [] },
    confidence: { level: 'medium', notes: [] },
    validation: { samples: 5, hitRatePct: 60 },
    ...overrides,
    metrics: { ...baseMetrics, ...(overrides.metrics || {}) },
  };
}

describe('trend radar ranking', () => {
  it('promotes reliable high-score trends with momentum and controlled drawdown', () => {
    const radar = buildTrendRadar([
      candidate({ code: 'A', score: 78, metrics: { oneYearReturn: 36, trendConsistencyPct: 86, drawdownPct: -10 } }),
      candidate({ code: 'B', score: 62, metrics: { oneYearReturn: 12, trendConsistencyPct: 61, drawdownPct: -16 } }),
      candidate({ code: 'C', score: 38, metrics: { oneYearReturn: -18, trendConsistencyPct: 24, drawdownPct: -35 } }),
    ]);

    assert.equal(radar.summary.total, 3);
    assert.equal(radar.summary.strong, 1);
    assert.equal(radar.summary.watch, 1);
    assert.equal(radar.summary.weak, 1);
    assert.equal(radar.strong[0].code, 'A');
    assert.equal(radar.strong[0].radar.tier, 'strong');
    assert.ok(radar.strong[0].radar.strengthScore >= 75);
    assert.ok(radar.strong[0].radar.reasons.some(reason => reason.includes('长期结构')));
  });

  it('caps unreliable candidates even when their raw score is high', () => {
    const radar = buildTrendRadar([
      candidate({
        code: 'LOWQ',
        score: 82,
        dataQuality: { reliable: false, warnings: ['short history'] },
        metrics: { oneYearReturn: 40, trendConsistencyPct: 90, drawdownPct: -8 },
      }),
    ]);

    assert.equal(radar.summary.strong, 0);
    assert.equal(radar.watch[0].code, 'LOWQ');
    assert.equal(radar.watch[0].radar.tier, 'watch');
    assert.ok(radar.watch[0].radar.warnings.some(warning => warning.includes('short history')));
  });

  it('ignores errored analyses and sorts by radar strength before raw score', () => {
    const radar = buildTrendRadar([
      { code: 'ERR', error: 'network failed' },
      candidate({ code: 'RAW', score: 76, metrics: { oneYearReturn: 8, trendConsistencyPct: 52, drawdownPct: -20 } }),
      candidate({ code: 'RADAR', score: 72, metrics: { oneYearReturn: 24, trendConsistencyPct: 82, drawdownPct: -9 } }),
    ]);

    assert.equal(radar.summary.total, 2);
    assert.deepEqual(radar.results.map(item => item.code), ['RADAR', 'RAW']);
    assert.equal(radar.errors.length, 1);
    assert.equal(radar.errors[0].code, 'ERR');
  });
});
