import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import Card from './Card';
import { useApiData } from '../hooks/useApiData';
import { fetchMarketRealtime } from '../services/api';

function generateMockData() {
  const times = [];
  const prices = [];
  let base = 42.80;
  for (let h = 9; h <= 15; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 9 && m < 30) continue;
      if (h === 11 && m > 30) continue;
      if (h === 12) continue;
      if (h === 15 && m > 0) break;
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      base += (Math.random() - 0.48) * 0.15;
      base = Math.max(42.30, Math.min(43.30, base));
      prices.push(+base.toFixed(2));
    }
  }
  return { times, prices, change: '-0.8%' };
}

export default function VolatilityMonitor({
  change: propChange,
  data: externalData,
}) {
  const { data: apiData, loading, error } = useApiData(fetchMarketRealtime);

  const mock = useMemo(() => generateMockData(), []);

  const times = externalData?.times ?? apiData?.times ?? mock.times;
  const prices = externalData?.prices ?? apiData?.prices ?? mock.prices;
  const change = propChange ?? apiData?.change ?? mock.change;

  const option = useMemo(() => ({
    grid: { left: 0, right: 12, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category', data: times, boundaryGap: false,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', interval: Math.floor(times.length / 5) },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', formatter: (v) => v.toFixed(2) },
      splitLine: { show: false },
    },
    series: [{
      type: 'line', data: prices, smooth: true, symbol: 'none',
      lineStyle: { width: 2, color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#a78bfa' }]) },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(139, 92, 246, 0.25)' }, { offset: 1, color: 'rgba(139, 92, 246, 0.02)' }]) },
      emphasis: { focus: 'series', symbol: 'circle', symbolSize: 6, itemStyle: { color: '#a78bfa', borderColor: '#0a0e17', borderWidth: 2 } },
    }],
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#8b5cf6', borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12, fontFamily: 'JetBrains Mono, Consolas, monospace' },
      formatter: (params) => {
        const p = params[0];
        return `<span style="color:#94a3b8">${p.axisValue}</span><br/><span style="font-size:15px;font-weight:600">¥${p.value.toFixed(2)}</span>`;
      },
    },
  }), [times, prices]);

  const isNegative = change.startsWith('-');

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-cyber-white tracking-wide">实时波动</span>
          {loading && !apiData && <span className="w-3 h-3 border border-cyber-purple/40 border-t-transparent rounded-full animate-spin" />}
          {error && !apiData && <span className="text-[10px] text-red-400/60" title={error}>离线</span>}
        </div>
        <span className={`text-[13px] font-mono font-semibold tracking-tight ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
          {change}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
      </div>
    </Card>
  );
}
