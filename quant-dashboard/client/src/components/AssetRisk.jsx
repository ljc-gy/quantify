import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Card from './Card';

const ASSETS = ['股票', '基金', '债券', '期货', '期权', '现金', '黄金', '外汇', '其他'];

function genMock() {
  const posRisk = ASSETS.map(() => +(Math.random() * 80 + 10).toFixed(1));
  const mktRisk = ASSETS.map(() => +(Math.random() * 60 + 15).toFixed(1));
  return { assets: ASSETS, posRisk, mktRisk };
}

export default function AssetRisk({ data: externalData, onCombine, onCompare, onExport }) {
  const mock = useMemo(() => genMock(), []);

  const assets = externalData?.assets ?? mock.assets;
  const posRisk = externalData?.posRisk ?? mock.posRisk;
  const mktRisk = externalData?.mktRisk ?? mock.mktRisk;

  const option = useMemo(() => ({
    grid: { left: 0, right: 12, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category', data: assets, boundaryGap: true,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono, Consolas, monospace' },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', formatter: (v) => v.toFixed(1) },
      splitLine: { show: false },
    },
    series: [
      { name: '持仓风险', type: 'bar', data: posRisk, barWidth: '50%', barGap: '20%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#00e5ff' } },
      { name: '市场风险', type: 'bar', data: mktRisk, barWidth: '50%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#ef4444' } },
    ],
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#6366f1', borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12, fontFamily: 'JetBrains Mono, Consolas, monospace' },
      formatter: (params) => {
        let html = `<span style="color:#94a3b8">${params[0].axisValue}</span><br/>`;
        params.forEach((p) => { html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px"></span>${p.seriesName}: <span style="font-weight:600">${p.value.toFixed(1)}</span><br/>`; });
        return html;
      },
    },
  }), [assets, posRisk, mktRisk]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <span className="text-[13px] font-semibold text-cyber-white tracking-wide">风险评估</span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-cyber-cyan" />持仓风险</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" />市场风险</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
      </div>
      <div className="flex gap-2 shrink-0 mt-2">
        <button onClick={onCombine} className="flex-1 py-1.5 rounded-md text-[11px] font-medium text-cyber-cyan border border-cyber-cyan/25 bg-cyber-cyan/8 hover:bg-cyber-cyan/15 transition-colors">合成</button>
        <button onClick={onCompare} className="flex-1 py-1.5 rounded-md text-[11px] font-medium text-cyber-purple border border-cyber-purple/25 bg-cyber-purple/8 hover:bg-cyber-purple/15 transition-colors">对比</button>
        <button onClick={onExport} className="flex-1 py-1.5 rounded-md text-[11px] font-medium text-cyber-pink border border-cyber-pink/25 bg-cyber-pink/8 hover:bg-cyber-pink/15 transition-colors">导出报告</button>
      </div>
    </Card>
  );
}
