import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as models from '../models/index.js';
import { saveHolding } from '../controllers/portfolioController.js';
import { initDb, run } from '../utils/initDb.js';

const TEST_CODE = '601992';
let originalSource = 'mock';

function mockRes() {
  return {
    _status: 200,
    _json: null,
    status(code) { this._status = code; return this; },
    json(data) { this._json = data; return this; },
  };
}

describe('saveHolding', () => {
  beforeEach(async () => {
    await initDb();
    originalSource = models.getConfig('data_source') || 'mock';
    models.setConfig('data_source', 'mock');
    run('DELETE FROM holdings WHERE stock_code = ?', [TEST_CODE]);
  });

  afterEach(() => {
    run('DELETE FROM holdings WHERE stock_code = ?', [TEST_CODE]);
    models.setConfig('data_source', originalSource);
  });

  it('refreshes the current price when creating a new holding with only cost price', async () => {
    const req = {
      body: {
        userId: 1,
        stockCode: TEST_CODE,
        stockName: '测试股票',
        quantity: 100,
        costPrice: 7.37,
        curPrice: 7.37,
        marketVal: 737,
      },
    };
    const res = mockRes();

    await saveHolding(req, res);

    const saved = models.getHoldingByCode(1, TEST_CODE);
    assert.equal(res._json.code, 0);
    assert.ok(saved.cur_price > 0);
    assert.notEqual(saved.cur_price, 7.37);
    assert.equal(saved.market_val, saved.quantity * saved.cur_price);
  });
});
