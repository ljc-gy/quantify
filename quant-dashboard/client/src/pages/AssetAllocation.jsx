import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import usePortfolioData from '../hooks/usePortfolioData';

/* Reusable card shell */
function AssetCard({ title, children, rightContent }) {
  return (
    <div className="asset-card flex flex-col cursor-default">
      <div className="asset-card-title shrink-0">
        <span className="text-[15px] font-bold text-white tracking-wide">{title}</span>
        {rightContent && <div className="ml-auto">{rightContent}</div>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

/* Empty state */
function EmptyAssetCard({ title, message }) {
  return (
    <div className="asset-card flex items-center justify-center cursor-default">
      <div className="text-center">
        <span className="text-[13px] text-cyber-gray">{message || '暂无持仓数据'}</span>
      </div>
    </div>
  );
}

/* Card 1: Asset Total -- bar chart showing market value per stock */
function AssetTotalCard({ positions, totalMarketVal, totalPnl }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal);
    return {
      grid: { left: 0, right: 12, top: 18, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10, formatter: v => (v/10000).toFixed(0)+'w' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } } },
      series: [
        { name: '市值', type: 'bar', data: sorted.map(p => p.marketVal), barWidth: '50%',
          itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,
            [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#60a5fa' }]) },
          label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9, formatter: p => (p.value/10000).toFixed(1)+'w' },
        },
      ],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#3b82f6', borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontSize: 11 },
        formatter: (p) => `${p[0].name}<br/>市值: ${(p[0].value/10000).toFixed(2)}万` },
    };
  }, [positions]);

  return (
    <AssetCard title="资产总额" rightContent={
      <div className="flex items-center gap-4 text-[10px]">
        <span className="text-cyber-gray">总市值: <span className="text-white font-mono">{(totalMarketVal/10000).toFixed(1)}w</span></span>
        <span className={totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          总盈亏: <span className="font-mono">{totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)}</span>
        </span>
      </div>
    }>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
    </AssetCard>
  );
}

/* Card 2: Profit Ratio -- pie chart from real positions */
function ProfitRatioCard({ positions, totalMarketVal }) {
  const option = useMemo(() => {
    if (!positions.length || totalMarketVal <= 0) return {};
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal).slice(0, 5);
    const colors = ['#3b82f6','#06b6d4','#8b5cf6','#f59e0b','#22c55e'];
    const data = sorted.map((p,i) => ({
      value: parseFloat((p.marketVal / totalMarketVal * 100).toFixed(1)),
      name: p.name,
      itemStyle: { color: colors[i] },
    }));
    const remaining = 100 - data.reduce((s,d) => s + d.value, 0);
    if (remaining > 0) data.push({ value: parseFloat(remaining.toFixed(1)), name: '其他', itemStyle: { color: '#1e293b' } });
    return {
      series: [{ type: 'pie', radius: ['70%','85%'], center: ['50%','50%'], silent: true, label: { show: false }, emphasis: { disabled: true }, data }],
    };
  }, [positions, totalMarketVal]);

  if (!positions.length) return <EmptyAssetCard title="持仓占比" />;
  return (
    <AssetCard title="持仓占比">
      <div className="flex h-full">
        <div className="flex flex-col justify-center gap-3 pr-2">
          {positions.slice(0,4).map((p,i) => {
            const colors = ['#3b82f6','#06b6d4','#8b5cf6','#f59e0b'];
            return (
              <div key={i} className="flex items-center gap-2 cursor-default">
                <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: colors[i] }} />
                <span className="text-[11px] text-white">{p.name.length > 6 ? p.name.slice(0,6)+'..' : p.name}</span>
                <span className="text-[11px] text-cyber-gray font-mono ml-auto">{(p.marketVal/10000).toFixed(1)}w</span>
              </div>
            );
          })}
        </div>
        <div className="relative flex-1 flex items-center">
          <div className="relative w-full h-full">
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
          </div>
        </div>
      </div>
    </AssetCard>
  );
}

/* Card 3: Core Overview */
function CoreOverviewCard({ positions, totalMarketVal, totalPnl, dayPnlPct }) {
  const donutConfig = useMemo(() => {
    if (!positions.length || totalMarketVal <= 0) return {};
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal).slice(0, 4);
    const colors = ['#3b82f6','#06b6d4','#f59e0b','#8b5cf6'];
    return {
      series: [{ type: 'pie', radius: ['60%','80%'], center: ['50%','50%'], silent: true, label: { show: false }, emphasis: { disabled: true },
        data: sorted.map((p,i) => ({
          value: parseFloat((p.marketVal / totalMarketVal * 100).toFixed(1)),
          name: p.name,
          itemStyle: { color: colors[i] },
        })),
      }],
    };
  }, [positions, totalMarketVal]);

  const profitData = useMemo(() => {
    if (!positions.length) return {};
    const win = positions.filter(p => (p.pnl||0) >= 0).length;
    const lose = positions.filter(p => (p.pnl||0) < 0).length;
    return {
      series: [{ type: 'pie', radius: ['60%','80%'], center: ['50%','50%'], silent: true, label: { show: false }, emphasis: { disabled: true },
        data: [
          { value: win, itemStyle: { color: '#22c55e' }, name: '盈利' },
          { value: lose, itemStyle: { color: '#ef4444' }, name: '亏损' },
        ],
      }],
    };
  }, [positions]);

  if (!positions.length) return <EmptyAssetCard title="核心资产概览" message="暂无持仓，去持仓明细添加股票" />;

  return (
    <AssetCard title="核心资产概览">
      <div className="flex flex-col h-full gap-4">
        <div className="flex gap-4 shrink-0" style={{ height: '38%' }}>
          <div className="flex-1 gradient-num-card" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
            <div className="flex items-start justify-between">
              <span className="text-[12px] text-white/80">总资产</span>
              <span className="text-[10px] text-white/50">{positions.length}只股票</span>
            </div>
            <div className="mt-1"><span className="text-[48px] font-bold text-white leading-none">{(totalMarketVal/10000).toFixed(1)}</span></div>
            <div className="flex items-center gap-1 mt-1">
              <FontAwesomeIcon icon={totalPnl >= 0 ? faArrowUp : faArrowDown} className="text-[10px]" style={{color: totalPnl>=0?'#4ade80':'#f87171'}} />
              <span className="text-[11px]" style={{color: totalPnl>=0?'#4ade80':'#f87171'}}>
                总盈亏 {totalPnl>=0?'+':''}{totalPnl.toFixed(0)}元
              </span>
            </div>
          </div>
          <div className="flex-1 gradient-num-card" style={{ background: 'linear-gradient(135deg, #06b6d4, #22d3ee)' }}>
            <div className="flex items-start justify-between">
              <span className="text-[12px] text-white/80">日收益率</span>
              <span className="text-[10px] text-white/50">实时</span>
            </div>
            <div className="mt-1"><span className="text-[48px] font-bold text-white leading-none">
              {dayPnlPct>=0?'+':''}{dayPnlPct.toFixed(2)}
            </span></div>
            <div className="flex items-center gap-1 mt-1">
              <FontAwesomeIcon icon={dayPnlPct>=0 ? faArrowUp : faArrowDown} className="text-[10px]" style={{color: dayPnlPct>=0?'#4ade80':'#f87171'}} />
              <span className="text-[11px]" style={{color: dayPnlPct>=0?'#4ade80':'#f87171'}}>
                {dayPnlPct>=0?'+':''}{dayPnlPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 flex-1 min-h-0">
          {[
            { title: '资产配置', items: positions.slice(0,4).map((p,i) => {
                const colors = ['#3b82f6','#06b6d4','#f59e0b','#8b5cf6'];
                return { n: p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name, p: `${(p.marketVal/totalMarketVal*100).toFixed(0)}%`, c: colors[i] };
              }), opt: donutConfig },
            { title: '盈亏分布', items: [
                { n: '盈利', p: `${positions.filter(p=>(p.pnl||0)>=0).length}只`, c: '#22c55e' },
                { n: '亏损', p: `${positions.filter(p=>(p.pnl||0)<0).length}只`, c: '#ef4444' },
              ], opt: profitData },
          ].map(d => (
            <div key={d.title} className="flex-1 flex flex-col">
              <span className="text-[11px] text-cyber-gray text-center shrink-0">{d.title}</span>
              <div className="relative flex-1">
                <ReactECharts option={d.opt} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
              </div>
              <div className="flex justify-center gap-4 shrink-0">
                {d.items.map(it => (
                  <span key={it.n} className="flex items-center gap-1 text-[9px] text-cyber-gray cursor-default">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: it.c }} />
                    {it.n} {it.p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AssetCard>
  );
}

/* ================================================================
   Main Page
   ================================================================ */

export default function AssetAllocationPage() {
  const { positions, loading, totalMarketVal, totalPnl, dayPnlPct } = usePortfolioData();

  return (
    <div className="flex-1 overflow-auto p-5" style={{ background: 'linear-gradient(135deg, #070b14 0%, #0f172a 100%)' }}>
      <div className="grid h-full gap-5" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
        <AssetTotalCard positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} />
        <ProfitRatioCard positions={positions} totalMarketVal={totalMarketVal} />
        <div className="col-span-2">
          <CoreOverviewCard positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} dayPnlPct={dayPnlPct} />
        </div>
      </div>
    </div>
  );
}
