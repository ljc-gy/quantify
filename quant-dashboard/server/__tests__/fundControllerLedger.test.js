import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, run } from '../utils/initDb.js';
import * as fm from '../models/fundModels.js';
import { addFund, getPortfolioSummary } from '../controllers/fundController.js';

const TEST_CODE = '008888';

function mockRes() {
  return {
    _status: 200,
    _json: null,
    status(code) { this._status = code; return this; },
    json(data) { this._json = data; return this; },
  };
}

describe('fund controller ledger integration', () => {
  beforeEach(async () => {
    await initDb();
    run('DELETE FROM fund_transactions WHERE user_id = ?', [1]);
    run('DELETE FROM fund_nav_cache WHERE fund_code = ?', [TEST_CODE]);
    run('DELETE FROM funds WHERE code = ?', [TEST_CODE]);
  });

  it('creates an initial buy transaction when adding a fund with shares and cost', () => {
    const req = {
      body: {
        userId: 1,
        code: TEST_CODE,
        name: 'Controller Ledger Fund',
        type: '混合基金',
        shares: 1000,
        nav: 1.1,
        cumNav: 1.1,
        amount: 1100,
        pl: 0,
        rate: 0,
      },
    };
    const res = mockRes();

    addFund(req, res);

    assert.equal(res._json.code, 0);
    const fundId = res._json.data.id;
    const transactions = fm.getTransactions(1, fundId);
    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].type, 'buy');
    assert.equal(transactions[0].shares, 1000);
    assert.equal(transactions[0].amount, 1100);
  });

  it('returns a portfolio summary derived from transactions and cached NAV', () => {
    const fundId = fm.addFund({
      userId: 1,
      code: TEST_CODE,
      name: 'Summary Fund',
      type: '混合基金',
      shares: 1000,
      nav: 1,
      cumNav: 1,
      amount: 1000,
      pl: 0,
      rate: 0,
    });
    fm.addTransaction({
      userId: 1,
      fundId,
      type: 'buy',
      tradeDate: '2026-06-01',
      shares: 1000,
      nav: 1,
      amount: 1000,
      fee: 0,
      note: '',
    });
    fm.upsertNavCache({
      fundCode: TEST_CODE,
      navDate: '2026-06-09',
      nav: 1.2,
      dailyReturnPct: 0.5,
      source: 'eastmoney-lsjz',
      quality: 'fresh',
    });

    const req = { query: { userId: 1 } };
    const res = mockRes();

    getPortfolioSummary(req, res);

    assert.equal(res._json.code, 0);
    assert.ok(res._json.data.summary.totalValue >= 1200);
    const target = res._json.data.funds.find(fund => fund.code === TEST_CODE);
    assert.equal(target.currentValue, 1200);
    assert.equal(target.dataStatus.fresh, true);
  });

  it('uses existing fund shares as a legacy ledger fallback when no transactions exist', () => {
    fm.addFund({
      userId: 1,
      code: TEST_CODE,
      name: 'Legacy Fund',
      type: '混合基金',
      shares: 1000,
      nav: 1.2,
      cumNav: 1,
      amount: 1200,
      pl: 200,
      rate: 20,
    });

    const req = { query: { userId: 1 } };
    const res = mockRes();

    getPortfolioSummary(req, res);

    const target = res._json.data.funds.find(fund => fund.code === TEST_CODE);
    assert.equal(target.netShares, 1000);
    assert.equal(target.currentValue, 1200);
    assert.equal(target.investedCash, 1000);
    assert.equal(target.profitLoss, 200);
    assert.equal(target.dataStatus.source, 'legacy-funds-row');
  });
});
