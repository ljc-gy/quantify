/**
 * Strategy signal engine — applies strategy rules to indicator data.
 * Each strategy function returns { signal: 'buy'|'sell'|'hold', strength: 0-100, reason: string }
 */
import { fetchKline } from './klineService';
import { computeAll } from './indicatorService';

function sig(signal, strength, reason) {
  return { signal, strength: Math.min(100, Math.max(0, Math.round(strength))), reason };
}

/** RSI strategy: buy when oversold (<30), sell when overbought (>70) */
function rsiStrategy(ind) {
  const rsi = ind.rsi14;
  if (rsi === null) return sig('hold', 0, 'RSI数据不足');
  if (rsi < 25) return sig('buy', 90 - rsi, `RSI极度超卖(${rsi.toFixed(1)})，反弹概率高`);
  if (rsi < 35) return sig('buy', 70 - rsi, `RSI超卖(${rsi.toFixed(1)})，关注反弹`);
  if (rsi > 80) return sig('sell', rsi - 70, `RSI严重超买(${rsi.toFixed(1)})，回调风险大`);
  if (rsi > 65) return sig('sell', rsi - 55, `RSI超买(${rsi.toFixed(1)})，注意回落`);
  return sig('hold', 50, `RSI中性(${rsi.toFixed(1)})，观望`);
}

/** MACD strategy: golden cross buy, death cross sell */
function macdStrategy(ind) {
  const { dif, dea, macd } = ind.macd;
  if (dif === null || dea === null) return sig('hold', 0, 'MACD数据不足');
  const diff = dif - dea;
  if (macd > 0 && diff > 0 && dif > 0) return sig('buy', 60 + Math.abs(diff) * 100, `MACD金叉多头(${dif.toFixed(4)})，看涨`);
  if (macd > 0 && diff > 0) return sig('buy', 50 + Math.abs(diff) * 80, `MACD零轴上(${dif.toFixed(4)})，偏多`);
  if (macd < 0 && diff < 0 && dif < 0) return sig('sell', 60 + Math.abs(diff) * 100, `MACD死叉空头(${dif.toFixed(4)})，看跌`);
  if (macd < 0 && diff < 0) return sig('sell', 50 + Math.abs(diff) * 80, `MACD零轴下(${dif.toFixed(4)})，偏空`);
  if (diff > 0) return sig('buy', 40, `MACD金叉初期(${dif.toFixed(4)})`);
  return sig('sell', 40, `MACD死叉初期(${dif.toFixed(4)})`);
}

/** BOLL strategy: buy at lower band, sell at upper band */
function bollStrategy(ind) {
  const { upper, mid, lower } = ind.boll;
  const price = ind.latest.close;
  if (upper === null) return sig('hold', 0, 'BOLL数据不足');
  const bandwidth = (upper - lower) / mid;
  if (price <= lower * 1.02) return sig('buy', 75, `触及布林下轨(${lower.toFixed(2)})，超跌反弹`);
  if (price < mid && price > lower) return sig('buy', 55, `布林中轨下方(${mid.toFixed(2)})，偏低位`);
  if (price >= upper * 0.98) return sig('sell', 75, `触及布林上轨(${upper.toFixed(2)})，超涨回调`);
  if (price > mid && price < upper) return sig('sell', 55, `布林中轨上方(${mid.toFixed(2)})，偏高`);
  return sig('hold', 50, `布林中轨附近(${mid.toFixed(2)})，震荡`);
}

/** KDJ strategy */
function kdjStrategy(ind) {
  const { k, d, j } = ind.kdj;
  if (k === null) return sig('hold', 0, 'KDJ数据不足');
  if (j < 0 && k < 20) return sig('buy', 85, `KDJ底部钝化(J=${j.toFixed(1)})，超卖反弹`);
  if (k < 20 && d < 20) return sig('buy', 70, `KDJ超卖区(K=${k.toFixed(1)})，关注金叉`);
  if (j > 100 && k > 80) return sig('sell', 85, `KDJ顶部钝化(J=${j.toFixed(1)})，超买回调`);
  if (k > 80 && d > 80) return sig('sell', 70, `KDJ超买区(K=${k.toFixed(1)})，关注死叉`);
  if (k > d && j > k) return sig('buy', 55, `KDJ多头排列(J=${j.toFixed(1)})`);
  if (k < d && j < k) return sig('sell', 55, `KDJ空头排列(J=${j.toFixed(1)})`);
  return sig('hold', 50, `KDJ中位(K=${k.toFixed(1)})，震荡`);
}

/** MA crossover: SMA5 vs SMA20 */
function maCrossoverStrategy(ind) {
  const { sma5, sma10, sma20, sma60 } = ind;
  const price = ind.latest.close;
  if (sma5 === null) return sig('hold', 0, '均线数据不足');
  if (sma5 > sma10 && sma10 > sma20) return sig('buy', 70, `均线多头排列(5>10>20)，趋势向上`);
  if (sma5 > sma20 && price > sma5) return sig('buy', 60, `价格站上5日均线(${sma5.toFixed(2)})，短线强势`);
  if (sma5 < sma10 && sma10 < sma20) return sig('sell', 70, `均线空头排列(5<10<20)，趋势向下`);
  if (sma5 < sma20 && price < sma5) return sig('sell', 60, `价格跌破5日均线(${sma5.toFixed(2)})，短线弱势`);
  if (sma60 !== null && price > sma60 && sma5 > sma20) return sig('buy', 65, `中长期多头，短期向好`);
  if (sma60 !== null && price < sma60 && sma5 < sma20) return sig('sell', 65, `中长期空头，短期走弱`);
  return sig('hold', 50, '均线交织，方向不明');
}

/** Volume-price strategy */
function volumePriceStrategy(ind) {
  const { close, changePct, volRatio } = ind.latest;
  if (changePct > 2 && volRatio > 1.5) return sig('buy', 70, `放量上涨(+${changePct.toFixed(1)}%, 量比${volRatio.toFixed(1)})，强势`);
  if (changePct > 0 && volRatio > 2) return sig('buy', 60, `放量上攻，资金进场`);
  if (changePct < -2 && volRatio > 1.5) return sig('sell', 75, `放量下跌(${changePct.toFixed(1)}%, 量比${volRatio.toFixed(1)})，出货迹象`);
  if (changePct < 0 && volRatio > 2) return sig('sell', 65, `放量下杀，资金出逃`);
  if (changePct > 1 && volRatio < 0.5) return sig('sell', 55, `缩量上涨，动能不足`);
  if (changePct < -1 && volRatio < 0.5) return sig('buy', 55, `缩量下跌，抛压减轻`);
  return sig('hold', 50, '量价正常');
}

/** Price position: near N-day high/low */
function pricePositionStrategy(ind) {
  const price = ind.latest.close;
  if (ind.boll.upper && ind.boll.lower) {
    const pos = (price - ind.boll.lower) / (ind.boll.upper - ind.boll.lower);
    if (pos < 0.1) return sig('buy', 75, '价格处于近期底部区域');
    if (pos < 0.25) return sig('buy', 60, '价格处于近期低位');
    if (pos > 0.9) return sig('sell', 75, '价格处于近期顶部区域');
    if (pos > 0.75) return sig('sell', 60, '价格处于近期高位');
    return sig('hold', 50, `价格处于区间${(pos*100).toFixed(0)}%位置`);
  }
  return sig('hold', 0, '数据不足');
}

// Strategy registry
const STRATEGIES = {
  'RSI指标策略':     { fn: rsiStrategy,        desc: '基于相对强弱指标判断超买超卖' },
  'MACD指标策略':    { fn: macdStrategy,       desc: '基于MACD金叉死叉判断趋势' },
  'BOLL指标策略':    { fn: bollStrategy,       desc: '基于布林带上下轨判断超涨超跌' },
  'KDJ指标策略':     { fn: kdjStrategy,        desc: '基于随机指标判断超买超卖' },
  '简单双均线策略':   { fn: maCrossoverStrategy, desc: '基于短期和长期均线交叉判断趋势' },
  '量价分析':        { fn: volumePriceStrategy, desc: '基于成交量和价格变化判断资金流向' },
  '价格位置':        { fn: pricePositionStrategy, desc: '判断当前价格在近期波动区间的位置' },
};

/**
 * Analyze a single stock with all strategies.
 * @param {string} code - stock code
 * @returns {{ code, name, price, indicators, signals: [{strategy, signal, strength, reason}] }}
 */
export async function analyzeStock(code) {
  const bars = await fetchKline(code, 120);
  const ind = computeAll(bars);

  const signals = [];
  for (const [name, cfg] of Object.entries(STRATEGIES)) {
    const result = cfg.fn(ind);
    signals.push({ strategy: name, ...result, desc: cfg.desc });
  }

  return {
    code,
    price: ind.latest.close,
    changePct: ind.latest.changePct,
    indicators: {
      rsi14: ind.rsi14,
      macd: ind.macd,
      boll: ind.boll,
      kdj: ind.kdj,
      sma5: ind.sma5,
      sma20: ind.sma20,
      sma60: ind.sma60,
      volRatio: ind.latest.volRatio,
    },
    signals: signals.sort((a, b) => b.strength - a.strength),
  };
}

/**
 * Analyze multiple stocks.
 */
export async function analyzeStocks(codes) {
  const results = [];
  for (const code of codes) {
    try {
      results.push(await analyzeStock(code));
    } catch (e) {
      results.push({ code, error: e.message });
    }
  }
  return results;
}
