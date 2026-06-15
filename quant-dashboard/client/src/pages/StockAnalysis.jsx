import { useTitle } from '../hooks/useTitle';
import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCakeCandles, faSearch, faSpinner, faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import usePortfolioData from '../hooks/usePortfolioData';
import { fetchKline } from '../services/api';

const PERIODS = [
  { key: 'day', label: '日K' },
  { key: 'week', label: '周K' },
  { key: 'month', label: '月K' },
];

/** Calculate Simple Moving Average */
function calcMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push(+(sum / period).toFixed(2));
  }
  return result;
}

/** Calculate MACD */
function calcMACD(data) {
  const closes = data.map(d => d.close);
  const ema12 = []; const ema26 = [];
  const dif = []; const dea = []; const macd = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { ema12.push(closes[0]); ema26.push(closes[0]); }
    else {
      ema12.push(+(closes[i] * 2 / 13 + ema12[i - 1] * 11 / 13).toFixed(4));
      ema26.push(+(closes[i] * 2 / 27 + ema26[i - 1] * 25 / 27).toFixed(4));
    }
    const d = +(ema12[i] - ema26[i]).toFixed(4);
    dif.push(d);
    if (i === 0) { dea.push(d); macd.push(0); }
    else {
      const de = +(d * 2 / 10 + dea[i - 1] * 8 / 10).toFixed(4);
      dea.push(de);
      macd.push(+((d - de) * 2).toFixed(4));
    }
  }
  return { dif, dea, macd };
}

/** Calculate RSI (14-period) */
function calcRSI(data, period = 14) {
  const rsi = [];
  const closes = data.map(d => d.close);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (i <= period) {
      if (diff > 0) avgGain += diff;
      else avgLoss += Math.abs(diff);
      if (i === period) { avgGain /= period; avgLoss /= period; rsi.push(+(100 - 100 / (1 + avgGain / (avgLoss || 1))).toFixed(2)); }
      else rsi.push(null);
    } else {
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
      rsi.push(+(100 - 100 / (1 + avgGain / (avgLoss || 1))).toFixed(2));
    }
  }
  return rsi;
}

export default function StockAnalysis() {
  useTitle('K线分析');
  const { positions } = usePortfolioData();
  const [code, setCode] = useState('');
  const [period, setPeriod] = useState('day');
  const [klines, setKlines] = useState([]);
  const [stockName, setStockName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadKline = useCallback(async (stockCode) => {
    if (!stockCode) return;
    setLoading(true); setError('');
    try {
      const data = await fetchKline(stockCode, period, 120);
      setKlines(data.klines || []);
      setStockName(data.name || stockCode);
    } catch (e) {
      setError('加载失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (code) loadKline(code);
  }, [code, period]);

  // Derived indicators
  const indicators = useMemo(() => {
    if (!klines.length) return {};
    return {
      ma5: calcMA(klines, 5),
      ma10: calcMA(klines, 10),
      ma20: calcMA(klines, 20),
      ma60: calcMA(klines, 60),
      ...calcMACD(klines),
      rsi: calcRSI(klines),
    };
  }, [klines]);

  // Main candlestick + MA + volume chart
  const mainOption = useMemo(() => {
    if (!klines.length) return {};
    const dates = klines.map(k => k.date);
    const ohlc = klines.map(k => [k.open, k.close, k.low, k.high]);
    const volumes = klines.map(k => k.volume);

    return {
      grid: { left: 8, right: 8, top: 8, bottom: 0, height: '60%' },
      xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#64748b', fontSize: 10, interval: Math.floor(dates.length / 8) } },
      series: [
        { name: 'K线', type: 'candlestick', data: ohlc,
          itemStyle: { color: '#ef4444', color0: '#22c55e', borderColor: '#ef4444', borderColor0: '#22c55e' } },
        { name: 'MA5', type: 'line', data: indicators.ma5, smooth: true, lineStyle: { width: 1, color: '#f59e0b' },
          symbol: 'none' },
        { name: 'MA10', type: 'line', data: indicators.ma10, smooth: true, lineStyle: { width: 1, color: '#06b6d4' },
          symbol: 'none' },
        { name: 'MA20', type: 'line', data: indicators.ma20, smooth: true, lineStyle: { width: 1, color: '#8b5cf6' },
          symbol: 'none' },
        { name: 'MA60', type: 'line', data: indicators.ma60, smooth: true, lineStyle: { width: 1, color: '#ec4899' },
          symbol: 'none' },
        { name: '成交量', type: 'bar', data: volumes, yAxisIndex: 1, barWidth: '60%',
          itemStyle: { color: (p) => {
            const i = p.dataIndex;
            return i > 0 && klines[i].close >= klines[i - 1].close ? '#ef444466' : '#22c55e66';
          } } },
      ],
      yAxis: [
        { type: 'value', scale: true, axisLabel: { color: '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
        { type: 'value', scale: true, axisLabel: { show: false }, splitLine: { show: false },
          gridIndex: 0, max: (v) => v.max * 4 },
      ],
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#6366f1',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      dataZoom: [{ type: 'inside', start: 50, end: 100 }, { type: 'slider', start: 50, end: 100, height: 20, bottom: 0,
        borderColor: '#334155', backgroundColor: '#0f172a', fillerColor: 'rgba(59,130,246,0.15)' }],
    };
  }, [klines, indicators]);

  // MACD sub-chart
  const macdOption = useMemo(() => {
    if (!klines.length) return {};
    return {
      grid: { left: 8, right: 8, top: 4, bottom: 4 },
      xAxis: { type: 'category', data: klines.map(k => k.date), axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [
        { name: 'DIF', type: 'line', data: indicators.dif, lineStyle: { width: 1, color: '#f59e0b' }, symbol: 'none' },
        { name: 'DEA', type: 'line', data: indicators.dea, lineStyle: { width: 1, color: '#06b6d4' }, symbol: 'none' },
        { name: 'MACD', type: 'bar', data: indicators.macd, barWidth: '60%',
          itemStyle: { color: (p) => p.value >= 0 ? '#ef444480' : '#22c55e80' } },
      ],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#6366f1', textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [klines, indicators]);

  // RSI sub-chart
  const rsiOption = useMemo(() => {
    if (!klines.length) return {};
    return {
      grid: { left: 8, right: 8, top: 4, bottom: 4 },
      xAxis: { type: 'category', data: klines.map(k => k.date), axisLabel: { color: '#64748b', fontSize: 10, interval: Math.floor(klines.length / 6) },
        axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#64748b', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [
        { name: 'RSI(14)', type: 'line', data: indicators.rsi, lineStyle: { width: 1.5, color: '#8b5cf6' }, symbol: 'none',
          markLine: { silent: true, data: [{ yAxis: 70, lineStyle: { color: '#ef4444', type: 'dashed', width: 1 } },
            { yAxis: 30, lineStyle: { color: '#22c55e', type: 'dashed', width: 1 } }],
            label: { fontSize: 9, color: '#64748b' } } },
      ],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#6366f1', textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [klines, indicators]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
      {/* Header */}
      <header className="relative flex h-[60px] shrink-0 items-center justify-between overflow-hidden border-b px-6"
        style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 via-purple-400/40 to-transparent" />
        <div className="relative z-10 flex items-center gap-4">
          <FontAwesomeIcon icon={faCakeCandles} className="text-sm" style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }} />
          <h1 className="text-xl font-bold tracking-widest text-white" style={{ textShadow: '0 0 14px rgba(59,130,246,0.4)' }}>
            {stockName || 'K线分析'}
          </h1>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          {/* Stock selector */}
          <div className="flex items-center gap-2">
            <select value={code} onChange={e => setCode(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              style={{ minWidth: 180 }}>
              <option value="">-- 选择持仓股票 --</option>
              {positions.map(p => (
                <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
              ))}
            </select>
            <div className="flex rounded overflow-hidden border border-slate-600">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => code && loadKline(code)} disabled={loading || !code}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-40">
            {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSearch} />}
          </button>
        </div>
      </header>

      {/* Chart area */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-2">
        {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-800/30 rounded px-3 py-2">{error}</div>}

        {!code && !klines.length && (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            请从上方选择一只持仓股票查看K线图
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-blue-400" />
          </div>
        )}

        {!loading && klines.length > 0 && (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 px-2 shrink-0">
              <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 bg-amber-400 inline-block"/>MA5</span>
              <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 bg-cyan-400 inline-block"/>MA10</span>
              <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 bg-purple-400 inline-block"/>MA20</span>
              <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 bg-pink-400 inline-block"/>MA60</span>
              <span className="text-[10px] text-slate-500 ml-auto">
                {klines[klines.length-1]?.date} 开:{klines[klines.length-1]?.open} 高:{klines[klines.length-1]?.high} 低:{klines[klines.length-1]?.low} 收:{klines[klines.length-1]?.close} 幅:{klines[klines.length-1]?.pctChg}%
              </span>
            </div>

            {/* Main candlestick chart */}
            <div className="flex-1 min-h-0" style={{ flex: '3' }}>
              <ReactECharts option={mainOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
            </div>

            {/* MACD */}
            <div className="shrink-0" style={{ height: 120 }}>
              <div className="text-[10px] text-slate-500 mb-1">MACD (12,26,9)</div>
              <ReactECharts option={macdOption} style={{ height: 'calc(100% - 16px)', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
            </div>

            {/* RSI */}
            <div className="shrink-0" style={{ height: 100 }}>
              <div className="text-[10px] text-slate-500 mb-1">RSI (14)</div>
              <ReactECharts option={rsiOption} style={{ height: 'calc(100% - 16px)', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
