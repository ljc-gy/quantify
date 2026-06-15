import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEastMoneyClient } from '../services/eastmoneyClient.js';

describe('createEastMoneyClient', () => {
  it('returns parsed data with request metadata on success', async () => {
    const calls = [];
    const client = createEastMoneyClient({
      minIntervalMs: 0,
      jitterMs: 0,
      now: () => 1000,
      sleep: async () => {},
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ ErrCode: 0, Data: { value: 42 } }),
        };
      },
    });

    const result = await client.getJson('https://api.fund.eastmoney.com/f10/lsjz', {
      params: { fundCode: '001665' },
      source: 'eastmoney-lsjz',
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { ErrCode: 0, Data: { value: 42 } });
    assert.equal(result.meta.status, 200);
    assert.equal(result.meta.source, 'eastmoney-lsjz');
    assert.equal(result.meta.attempts, 1);
    assert.equal(result.meta.error, null);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /fundCode=001665/);
    assert.equal(calls[0].options.headers.Referer, 'https://fund.eastmoney.com/');
  });

  it('retries failed requests and returns normalized failure metadata', async () => {
    let attempts = 0;
    const sleeps = [];
    const client = createEastMoneyClient({
      minIntervalMs: 0,
      jitterMs: 0,
      maxRetries: 2,
      now: () => 1000 + attempts,
      sleep: async (ms) => { sleeps.push(ms); },
      fetchImpl: async () => {
        attempts += 1;
        return {
          ok: false,
          status: 429,
          text: async () => 'too many requests',
        };
      },
    });

    const result = await client.getJson('https://push2.eastmoney.com/api/qt/stock/get', {
      source: 'eastmoney-stock',
    });

    assert.equal(result.ok, false);
    assert.equal(result.data, null);
    assert.equal(result.meta.status, 429);
    assert.equal(result.meta.source, 'eastmoney-stock');
    assert.equal(result.meta.attempts, 3);
    assert.equal(result.meta.rateLimited, true);
    assert.match(result.meta.error, /HTTP 429/);
    assert.equal(attempts, 3);
    assert.equal(sleeps.length, 2);
  });
});
