import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Card from './Card';

function genMock() {
  const dates = []; const ohlc = []; let close = 42.50;
  const now = new Date();
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    dates.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`);
    const open = close;
    const change = (Math.random() - 0.45) * 2.0;
    close = +(open + change).toFixed(2);
    const high = +Math.max(open, close + Math.random() * 0.8).toFixed(2);
    const low = +Math.min(open, close - Math.random() * 0.8).toFixed(2);
    ohlc.push([open, close, low, high]);
  }
  return { dates, ohlc };
}

export default function RiskAssessment({
  riskLevel: propRisk,
  data: externalData,
  onViewDetail,
  onRiskSetting,
}) {
  const mock = useMemo(() => genMock(), []);

  const dates = externalData?.dates ?? mock.dates;
  const ohlc = externalData?.ohlc ?? mock.ohlc;
  const riskLevel = propRisk ?? externalData?.riskLevel ?? '低风险';

  const ma5 = useMemo(() => {
    return ohlc.map((_, i) => {
      if (i < 4) return null;
      let sum = 0;
      for (let j = i - 4; j <= i; j++) sum += ohlc[j][1];
      return +(sum / 5).toFixed(2);
    });
  }, [ohlc]);

  const option = useMemo(() => ({
    grid: { left: 0, right: 12, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category', data: dates, boundaryGap: true,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace' },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, Consolas, monospace', formatter: (v) => v.toFixed(2) },
      splitLine: { show: false },
    },
    series: [
      { name: 'K线', type: 'candlestick', data: ohlc, itemStyle: { color: '#22c55e', color0: '#ef4444', borderColor: '#22c55e', borderColor0: '#ef4444' } },
      { name: 'MA5', type: 'line', data: ma5, smooth: true, symbol: 'none', lineStyle: { color: '#f97316', width: 1.5 } },
    ],
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#22c55e', borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12, fontFamily: 'JetBrains Mono, Consolas, monospace' },
      formatter: (params) => {
        const k = params.find((p) => p.seriesName === 'K线');
        const m = params.find((p) => p.seriesName === 'MA5');
        let html = `<span style="color:#94a3b8">${k.axisValue}</span><br/>`;
        if (k) { const [open, close, low, high] = k.data; html += `开: ${open.toFixed(2)} 收: ${close.toFixed(2)}<br/>低: ${low.toFixed(2)} 高: ${high.toFixed(2)}<br/>`; }
        if (m && m.value != null) html += `<span style="color:#f97316">MA5: ${m.value.toFixed(2)}</span>`;
        return html;
      },
    },
  }), [dates, ohlc, ma5]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <span className="text-[13px] font-semibold text-cyber-white tracking-wide">风险评估</span>
        <span className="text-[13px] font-mono font-semibold text-emerald-400 tracking-tight">{riskLevel}</span>
      </div>
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
      </div>
      <div className="flex gap-2 shrink-0 mt-2">
        <button onClick={onViewDetail} className="flex-1 py-1.5 rounded-md text-[11px] font-medium text-cyber-cyan border border-cyber-cyan/25 bg-cyber-cyan/8 hover:bg-cyber-cyan/15 transition-colors">查看详情</button>
        <button onClick={onRiskSetting} className="flex-1 py-1.5 rounded-md text-[11px] font-medium text-cyber-pink border border-cyber-pink/25 bg-cyber-pink/8 hover:bg-cyber-pink/15 transition-colors">风险预警设置</button>
      </div>
    </Card>
  );
}
