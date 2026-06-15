import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useApiData } from '../hooks/useApiData';
import { fetchVolatilityCone } from '../services/api';
import { generateMockCone } from '../mock/volatilityCone';
import ChartLoader from './ChartLoader';


/* ================================================================
   Component
   ================================================================ */

export default function VolatilityConeChart({ title = '波动率锥' }) {
  const { data: apiData, loading, error } = useApiData(fetchVolatilityCone);

  const mock = useMemo(() => generateMockCone(), []);
  const windows = apiData?.windows ?? mock.windows;
  const seriesData = apiData?.series ?? mock.series;

  const option = useMemo(() => {
    if (!seriesData || seriesData.length === 0) return null;

    const xLabels = windows.map((w) => `${w}d`);

    // Extract arrays for each band
    const minVals  = seriesData.map((d) => d.min);
    const p25Vals  = seriesData.map((d) => d.p25);
    const medVals  = seriesData.map((d) => d.median);
    const p75Vals  = seriesData.map((d) => d.p75);
    const maxVals  = seriesData.map((d) => d.max);
    const currVals = seriesData.map((d) => d.current);

    // Build stacked area bands (each band = difference to its lower neighbor)
    const bandMinToP25 = minVals.map((_, i) => p25Vals[i] - minVals[i]);
    const bandP25ToMed = p25Vals.map((_, i) => medVals[i] - p25Vals[i]);
    const bandMedToP75 = medVals.map((_, i) => p75Vals[i] - medVals[i]);
    const bandP75ToMax = p75Vals.map((_, i) => maxVals[i] - p75Vals[i]);

    return {
      grid: { left: 48, right: 24, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, Consolas, monospace' },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '年化波动率 (%)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.10)', type: 'dashed' } },
      },
      series: [
        // Stack 1: min → invisible base (just sets the floor)
        {
          name: 'min-base',
          type: 'line',
          data: minVals,
          stack: 'cone',
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          areaStyle: { opacity: 0 },
          symbol: 'none',
          emphasis: { disabled: true },
        },
        // Stack 2: min → p25 band (outer lower)
        {
          name: 'min–P25',
          type: 'line',
          data: bandMinToP25,
          stack: 'cone',
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          symbol: 'none',
          areaStyle: {
            color: 'rgba(6, 182, 212, 0.08)',
          },
          emphasis: { disabled: true },
        },
        // Stack 3: p25 → median band (inner lower)
        {
          name: 'P25–中位数',
          type: 'line',
          data: bandP25ToMed,
          stack: 'cone',
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          symbol: 'none',
          areaStyle: {
            color: 'rgba(6, 182, 212, 0.18)',
          },
          emphasis: { disabled: true },
        },
        // Stack 4: median → p75 band (inner upper)
        {
          name: '中位数–P75',
          type: 'line',
          data: bandMedToP75,
          stack: 'cone',
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          symbol: 'none',
          areaStyle: {
            color: 'rgba(6, 182, 212, 0.18)',
          },
          emphasis: { disabled: true },
        },
        // Stack 5: p75 → max band (outer upper)
        {
          name: 'P75–max',
          type: 'line',
          data: bandP75ToMax,
          stack: 'cone',
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          symbol: 'none',
          areaStyle: {
            color: 'rgba(6, 182, 212, 0.08)',
          },
          emphasis: { disabled: true },
        },
        // Median line
        {
          name: '中位数',
          type: 'line',
          data: medVals,
          lineStyle: { color: '#06b6d4', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#06b6d4' },
          symbol: 'none',
          z: 10,
        },
        // Current HV line + dots
        {
          name: '当前HV',
          type: 'line',
          data: currVals,
          lineStyle: { color: '#f59e0b', width: 2 },
          itemStyle: { color: '#f59e0b', borderColor: '#0f172a', borderWidth: 2 },
          symbol: 'circle',
          symbolSize: 8,
          z: 20,
        },
      ],
      legend: {
        top: 0,
        right: 8,
        textStyle: { color: '#94a3b8', fontSize: 10 },
        itemWidth: 10,
        itemHeight: 6,
        data: [
          { name: '中位数', icon: 'line' },
          { name: '当前HV', icon: 'circle' },
        ],
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#06b6d4',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontSize: 11, fontFamily: 'JetBrains Mono, Consolas, monospace' },
        formatter: (params) => {
          const idx = params[0]?.dataIndex ?? 0;
          const d = seriesData[idx];
          if (!d) return '';
          return `
            <div style="font-weight:600;margin-bottom:4px">窗口: ${d.window}天</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:10px">
              <span style="color:#64748b">最大值</span><span style="color:#f87171">${d.max}%</span>
              <span style="color:#64748b">P75</span><span style="color:#cbd5e1">${d.p75}%</span>
              <span style="color:#64748b">中位数</span><span style="color:#06b6d4">${d.median}%</span>
              <span style="color:#64748b">P25</span><span style="color:#cbd5e1">${d.p25}%</span>
              <span style="color:#64748b">最小值</span><span style="color:#f87171">${d.min}%</span>
              <span style="color:#64748b;margin-top:4px">当前HV</span><span style="color:#f59e0b;margin-top:4px;font-weight:600">${d.current}%</span>
            </div>
          `;
        },
      },
    };
  }, [windows, seriesData]);

  return (
    <div className="quant-card" style={{ flex: 1, minHeight: 0 }}>
      <div
        className="quant-card-title"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(6, 182, 212, 0.15)',
          flexShrink: 0,
        }}
      >
        <span className="title-text">{title}</span>
        <div className="flex items-center gap-2">
          {loading && !apiData && (
            <span className="w-3 h-3 border border-cyan-400/40 border-t-transparent rounded-full animate-spin" />
          )}
          {error && !apiData && (
            <span className="text-[10px] text-red-400/60" title={error}>离线</span>
          )}
          <span className="text-[9px] text-cyber-gray">20–252天 历史HV分布</span>
        </div>
      </div>
      <div className="flex-1 min-h-0" style={{ padding: '4px' }}>
        {option ? (
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
        ) : (
          loading && !apiData ? <ChartLoader text="加载波动率数据..." /> : <div className="flex items-center justify-center h-full text-cyber-gray text-xs">暂无数据</div>
        )}
      </div>
    </div>
  );
}
