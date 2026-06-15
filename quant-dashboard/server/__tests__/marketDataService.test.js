import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as models from '../models/index.js';
import { fetchQuote, normalizeStockCode } from '../services/marketDataService.js';
import { initDb } from '../utils/initDb.js';

const originalFetch = globalThis.fetch;
let originalSource = 'mock';
let originalToken = '';

describe('normalizeStockCode', () => {
  it('normalizes common A-share code formats to six digits', () => {
    assert.equal(normalizeStockCode(' SH600519 '), '600519');
    assert.equal(normalizeStockCode('600519.SH'), '600519');
    assert.equal(normalizeStockCode('sz000001'), '000001');
    assert.equal(normalizeStockCode('000001'), '000001');
  });
});

describe('fetchQuote', () => {
  beforeEach(async () => {
    await initDb();
    originalSource = models.getConfig('data_source') || 'mock';
    originalToken = models.getConfig('tushare_token') || '';
    models.setConfig('data_source', 'eastmoney');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    models.setConfig('data_source', originalSource);
    models.setConfig('tushare_token', originalToken);
  });

  it('falls back to a positive local quote when East Money fetch fails', async () => {
    globalThis.fetch = async () => {
      throw new Error('network down');
    };

    const quote = await fetchQuote(' SH601991 ');

    assert.equal(quote.code, '601991');
    assert.ok(quote.price > 0);
    assert.equal(quote.source, 'fallback');
  });
});
