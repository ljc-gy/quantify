import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildFundSummary, buildPortfolioSummary } from '../services/fundLedgerService.js';

describe('fund ledger calculations', () => {
  it('calculates shares, cash basis, realized income, and current return from ledger rows', () => {
    const summary = buildFundSummary({
      fund: { id: 1, code: '001665', name: 'Test Fund', type: '混合基金' },
      transactions: [
        { type: 'buy', shares: 1000, nav: 1, amount: 1000, fee: 2, trade_date: '2026-01-01' },
        { type: 'buy', shares: 500, nav: 1.2, amount: 600, fee: 1, trade_date: '2026-02-01' },
        { type: 'sell', shares: 300, nav: 1.5, amount: 450, fee: 1, trade_date: '2026-03-01' },
        { type: 'dividend', shares: 0, nav: 0, amount: 80, fee: 0, trade_date: '2026-04-01' },
      ],
      latestNav: { nav: 1.6, nav_date: '2026-06-09', source: 'eastmoney-lsjz' },
    });

    assert.equal(summary.fundId, 1);
    assert.equal(summary.code, '001665');
    assert.equal(summary.netShares, 1200);
    assert.equal(summary.buyAmount, 1600);
    assert.equal(summary.sellAmount, 450);
    assert.equal(summary.dividendAmount, 80);
    assert.equal(summary.feeAmount, 4);
    assert.equal(summary.investedCash, 1074);
    assert.equal(summary.currentValue, 1920);
    assert.equal(summary.profitLoss, 846);
    assert.equal(summary.returnRate, 78.77);
    assert.equal(summary.dataStatus.fresh, true);
    assert.equal(summary.dataStatus.latestNavDate, '2026-06-09');
  });

  it('marks a fund summary as degraded when latest NAV is missing', () => {
    const summary = buildFundSummary({
      fund: { id: 2, code: '000001', name: 'Missing Nav Fund', type: '股票型基金' },
      transactions: [
        { type: 'buy', shares: 1000, nav: 1, amount: 1000, fee: 0, trade_date: '2026-01-01' },
      ],
      latestNav: null,
    });

    assert.equal(summary.netShares, 1000);
    assert.equal(summary.currentValue, 0);
    assert.equal(summary.profitLoss, -1000);
    assert.equal(summary.dataStatus.fresh, false);
    assert.match(summary.dataStatus.warning, /缺少最新净值/);
  });

  it('builds a portfolio summary from fund summaries and NAV trend', () => {
    const portfolio = buildPortfolioSummary({
      summaries: [
        { type: '混合基金', currentValue: 1920, investedCash: 1074, profitLoss: 846 },
        { type: '债券型基金', currentValue: 800, investedCash: 900, profitLoss: -100 },
      ],
      trend: [
        { date: '2026-06-01', value: 2600 },
        { date: '2026-06-02', value: 2800 },
        { date: '2026-06-03', value: 2520 },
        { date: '2026-06-04', value: 2720 },
      ],
    });

    assert.equal(portfolio.totalValue, 2720);
    assert.equal(portfolio.totalInvestedCash, 1974);
    assert.equal(portfolio.totalProfitLoss, 746);
    assert.equal(portfolio.weightedReturnRate, 37.79);
    assert.equal(portfolio.maxDrawdownPct, -10);
    assert.deepEqual(portfolio.byType.map(row => row.type), ['混合基金', '债券型基金']);
    assert.equal(portfolio.byType[0].value, 1920);
  });
});
