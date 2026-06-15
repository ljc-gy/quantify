import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mockDashboardSnapshot,
  mockAssetOverview,
  mockRealtime,
  mockVolumeHistory,
  mockRiskKline,
  mockRiskMetrics,
  mockAssetRisk,
  mockReturns,
  mockVolatilityCone,
} from '../services/mockData.js';

describe('mockDashboardSnapshot', () => {
  it('returns all required keys', () => {
    const snap = mockDashboardSnapshot();
    const keys = ['totalAsset', 'todayVolume', 'riskIndex', 'riskWarn',
      'riskThreshold', 'cumulativeProfit', 'todayProfit', 'todayDrawdown'];
    for (const k of keys) {
      assert.ok(k in snap, `missing key: ${k}`);
    }
  });
});

describe('mockAssetOverview', () => {
  it('returns total, rate, dates, values', () => {
    const data = mockAssetOverview();
    assert.ok(typeof data.total === 'string');
    assert.ok(typeof data.rate === 'string');
    assert.ok(Array.isArray(data.dates));
    assert.ok(Array.isArray(data.values));
    assert.equal(data.dates.length, data.values.length);
  });
});

describe('mockRealtime', () => {
  it('returns change, times, prices, volume, high, low, open, prevClose', () => {
    const data = mockRealtime();
    assert.ok(typeof data.change === 'string');
    assert.ok(Array.isArray(data.times));
    assert.ok(Array.isArray(data.prices));
    assert.equal(data.times.length, data.prices.length);
    assert.ok(typeof data.high === 'number');
    assert.ok(typeof data.low === 'number');
    assert.ok(typeof data.open === 'number');
    assert.ok(typeof data.prevClose === 'number');
  });
});

describe('mockVolumeHistory', () => {
  it('returns times, volumes, rate with equal array lengths', () => {
    const data = mockVolumeHistory();
    assert.equal(data.times.length, data.volumes.length);
    assert.ok(typeof data.rate === 'string');
  });
});

describe('mockRiskKline', () => {
  it('returns dates, ohlc, riskLevel', () => {
    const data = mockRiskKline();
    assert.equal(data.dates.length, data.ohlc.length);
    assert.ok(typeof data.riskLevel === 'string');
    for (const candle of data.ohlc) {
      assert.equal(candle.length, 4);
    }
  });
});

describe('mockRiskMetrics', () => {
  it('returns dates, drawdown, volatility with equal lengths', () => {
    const data = mockRiskMetrics();
    assert.equal(data.dates.length, data.drawdown.length);
    assert.equal(data.dates.length, data.volatility.length);
  });
});

describe('mockAssetRisk', () => {
  it('returns assets, posRisk, mktRisk with equal lengths', () => {
    const data = mockAssetRisk();
    assert.equal(data.assets.length, data.posRisk.length);
    assert.equal(data.assets.length, data.mktRisk.length);
  });
});

describe('mockReturns', () => {
  it('returns months, floating, actual, cumulative, benchmark with equal lengths', () => {
    const data = mockReturns();
    assert.equal(data.months.length, 12);
    assert.equal(data.floating.length, 12);
    assert.equal(data.actual.length, 12);
    assert.equal(data.cumulative.length, 12);
    assert.equal(data.benchmark.length, 12);
  });
});

describe('mockVolatilityCone', () => {
  it('returns windows and series arrays', () => {
    const data = mockVolatilityCone();
    assert.ok(Array.isArray(data.windows));
    assert.ok(Array.isArray(data.series));
    assert.equal(data.windows.length, data.series.length);
    for (const s of data.series) {
      const keys = ['window', 'min', 'p25', 'median', 'p75', 'max', 'current'];
      for (const k of keys) assert.ok(k in s, `missing key: ${k}`);
    }
  });
});
