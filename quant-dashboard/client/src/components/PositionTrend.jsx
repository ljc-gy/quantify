import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Card from './Card';

export default function PositionTrend({ positions, totalMarketVal }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal);
    return {
      grid: { left: 0, right: 12, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: v => (v/10000).toFixed(0)+'w' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } } },
      series: [
        { name: '市值', type: 'bar', data: sorted.map(p => p.marketVal), barWidth: '50%',
          itemStyle: { borderRadius: [4,4,0,0], color: '#06b6d4' },
          emphasis: { focus: 'series' } },
      ],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#6366f1',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (p) => p[0].name + '<br/>市值: ' + (p[0].value/10000).toFixed(2) + '万' },
    };
  }, [positions]);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between shrink-0 mb-1">
        <span className="text-[13px] font-semibold text-cyber-white tracking-wide">持仓市值</span>
        <span className="text-[11px] text-slate-400 font-mono">{(totalMarketVal/10000).toFixed(1)}万</span>
      </div>
      <div className="flex-1 min-h-0">
        {positions.length ? <ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate />
          : <div className="flex items-center justify-center h-full text-[12px] text-slate-500">暂无持仓数据</div>}
      </div>
    </Card>
  );
}
