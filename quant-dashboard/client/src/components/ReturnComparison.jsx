import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Card from './Card';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e', '#ef4444', '#a78bfa'];

/**
 * ReturnComparison — pie/doughnut chart of market-value distribution per stock.
 * Accepts real portfolio positions.
 */
export default function ReturnComparison({ positions, totalMarketVal }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a, b) => b.marketVal - a.marketVal);
    const data = sorted.map((p, i) => ({
      name: p.name,
      value: parseFloat((p.marketVal || 0).toFixed(2)),
      itemStyle: { color: COLORS[i % COLORS.length] },
    }));
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#6366f1',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 10 },
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 8,
        formatter: name => name.length > 6 ? name.slice(0, 6) + '..' : name,
      },
      series: [{
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold', color: '#e2e8f0' },
          scaleSize: 8,
        },
        data,
      }],
    };
  }, [positions]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <span className="text-[13px] font-semibold text-cyber-white tracking-wide">市值分布</span>
        <span className="text-[11px] text-slate-400 font-mono">
          {(totalMarketVal / 10000).toFixed(1)}万
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
