/* ================================================================
   Strategy Recommendation — Mock Data
   Replace with real API calls in production:
     GET /api/strategy/overview
     GET /api/strategy/signals
     GET /api/strategy/market-trend
     GET /api/strategy/factor-radar
     GET /api/strategy/user-behavior
     GET /api/strategy/competitor
     GET /api/strategy/list
     GET /api/strategy/:id/detail
     POST /api/strategy/:id/apply
     POST /api/strategy/:id/backtest
   ================================================================ */

// ---------- Strategy list for filtering / sorting ----------
export const strategyList = [
  { id: 1, name: '趋势跟踪 Alpha', type: 'trend', annualReturn: 24.8, winRate: 67.2, sharpe: 2.15, maxDrawdown: 8.3, volatility: 15.2, risk: 'medium', applied: false, favorite: true, signals: 4, capitalUse: 78, description: '基于多时间框架动量因子的趋势跟踪策略，结合均线突破与波动率自适应仓位管理。', tags: ['动量', '均线突破', '波动率自适应'] },
  { id: 2, name: '均值回归 Beta', type: 'mean-reversion', annualReturn: 18.5, winRate: 72.4, sharpe: 1.98, maxDrawdown: 6.1, volatility: 12.8, risk: 'low', applied: true, favorite: true, signals: 2, capitalUse: 65, description: '利用价格偏离均值后的回归特性，结合布林带与RSI超买超卖信号进行逆向交易。', tags: ['布林带', 'RSI', '逆向交易'] },
  { id: 3, name: '套利策略 Gamma', type: 'arbitrage', annualReturn: 12.3, winRate: 88.9, sharpe: 2.55, maxDrawdown: 3.2, volatility: 6.5, risk: 'low', applied: false, favorite: false, signals: 1, capitalUse: 45, description: '跨市场、跨品种的统计套利策略，利用协整关系捕捉价差回归机会。', tags: ['统计套利', '协整', '价差回归'] },
  { id: 4, name: '高频做市 Delta', type: 'hft', annualReturn: 35.6, winRate: 58.3, sharpe: 1.72, maxDrawdown: 15.8, volatility: 28.4, risk: 'high', applied: false, favorite: true, signals: 12, capitalUse: 92, description: '基于订单流不平衡与微观结构噪音的高频做市策略，提供双边流动性。', tags: ['订单流', '做市', '高频'] },
  { id: 5, name: '多因子 Alpha Pro', type: 'multi-factor', annualReturn: 29.1, winRate: 64.8, sharpe: 2.08, maxDrawdown: 10.5, volatility: 18.6, risk: 'medium', applied: true, favorite: false, signals: 3, capitalUse: 82, description: '融合价值、动量、质量、波动率四类因子的多因子选股策略，月度调仓。', tags: ['多因子', '价值', '动量', '月度调仓'] },
  { id: 6, name: '事件驱动 Epsilon', type: 'event-driven', annualReturn: 22.0, winRate: 61.5, sharpe: 1.85, maxDrawdown: 12.4, volatility: 20.1, risk: 'medium', applied: false, favorite: false, signals: 5, capitalUse: 70, description: '基于财报公告、并购重组、分红送转等事件驱动的短期交易策略。', tags: ['财报', '并购', '事件驱动'] },
];

// ---------- Strategy filter options ----------
export const filterOptions = {
  types: [
    { value: 'all', label: '全部类型' },
    { value: 'trend', label: '趋势跟踪' },
    { value: 'mean-reversion', label: '均值回归' },
    { value: 'arbitrage', label: '套利策略' },
    { value: 'hft', label: '高频交易' },
    { value: 'multi-factor', label: '多因子' },
    { value: 'event-driven', label: '事件驱动' },
  ],
  riskLevels: [
    { value: 'all', label: '全部风险' },
    { value: 'low', label: '低风险' },
    { value: 'medium', label: '中风险' },
    { value: 'high', label: '高风险' },
  ],
  sortBy: [
    { value: 'default', label: '默认排序' },
    { value: 'return', label: '按收益率' },
    { value: 'winRate', label: '按胜率' },
    { value: 'sharpe', label: '按夏普比率' },
  ],
};

// ---------- Strategy Score Chart data ----------
export const strategyScoreRaw = {
  xData: ['01', '05', '10', '15', '20', '25', '30'],
  score: [0.75, 0.82, 0.78, 0.88, 0.85, 0.91, 0.89],
  risk: [42.5, 44.1, 46.3, 45.2, 47.8, 48.9, 47.2],
};

// ---------- Market Trend Chart data ----------
export const marketTrendRaw = {
  xData: ['2025', '2025Q2', '2025Q3', '2025Q4', '2026Q1', '2026Q2', '2026Q3'],
  trend: [120, 80, 150, 100, 180, 160, 120],
  volume: [160, 180, 220, 140, 240, 280, 200],
};

// ---------- Hex Radar Chart data ----------
export const hexRadarRaw = {
  dimensions: [
    { name: '策略收益', max: 100 },
    { name: '胜率', max: 100 },
    { name: '夏普比率', max: 100 },
    { name: '最大回撤', max: 100 },
    { name: '波动率', max: 100 },
    { name: '资金利用率', max: 100 },
  ],
  strategy: [82, 74, 68, 55, 62, 78],
  industry: [60, 65, 55, 50, 58, 65],
};

// ---------- User Behavior Chart data ----------
export const userBehaviorRaw = {
  xData: ['0', '1', '2', '3', '4', '5', '6', '7', '8'],
  clicks: [60, 50, 120, 90, 80, 110, 120, 110, 100],
  subs: [40, 110, 90, 120, 100, 130, 120, 110, 100],
};

// ---------- Competitor Comparison Chart data ----------
export const competitorRaw = {
  xData: ['0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6'],
  ours: [95, 102, 108, 115, 110, 122, 128],
  comp: [80, 85, 82, 90, 88, 95, 92],
  advantage: '29.80%',
};

// ---------- My Strategies ----------
export const myStrategies = [
  { id: 2, name: '均值回归 Beta', status: 'applied', appliedAt: '2025-12-15', allocation: '30%', pnl: '+12.4%' },
  { id: 5, name: '多因子 Alpha Pro', status: 'applied', appliedAt: '2026-01-08', allocation: '45%', pnl: '+18.7%' },
];

// ---------- Backtest default params ----------
export const defaultBacktestParams = {
  startDate: '2024-01-01',
  endDate: '2025-12-31',
  initialCapital: 1_000_000,
  feeRate: 0.0003,       // 万三
  slippage: 0.001,       // 0.1%
  benchmark: '沪深300',
};

// ---------- Backtest mock result ----------
export const mockBacktestResult = {
  totalReturn: '68.5%',
  annualReturn: '29.8%',
  alpha: '18.2%',
  beta: 0.85,
  sharpe: 2.15,
  maxDrawdown: '-12.4%',
  winRate: '64.8%',
  profitLossRatio: 2.8,
  tradeCount: 156,
  monthlyReturns: [3.2, -1.5, 5.8, 2.1, -0.8, 6.4, 4.2, -2.1, 3.9, 7.2, 1.8, 5.6],
  dailyPnL: Array.from({ length: 240 }, () => (Math.random() - 0.45) * 2).reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) + v); return acc; }, []),
};
