import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchKline } from '../services/klineService.js';

const originalFetch = globalThis.fetch;

function mockTencentResponse(fullCode, field, rows) {
  return {
    ok: true,
    json: async () => ({
      code: 0,
      data: {
        [fullCode]: {
          [field]: rows,
        },
      },
    }),
  };
}

describe('fetchKline', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('requests and parses weekly K-line data when period is week', async () => {
    let requestedUrl = '';
    globalThis.fetch = async (url) => {
      requestedUrl = url;
      return mockTencentResponse('sz000001', 'qfqweek', [
        ['2026-05-15', '11.290', '10.990', '11.360', '10.960', '4747987.000'],
      ]);
    };

    const klines = await fetchKline('000001', 'week', 5);

    assert.match(requestedUrl, /sz000001,week,,,5,qfq/);
    assert.deepEqual(klines, [{
      date: '2026-05-15',
      open: 11.29,
      close: 10.99,
      high: 11.36,
      low: 10.96,
      volume: 4747987,
    }]);
  });

  it('requests and parses monthly K-line data when period is month', async () => {
    let requestedUrl = '';
    globalThis.fetch = async (url) => {
      requestedUrl = url;
      return mockTencentResponse('sh600000', 'qfqmonth', [
        ['2026-03-31', '9.500', '9.860', '10.100', '9.430', '8765432.000'],
      ]);
    };

    const klines = await fetchKline('600000', 'month', 8);

    assert.match(requestedUrl, /sh600000,month,,,8,qfq/);
    assert.equal(klines[0].date, '2026-03-31');
    assert.equal(klines[0].close, 9.86);
  });
});
