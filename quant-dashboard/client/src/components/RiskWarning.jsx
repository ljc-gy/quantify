import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Card from './Card';

export default function RiskWarning({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => (b.pnlPct||0) - (a.pnlPct||0));
    return {
      grid: { left: 0, right: 12, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#64748b', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } } },
      series: [{
        type: 'bar', data: sorted.map(p => parseFloat((p.pnlPct||0).toFixed(2))), barWidth: '50%',
        itemStyle: { borderRadius: [4,4,0,0],
          color: (p) => p.value >= 0 ? '#22c55e' : '#ef4444' },
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9, formatter: '{c}%' },
      }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#6366f1',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
    };
  }, [positions]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <span className="text-[13px] font-semibold text-cyber-white tracking-wide">盈亏分布</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-[#22c55e]"/>盈利</span>
          <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-[#ef4444]"/>亏损</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {positions.length ? <ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate />
          : <div className="flex items-center justify-center h-full text-[12px] text-slate-500">暂无持仓数据</div>}
      </div>
    </Card>
  );
}
