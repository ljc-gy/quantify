import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, run } from '../utils/initDb.js';
import * as fm from '../models/fundModels.js';

const TEST_CODE = '009999';

describe('fund ledger models', () => {
  beforeEach(async () => {
    await initDb();
    run('DELETE FROM fund_transactions WHERE user_id = ?', [1]);
    run('DELETE FROM fund_nav_cache WHERE fund_code = ?', [TEST_CODE]);
    run('DELETE FROM funds WHERE code = ?', [TEST_CODE]);
  });

  it('creates, lists, updates, and deletes fund transactions', () => {
    const fundId = fm.addFund({
      userId: 1,
      code: TEST_CODE,
      name: 'Ledger Test Fund',
      type: '混合基金',
      shares: 0,
      nav: 0,
      cumNav: 0,
      amount: 0,
      pl: 0,
      rate: 0,
    });

    const id = fm.addTransaction({
      userId: 1,
      fundId,
      type: 'buy',
      tradeDate: '2026-06-01',
      shares: 1000,
      nav: 1.2,
      amount: 1200,
      fee: 1.5,
      note: 'initial buy',
    });

    let rows = fm.getTransactions(1, fundId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, id);
    assert.equal(rows[0].type, 'buy');
    assert.equal(rows[0].amount, 1200);

    fm.updateTransaction(id, { amount: 1300, note: 'adjusted' });
    rows = fm.getTransactions(1, fundId);
    assert.equal(rows[0].amount, 1300);
    assert.equal(rows[0].note, 'adjusted');

    fm.deleteTransaction(id);
    assert.equal(fm.getTransactions(1, fundId).length, 0);
  });

  it('upserts NAV cache rows by fund code and NAV date', () => {
    fm.upsertNavCache({
      fundCode: TEST_CODE,
      navDate: '2026-06-09',
      nav: 1.2345,
      dailyReturnPct: 0.8,
      source: 'eastmoney-lsjz',
      quality: 'fresh',
    });
    fm.upsertNavCache({
      fundCode: TEST_CODE,
      navDate: '2026-06-09',
      nav: 1.25,
      dailyReturnPct: 1.1,
      source: 'eastmoney-lsjz',
      quality: 'fresh',
    });

    const latest = fm.getLatestNavCache(TEST_CODE);
    const history = fm.getNavCacheHistory(TEST_CODE, 10);

    assert.equal(history.length, 1);
    assert.equal(latest.nav, 1.25);
    assert.equal(latest.nav_date, '2026-06-09');
    assert.equal(latest.daily_return_pct, 1.1);
  });
});
