/**
 * Technical indicator computation service.
 * All functions take an array of closing prices and return computed values.
 * No external dependencies — pure math.
 */

/** Simple Moving Average */
export function SMA(data, period) {
  if (data.length < period) return [];
  const result = new Array(data.length).fill(null);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) sum -= data[i - period];
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

/** Exponential Moving Average */
export function EMA(data, period) {
  if (data.length < period) return [];
  const result = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/** RSI (Relative Strength Index) */
export function RSI(data, period = 14) {
  if (data.length < period + 1) return [];
  const result = new Array(data.length).fill(null);
  const gains = [];
  const losses = [];
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) { avgGain += gains[i]; avgLoss += losses[i]; }
  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    result[i + 1] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return result;
}

/** MACD (Moving Average Convergence Divergence) */
export function MACD(data, fast = 12, slow = 26, signal = 9) {
  if (data.length < slow + signal) return { dif: [], dea: [], macd: [] };
  const emaFast = EMA(data, fast);
  const emaSlow = EMA(data, slow);
  const dif = new Array(data.length).fill(null);
  for (let i = 0; i < data.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) dif[i] = emaFast[i] - emaSlow[i];
  }
  const validDif = dif.filter(v => v !== null);
  const deaRaw = EMA(validDif, signal);
  const dea = new Array(data.length).fill(null);
  const macd = new Array(data.length).fill(null);
  let deaI = 0;
  for (let i = 0; i < data.length; i++) {
    if (dif[i] !== null) {
      if (deaI < deaRaw.length && deaRaw[deaI] !== null) {
        dea[i] = deaRaw[deaI];
        macd[i] = (dif[i] - dea[i]) * 2;
      }
      deaI++;
    }
  }
  return { dif, dea, macd };
}

/** BOLL (Bollinger Bands) */
export function BOLL(data, period = 20, multiplier = 2) {
  if (data.length < period) return { upper: [], mid: [], lower: [] };
  const mid = SMA(data, period);
  const upper = new Array(data.length).fill(null);
  const lower = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg = mid[i];
    const variance = slice.reduce((s, v) => s + (v - avg) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper[i] = avg + multiplier * std;
    lower[i] = avg - multiplier * std;
  }
  return { upper, mid, lower };
}

/** KDJ (Stochastic Oscillator) */
export function KDJ(data, highs, lows, period = 9, m1 = 3, m2 = 3) {
  const n = data.length;
  if (n < period) return { k: [], d: [], j: [] };
  const rsv = new Array(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    const hSlice = highs.slice(i - period + 1, i + 1);
    const lSlice = lows.slice(i - period + 1, i + 1);
    const hh = Math.max(...hSlice);
    const ll = Math.min(...lSlice);
    rsv[i] = hh === ll ? 50 : ((data[i] - ll) / (hh - ll)) * 100;
  }
  const k = new Array(n).fill(50);
  const d = new Array(n).fill(50);
  const j = new Array(n).fill(50);
  for (let i = period; i < n; i++) {
    if (rsv[i] !== null) {
      k[i] = (m1 - 1) / m1 * k[i - 1] + (1 / m1) * rsv[i];
      d[i] = (m2 - 1) / m2 * d[i - 1] + (1 / m2) * k[i];
      j[i] = 3 * k[i] - 2 * d[i];
    }
  }
  return { k, d, j };
}

/** Compute all indicators for a set of OHLCV bars */
export function computeAll(bars) {
  const closes = bars.map(b => b.close);
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const volumes = bars.map(b => b.volume);

  const last = (arr) => {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== null && arr[i] !== undefined) return arr[i];
    return null;
  };

  const sma20 = SMA(closes, 20);
  const sma60 = SMA(closes, 60);
  const ema12 = EMA(closes, 12);
  const ema26 = EMA(closes, 26);
  const rsi14 = RSI(closes, 14);
  const macdData = MACD(closes);
  const bollData = BOLL(closes);
  const kdjData = KDJ(closes, highs, lows);
  const sma5 = SMA(closes, 5);
  const sma10 = SMA(closes, 10);
  const volSma20 = SMA(volumes, 20);

  const latestClose = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2] || latestClose;

  return {
    latest: {
      close: latestClose,
      prevClose,
      changePct: prevClose ? ((latestClose - prevClose) / prevClose * 100) : 0,
      volume: volumes[volumes.length - 1],
      volRatio: last(volSma20) ? (volumes[volumes.length - 1] / last(volSma20)) : 1,
    },
    sma20: last(sma20),
    sma60: last(sma60),
    sma5: last(sma5),
    sma10: last(sma10),
    ema12: last(ema12),
    ema26: last(ema26),
    rsi14: last(rsi14),
    macd: {
      dif: last(macdData.dif),
      dea: last(macdData.dea),
      macd: last(macdData.macd),
    },
    boll: {
      upper: last(bollData.upper),
      mid: last(bollData.mid),
      lower: last(bollData.lower),
    },
    kdj: {
      k: last(kdjData.k),
      d: last(kdjData.d),
      j: last(kdjData.j),
    },
    bars: bars.length,
  };
}
