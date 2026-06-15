import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Card from './Card';

/**
 * HistoricalReturns — horizontal bar chart of P&L per stock.
 * Accepts real portfolio positions from the shared hook.
 */
export default function HistoricalReturns({ positions, totalPnl }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    const names = sorted.map(p => p.name.length > 5 ? p.name.slice(0, 5) + '..' : p.name);
    const values = sorted.map(p => parseFloat((p.pnl || 0).toFixed(0)));
    return {
      grid: { left: 0, right: 16, top: 4, bottom: 0, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: v => (v / 10000).toFixed(1) + 'w' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        inverse: true,
      },
      series: [{
        type: 'bar',
        data: values.map(v => ({
          value: v,
          itemStyle: {
            color: v >= 0 ? '#22c55e' : '#ef4444',
            borderRadius: v >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4],
          },
        })),
        barWidth: '55%',
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 9,
          formatter: p => (p.value / 10000).toFixed(2) + 'w',
        },
      }],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#6366f1',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: p => p[0].name + '<br/>' + '盈亏：' + p[0].value.toLocaleString(),
      },
    };
  }, [positions]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <span className="text-[13px] font-semibold text-cyber-white tracking-wide">历史收益</span>
        <span className="text-[11px] font-mono" style={{ color: (totalPnl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
          {(totalPnl || 0) >= 0 ? '+' : ''}{(totalPnl || 0).toFixed(0)}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        {positions.length ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        ) : (
          <div className="flex items-center justify-center h-full text-[12px] text-slate-500">暂无持仓数据</div>
        )}
      </div>
    </Card>
  );
}
