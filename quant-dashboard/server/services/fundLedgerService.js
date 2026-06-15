function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function normalizedType(type) {
  return type || '其他';
}

export function buildFundSummary({ fund, transactions = [], latestNav = null }) {
  let netShares = 0;
  let buyAmount = 0;
  let sellAmount = 0;
  let dividendAmount = 0;
  let feeAmount = 0;
  let manualAdjustment = 0;

  for (const tx of transactions || []) {
    const type = tx.type || tx.transaction_type;
    const shares = toNumber(tx.shares);
    const amount = toNumber(tx.amount);
    const fee = toNumber(tx.fee);

    if (type === 'buy') {
      netShares += shares;
      buyAmount += amount;
      feeAmount += fee;
    } else if (type === 'sell') {
      netShares -= shares;
      sellAmount += amount;
      feeAmount += fee;
    } else if (type === 'dividend') {
      dividendAmount += amount;
    } else if (type === 'fee') {
      feeAmount += amount || fee;
    } else if (type === 'split') {
      netShares += shares;
    } else if (type === 'adjustment') {
      netShares += shares;
      manualAdjustment += amount;
    }
  }

  const latestNavValue = latestNav ? toNumber(latestNav.nav) : 0;
  const currentValue = latestNavValue > 0 ? netShares * latestNavValue : 0;
  const investedCash = buyAmount + feeAmount - sellAmount - dividendAmount + manualAdjustment;
  const profitLoss = currentValue + sellAmount + dividendAmount - buyAmount - feeAmount - manualAdjustment;
  const returnRate = investedCash > 0 ? (profitLoss / investedCash) * 100 : 0;
  const hasFreshNav = latestNavValue > 0;

  return {
    fundId: fund?.id,
    code: fund?.code || '',
    name: fund?.name || '',
    type: normalizedType(fund?.type),
    netShares: round2(netShares),
    buyAmount: round2(buyAmount),
    sellAmount: round2(sellAmount),
    dividendAmount: round2(dividendAmount),
    feeAmount: round2(feeAmount),
    investedCash: round2(investedCash),
    currentNav: round2(latestNavValue),
    currentValue: round2(currentValue),
    profitLoss: round2(profitLoss),
    returnRate: round2(returnRate),
    transactionCount: transactions.length,
    dataStatus: {
      fresh: hasFreshNav,
      latestNavDate: latestNav?.nav_date || latestNav?.date || null,
      source: latestNav?.source || null,
      warning: hasFreshNav ? null : '缺少最新净值，当前估值按0处理',
    },
  };
}

function maxDrawdownPct(trend = []) {
  let peak = 0;
  let maxDrawdown = 0;

  for (const point of trend || []) {
    const value = toNumber(point.value);
    if (value <= 0) continue;
    peak = Math.max(peak, value);
    if (peak > 0) {
      const drawdown = ((value - peak) / peak) * 100;
      maxDrawdown = Math.min(maxDrawdown, drawdown);
    }
  }

  return round2(maxDrawdown);
}

export function buildPortfolioSummary({ summaries = [], trend = [] }) {
  const totalValue = summaries.reduce((sum, row) => sum + toNumber(row.currentValue), 0);
  const totalInvestedCash = summaries.reduce((sum, row) => sum + toNumber(row.investedCash), 0);
  const totalProfitLoss = summaries.reduce((sum, row) => sum + toNumber(row.profitLoss), 0);
  const byTypeMap = new Map();

  for (const row of summaries) {
    const type = normalizedType(row.type);
    const existing = byTypeMap.get(type) || { type, value: 0, profitLoss: 0, count: 0, weightPct: 0 };
    existing.value += toNumber(row.currentValue);
    existing.profitLoss += toNumber(row.profitLoss);
    existing.count += 1;
    byTypeMap.set(type, existing);
  }

  const byType = [...byTypeMap.values()]
    .map(row => ({
      ...row,
      value: round2(row.value),
      profitLoss: round2(row.profitLoss),
      weightPct: totalValue > 0 ? round2((row.value / totalValue) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    totalValue: round2(totalValue),
    totalInvestedCash: round2(totalInvestedCash),
    totalProfitLoss: round2(totalProfitLoss),
    weightedReturnRate: totalInvestedCash > 0 ? round2((totalProfitLoss / totalInvestedCash) * 100) : 0,
    maxDrawdownPct: maxDrawdownPct(trend),
    byType,
  };
}
