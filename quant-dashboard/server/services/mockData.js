/**
 * Mock data generators for development and testing.
 * Each function returns data in the same shape the frontend expects.
 *
 * Real-data integration points (Tushare / East Money) are documented
 * as comments inside each function →swap the return value when ready.
 */

// ── Asset Overview ──
// Real: Tushare pro_bar(ts_code='000001.SH', freq='D') →aggregate
export function mockAssetOverview() {
  const dates = [];
  const values = [];
  const now = new Date();
  let base = 1280000;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`);
    base += Math.round((Math.random() * 0.04 - 0.005) * base * 0.8);
    base = Math.max(base, 1250000);
    values.push(base);
  }

  return {
    total: '1,284,500.00',
    rate: '+12.5%',
    dates,
    values,
  };
}

// ── Market Realtime ──
// Real: East Money http://push2.eastmoney.com/api/qt/stock/get →parse
export function mockRealtime() {
  const basePrice = 42.80 + (Math.random() - 0.5) * 0.8;
  const prevClose = 43.15;
  const changePct = +(((basePrice - prevClose) / prevClose) * 100).toFixed(2);

  const times = [];
  const prices = [];
  let p = basePrice;
  for (let h = 9; h <= 15; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 9 && m < 30) continue;
      if (h === 11 && m > 30) continue;
      if (h === 12) continue;
      if (h === 15 && m > 0) break;
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      p += (Math.random() - 0.48) * 0.15;
      p = Math.max(42.30, Math.min(43.30, p));
      prices.push(+p.toFixed(2));
    }
  }

  return {
    change: `${changePct >= 0 ? '+' : ''}${changePct}%`,
    times,
    prices,
    volume: Math.floor(Math.random() * 50000 + 20000),
    high: +Math.max(...prices).toFixed(2),
    low: +Math.min(...prices).toFixed(2),
    open: prices[0],
    prevClose,
  };
}

// ── Market History (24h volume) ──
// Real: Tushare stk_factor(ts_code, start_date, end_date) →daily volume
export function mockVolumeHistory() {
  const times = [];
  const volumes = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(d.getHours() - i);
    const h = d.getHours();
    const m = d.getMinutes();
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

    const hourDecimal = h + m / 60;
    const isTrading = (hourDecimal >= 9.5 && hourDecimal <= 11.5) || (hourDecimal >= 13.5 && hourDecimal <= 15.0);
    volumes.push(isTrading ? Math.round(Math.random() * 8000 + 4000) : Math.round(Math.random() * 800 + 100));
  }

  return { times, volumes, rate: '+6.03%' };
}

// ── Risk Assessment (K-line) ──
// Real: Tushare daily(ts_code, start_date, end_date) →OHLCV + MA calc
export function mockRiskKline() {
  const dates = [];
  const ohlc = [];
  let close = 42.50;
  const now = new Date();

  for (let i = 9; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`);

    const open = close;
    const change = (Math.random() - 0.45) * 2.0;
    close = +(open + change).toFixed(2);
    const high = +Math.max(open, close + Math.random() * 0.8).toFixed(2);
    const low = +Math.min(open, close - Math.random() * 0.8).toFixed(2);
    ohlc.push([open, close, low, high]);
  }

  return { dates, ohlc, riskLevel: '低风险' };
}

// ── Risk Metrics (drawdown + volatility) ──
export function mockRiskMetrics() {
  const dates = [];
  const drawdown = [];
  const volatility = [];
  let dd = 3.2;
  let vol = 1.8;
  const now = new Date();

  for (let i = 9; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`);
    dd = Math.max(0.5, dd + (Math.random() - 0.5) * 1.5);
    vol = Math.max(0.3, vol + (Math.random() - 0.5) * 0.6);
    drawdown.push(+dd.toFixed(2));
    volatility.push(+vol.toFixed(2));
  }

  return { dates, drawdown, volatility };
}

// ── Returns (bar + comparison) ──
export function mockReturns() {
  const months = [];
  const floating = [];
  const actual = [];
  const cumulative = [];
  const benchmark = [];
  let cumVal = 0;
  let benchVal = 0;

  for (let i = 1; i <= 12; i++) {
    months.push(`${i}月`);
    const f = +(Math.random() * 3000 + 500).toFixed(0);
    floating.push(f);
    actual.push(+(f * (0.7 + Math.random() * 0.5)).toFixed(0));
    cumVal += +(Math.random() * 800 - 100).toFixed(0);
    benchVal += +(Math.random() * 600 - 50).toFixed(0);
    cumulative.push(cumVal);
    benchmark.push(benchVal);
  }

  return { months, floating, actual, cumulative, benchmark };
}

// ── Asset risk (grouped bar) ──
export function mockAssetRisk() {
  const assets = ['股票', '基金', '债券', '期货', '期权', '现金', '黄金', '外汇', '其他'];
  const posRisk = assets.map(() => +(Math.random() * 80 + 10).toFixed(1));
  const mktRisk = assets.map(() => +(Math.random() * 60 + 15).toFixed(1));
  return { assets, posRisk, mktRisk };
}

// ── Realtime dashboard snapshot ──
export function mockDashboardSnapshot() {
  return {
    totalAsset: '58,000',
    todayVolume: '2,224',
    riskIndex: +(40 + Math.random() * 20).toFixed(2),
    riskWarn: 15.3,
    riskThreshold: 99,
    cumulativeProfit: '48,300',
    todayProfit: '878',
    todayDrawdown: '257',
  };
}


// ── Volatility Cone ──
// Real: Tushare pro_bar daily data → compute rolling HV for each window
export function mockVolatilityCone() {
  const windows = [20, 30, 60, 90, 126, 189, 252];
  const baseMedians = [28.5, 27.8, 26.2, 25.0, 24.1, 23.0, 22.2];
  const series = windows.map((w, i) => {
    const median = baseMedians[i] + (Math.random() - 0.5) * 2;
    const spread = 3 + w * 0.02;
    const p25 = +(median - spread * (0.6 + Math.random() * 0.4)).toFixed(2);
    const p75 = +(median + spread * (0.6 + Math.random() * 0.4)).toFixed(2);
    const min = +(p25 - spread * (0.8 + Math.random() * 1.2)).toFixed(2);
    const max = +(p75 + spread * (0.8 + Math.random() * 1.2)).toFixed(2);
    const current = +(median + (Math.random() - 0.2) * spread * 1.5).toFixed(2);
    return { window: w, min, p25, median, p75, max, current };
  });
  return { windows, series };
}
