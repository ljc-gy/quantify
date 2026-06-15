import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import Card from './Card';
import { useApiData } from '../hooks/useApiData';
import { fetchMarketHistory } from '../services/api';

function generateMockData() {
  const times = [];
  const volumes = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now); d.setHours(d.getHours() - i);
    const h = d.getHours(); const m = d.getMinutes();
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    const hourDecimal = h + m / 60;
    const isTrading = (hourDecimal >= 9.5 && hourDecimal <= 11.5) || (hourDecimal >= 13.5 && hourDecimal <= 15.0);
    volumes.push(isTrading ? Math.round(Math.random() * 8000 + 4000) : Math.round(Math.random() * 800 + 100));
  }
  return { times, volumes, rate: '+6.03%' };
}

export default function VolumeMonitor({
  rate: propRate,
  data: externalData,
}) {
  const { data: apiData, loading, error } = useApiData(fetchMarketHistory);
  const mock = useMemo(() => generateMockData(), []);

  const times = externalData?.times ?? apiData?.times ?? mock.times;
  const volumes = externalData?.volumes ?? apiData?.volumes ?? mock.volumes;
  const rate = propRate ?? apiData?.rate ?? mock.rate;

  const option = useMemo(() => ({
    grid: { left: 0, right: 12, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category', data: times, boundaryGap: true,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', interval: 4 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', formatter: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v },
      splitLine: { show: false },
    },
    series: [{
      type: 'bar', data: volumes, barWidth: '60%',
      itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#60a5fa' }, { offset: 1, color: '#3b82f6' }]) },
      emphasis: { itemStyle: { color: '#93c5fd' } },
    }],
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#3b82f6', borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12, fontFamily: 'JetBrains Mono, Consolas, monospace' },
      formatter: (params) => { const p = params[0]; return `<span style="color:#94a3b8">${p.axisValue}</span><br/><span style="font-size:15px;font-weight:600">${p.value.toLocaleString()} 手</span>`; },
    },
  }), [times, volumes]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-cyber-white tracking-wide">实时波动</span>
          {loading && !apiData && <span className="w-3 h-3 border border-cyber-blue-bright/40 border-t-transparent rounded-full animate-spin" />}
        </div>
        <span className="text-[13px] font-mono font-semibold text-cyber-cyan tracking-tight">{rate}</span>
      </div>
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
      </div>
    </Card>
  );
}
