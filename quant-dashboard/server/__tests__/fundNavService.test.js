import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchFundHistory, validateFundHistory } from '../services/fundNavService.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function historyItem(offset, nav) {
  const date = new Date(Date.UTC(2026, 4, 1 + offset)).toISOString().slice(0, 10);
  return {
    FSRQ: date,
    DWJZ: String(nav),
  };
}

describe('fetchFundHistory', () => {
  it('marks malformed NAV series as invalid before analysis uses them', () => {
    const quality = validateFundHistory([
      { date: '2026-05-02', nav: 1.12 },
      { date: '2026-05-02', nav: 1.13 },
      { date: '2026-05-01', nav: 1.1 },
      { date: '2026-05-03', nav: -1 },
    ], 120);

    assert.equal(quality.valid, false);
    assert.equal(quality.reliable, false);
    assert.equal(quality.checks.duplicateDates, 1);
    assert.equal(quality.checks.outOfOrderRows, 1);
    assert.equal(quality.checks.invalidRows, 1);
    assert.ok(quality.warnings.length >= 3);
  });

  it('paginates East Money NAV history and returns oldest records first', async () => {
    const pages = {
      1: Array.from({ length: 20 }, (_, i) => historyItem(40 - i, 1.4 - i * 0.01)),
      2: Array.from({ length: 20 }, (_, i) => historyItem(20 - i, 1.2 - i * 0.01)),
    };
    const calls = [];

    global.fetch = async (url) => {
      const textUrl = String(url);
      calls.push(textUrl);
      if (textUrl.includes('fundgz')) {
        return { ok: true, text: async () => 'jsonpgz({"name":"Test Fund"});' };
      }

      const page = Number(new URL(textUrl).searchParams.get('pageIndex'));
      return {
        ok: true,
        json: async () => ({
          ErrCode: 0,
          Data: { LSJZList: pages[page] || [] },
        }),
      };
    };

    const result = await fetchFundHistory('001665', 35);

    assert.equal(result.history.length, 35);
    assert.equal(result.name, 'Test Fund');
    assert.equal(result.history[0].date, '2026-05-07');
    assert.equal(result.history.at(-1).date, '2026-06-10');
    assert.equal(result.dataQuality.source, 'eastmoney-lsjz');
    assert.equal(result.dataQuality.valid, true);
    assert.equal(result.dataQuality.returnedPoints, 35);
    assert.ok(calls.some(url => url.includes('pageIndex=1')));
    assert.ok(calls.some(url => url.includes('pageIndex=2')));
  });
});
