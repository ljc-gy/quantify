import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Card from './Card';

/**
 * RiskMetrics — per-stock risk gauge: P&L% range and cost-vs-current comparison.
 * Accepts real portfolio positions.
 */
export default function RiskMetrics({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const stocks = positions.map(p => ({
      name: p.name.length > 5 ? p.name.slice(0, 5) + '..' : p.name,
      pnlPct: parseFloat((p.pnlPct || 0).toFixed(2)),
      cost: parseFloat((p.costPrice || 0).toFixed(2)),
      cur: parseFloat((p.curPrice || 0).toFixed(2)),
    }));
    const categories = stocks.map(s => s.name);
    return {
      grid: { left: 0, right: 16, top: 4, bottom: 0, containLabel: true },
      legend: {
        data: ['成本价', '现价'],
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 10 },
        itemWidth: 10,
        itemHeight: 8,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      },
      series: [
        {
          name: '成本价',
          type: 'bar',
          data: stocks.map(s => s.cost),
          barWidth: '35%',
          barGap: '20%',
          itemStyle: { color: '#64748b', borderRadius: [3, 3, 0, 0] },
        },
        {
          name: '现价',
          type: 'bar',
          data: stocks.map(s => ({
            value: s.cur,
            itemStyle: {
              color: s.cur >= s.cost ? '#22c55e' : '#ef4444',
              borderRadius: [3, 3, 0, 0],
            },
          })),
          barWidth: '35%',
          label: {
            show: true,
            position: 'top',
            color: '#94a3b8',
            fontSize: 9,
            formatter: p => {
              const idx = p.dataIndex;
              return stocks[idx] ? stocks[idx].pnlPct + '%' : '';
            },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#6366f1',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
    };
  }, [positions]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <span className="text-[13px] font-semibold text-cyber-white tracking-wide">风险评估</span>
        <span className="text-[10px] text-slate-500">成本 vs 现价</span>
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
