import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import Card from './Card';
import { useApiData } from '../hooks/useApiData';
import { fetchAssetOverview } from '../services/api';

function generateMockData() {
  const now = new Date();
  const dates = [];
  const values = [];
  let base = 1280000;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`);
    base += Math.round((Math.random() * 0.04 - 0.005) * base * 0.8);
    base = Math.max(base, 1250000);
    values.push(base);
  }
  return { dates, values, total: '1,284,500.00', rate: '+12.5%' };
}

export default function AssetOverview({
  total: propTotal,
  rate: propRate,
  data: externalData,
}) {
  const { data: apiData, loading, error } = useApiData(fetchAssetOverview);

  const mock = useMemo(() => generateMockData(), []);

  // Priority: externalData > apiData > mock
  const effective = {
    dates: externalData?.dates ?? apiData?.dates ?? mock.dates,
    values: externalData?.values ?? apiData?.values ?? mock.values,
    total: propTotal ?? apiData?.total ?? mock.total,
    rate: propRate ?? apiData?.rate ?? mock.rate,
  };

  const option = useMemo(() => ({
    grid: { left: 0, right: 12, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category', data: effective.dates, boundaryGap: false,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', interval: 6 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', formatter: (v) => (v / 10000).toFixed(0) + 'w' },
      splitLine: { show: false },
    },
    series: [{
      type: 'line', data: effective.values, smooth: true, symbol: 'none',
      lineStyle: { width: 2, color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#06b6d4' }, { offset: 1, color: '#22d3ee' }]) },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(6, 182, 212, 0.25)' }, { offset: 1, color: 'rgba(6, 182, 212, 0.02)' }]) },
      emphasis: { focus: 'series', symbol: 'circle', symbolSize: 6, itemStyle: { color: '#22d3ee', borderColor: '#0a0e17', borderWidth: 2 } },
    }],
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#6366f1', borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12, fontFamily: 'JetBrains Mono, Consolas, monospace' },
      formatter: (params) => {
        const p = params[0];
        return `<span style="color:#94a3b8">${p.axisValue}</span><br/><span style="font-size:15px;font-weight:600">¥${(p.value / 10000).toFixed(2)}w</span>`;
      },
    },
  }), [effective.dates, effective.values]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-cyber-white tracking-wide">资产总览</span>
          {loading && !apiData && <span className="w-3 h-3 border border-cyber-cyan/40 border-t-transparent rounded-full animate-spin" />}
          {error && !apiData && <span className="text-[10px] text-red-400/60" title={error}>离线</span>}
        </div>
        <span className="text-[13px] font-mono font-semibold text-emerald-400 tracking-tight">{effective.rate}</span>
      </div>
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
      </div>
    </Card>
  );
}
