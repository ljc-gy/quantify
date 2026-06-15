import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeFundLongTermFromHistory,
  analyzeStockLongTermFromBars,
  fundHistoryFromSnapshots,
} from '../services/longTermAnalysisService.js';

function makeBars(count, priceAt) {
  return Array.from({ length: count }, (_, i) => {
    const close = Number(priceAt(i).toFixed(2));
    return {
      date: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      open: close * 0.99,
      close,
      high: close * 1.02,
      low: close * 0.98,
      volume: 1000000 + i * 1000,
    };
  });
}

function makeFundHistory(count, navAt) {
  return Array.from({ length: count }, (_, i) => ({
    date: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    nav: Number(navAt(i).toFixed(4)),
  }));
}

describe('long-term stock analysis', () => {
  it('rates a durable uptrend as a positive long-term holding', () => {
    const bars = makeBars(260, i => 10 + i * 0.08);

    const result = analyzeStockLongTermFromBars({ code: '600519', bars });

    assert.equal(result.type, 'stock');
    assert.equal(result.dataQuality.reliable, true);
    assert.ok(result.score >= 70);
    assert.equal(result.action, '持有');
    assert.ok(result.metrics.oneYearReturn > 50);
    assert.ok(result.reasons.length >= 3);
  });

  it('flags a persistent downtrend with deep drawdown as weak', () => {
    const bars = makeBars(260, i => 80 - i * 0.18);

    const result = analyzeStockLongTermFromBars({ code: '300750', bars });

    assert.ok(result.score <= 45);
    assert.notEqual(result.action, '持有');
    assert.ok(result.metrics.drawdownPct < -40);
    assert.ok(result.risks.length >= 1);
  });

  it('marks short histories as lower-confidence instead of over-scoring them', () => {
    const bars = makeBars(45, i => 20 + i * 0.1);

    const result = analyzeStockLongTermFromBars({ code: '000001', bars });

    assert.equal(result.dataQuality.reliable, false);
    assert.ok(result.score <= 60);
    assert.ok(result.dataQuality.warnings.length >= 1);
    assert.equal(result.confidence.level, '低');
  });

  it('adds trend consistency and forward validation for a durable trend', () => {
    const bars = makeBars(280, i => 10 + i * 0.06);

    const result = analyzeStockLongTermFromBars({ code: '600519', bars });

    assert.ok(result.score <= 95);
    assert.ok(result.metrics.trendConsistencyPct >= 85);
    assert.equal(result.metrics.currentDrawdownPct, 0);
    assert.ok(result.validation.samples >= 5);
    assert.ok(result.validation.hitRatePct >= 80);
    assert.notEqual(result.confidence.level, '低');
  });

  it('scores a choppy trend lower than a smoother trend with similar long-term direction', () => {
    const smooth = analyzeStockLongTermFromBars({
      code: '600519',
      bars: makeBars(280, i => 10 + i * 0.06),
    });
    const choppy = analyzeStockLongTermFromBars({
      code: '600519',
      bars: makeBars(280, i => 10 + i * 0.06 + Math.sin(i / 3) * 2.8),
    });

    assert.ok(choppy.metrics.trendConsistencyPct < smooth.metrics.trendConsistencyPct);
    assert.ok(choppy.score < smooth.score);
    assert.ok(choppy.risks.length >= 1);
  });
});

describe('long-term fund analysis', () => {
  it('deduplicates local snapshots into a clean NAV history', () => {
    const history = fundHistoryFromSnapshots([
      { recorded_at: '2025-03-02', nav: 1.2 },
      { recorded_at: '2025-03-01', nav: 1.1 },
      { recorded_at: '2025-03-02', nav: 1.25 },
      { recorded_at: '2025-03-03', nav: 0 },
      { recorded_at: '', nav: 1.3 },
    ]);

    assert.deepEqual(history, [
      { date: '2025-03-01', nav: 1.1 },
      { date: '2025-03-02', nav: 1.25 },
    ]);
  });

  it('uses NAV trend and cost basis to rate a fund holding', () => {
    const history = makeFundHistory(260, i => 1.05 + i * 0.002);

    const result = analyzeFundLongTermFromHistory({
      fund: { id: 1, code: '001234', name: '测试成长基金', type: '混合基金', cum_nav: 1.12 },
      history,
    });

    assert.equal(result.type, 'fund');
    assert.equal(result.dataQuality.reliable, true);
    assert.ok(result.score >= 70);
    assert.equal(result.action, '持有');
    assert.ok(result.metrics.costGapPct > 30);
    assert.ok(result.summary.includes('测试成长基金'));
    assert.ok(result.validation.samples >= 5);
    assert.ok(result.metrics.trendConsistencyPct >= 80);
  });

  it('caps confidence when fund NAV history fails quality checks', () => {
    const history = makeFundHistory(260, i => 1.05 + i * 0.002);

    const result = analyzeFundLongTermFromHistory({
      fund: { id: 2, code: '009999', name: 'Data Quality Fund', cum_nav: 1.08 },
      history,
      source: 'eastmoney-lsjz',
      historyQuality: {
        valid: false,
        reliable: false,
        source: 'eastmoney-lsjz',
        requestedDays: 360,
        returnedPoints: 260,
        warnings: ['duplicate dates in source data'],
      },
    });

    assert.equal(result.dataQuality.reliable, false);
    assert.ok(result.score <= 60);
    assert.equal(result.confidence.level, '\u4f4e');
    assert.ok(result.dataQuality.warnings.some(w => w.includes('duplicate dates')));
  });
});
