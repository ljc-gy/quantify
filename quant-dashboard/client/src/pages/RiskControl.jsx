import { useMemo } from 'react';
import { useTitle } from '../hooks/useTitle';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGem, faExclamationTriangle, faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import usePortfolioData from '../hooks/usePortfolioData';

function RiskCard({ title, children, rightContent }) {
  return (
    <div className="risk-card">
      <div className="risk-card-title">
        <FontAwesomeIcon icon={faGem} className="diamond" />
        <span className="title-text">{title}</span>
        {rightContent && <div className="ml-auto">{rightContent}</div>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function EmptyRiskCard({ title }) {
  return (
    <div className="risk-card flex items-center justify-center">
      <span className="text-[13px] text-cyber-gray">暂无持仓数据</span>
    </div>
  );
}

/* Risk Gauge -- computed from real positions */
function RiskOverviewCard({ positions }) {
  const riskScore = useMemo(() => {
    if (!positions.length) return 0;
    const pnlPcts = positions.map(p => Math.abs(p.pnlPct||0));
    const maxConc = Math.max(...positions.map(p => p.marketVal||0), 1);
    const total = positions.reduce((s,p) => s + (p.marketVal||0), 1);
    const concentration = maxConc / total;
    const avgVol = pnlPcts.reduce((a,b)=>a+b,0) / pnlPcts.length;
    return Math.min(95, Math.round(avgVol * 3 + concentration * 40));
  }, [positions]);

  const pnlPcts = positions.map(p => p.pnlPct||0);
  const mean = pnlPcts.length ? pnlPcts.reduce((a,b)=>a+b,0)/pnlPcts.length : 0;
  const variance = pnlPcts.length > 1 ? pnlPcts.reduce((s,v) => s+(v-mean)**2,0)/pnlPcts.length : 0;
  const vol = Math.sqrt(variance).toFixed(2);
  const sorted = [...positions].sort((a,b) => (a.pnlPct||0) - (b.pnlPct||0));
  const var95 = (sorted[Math.max(0,Math.floor(sorted.length*0.05))]?.pnlPct || 0).toFixed(2);
  const cvar = sorted.length > 1 ? (sorted.slice(0, Math.max(1, Math.ceil(sorted.length*0.05)))
    .reduce((s,p) => s + (p.pnlPct||0), 0) / Math.max(1, Math.ceil(sorted.length*0.05))).toFixed(2) : var95;

  const option = useMemo(() => ({
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, center: ['50%','58%'], radius: '85%', min: 0, max: 100, splitNumber: 10,
      axisLine: { lineStyle: { width: 14, color: [[0.35,'#22c55e'],[0.65,'#f59e0b'],[1,'#ef4444']] } },
      pointer: { icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z', length: '65%', width: 8, itemStyle: { color: '#3b82f6' } },
      axisTick: { distance: -14, length: 6, lineStyle: { color: '#94a3b8', width: 1 } },
      splitLine: { distance: -18, length: 12, lineStyle: { color: '#94a3b8', width: 2 } },
      axisLabel: { color: '#94a3b8', fontSize: 10, distance: 20 },
      detail: { valueAnimation: true, formatter: '{value}', color: '#fff', fontSize: 36, fontWeight: 'bold',
        offsetCenter: [0,'55%'] },
      data: [{ value: riskScore, name: '风险评分' }],
    }],
  }), [riskScore]);

  const metrics = [
    { label: 'VaR (95%)', value: `${var95}%`, color: '#f59e0b' },
    { label: 'CVaR', value: `${cvar}%`, color: '#ef4444' },
    { label: '波动率', value: `${vol}%`, color: '#f59e0b' },
    { label: '持仓数', value: `${positions.length}`, color: '#3b82f6' },
  ];

  return (
    <RiskCard title="风险总览" rightContent={
      <span className="flex items-center gap-1.5 text-[10px] text-cyber-gray">
        <FontAwesomeIcon icon={faClock} className="text-[9px]" />实时更新
      </span>
    }>
      <div className="flex h-full">
        <div className="flex-1 relative">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-cyber-gray">
            {riskScore < 35 ? '低风险' : riskScore < 65 ? '中等风险' : '高风险'}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 w-[100px] shrink-0">
          {metrics.map(m => (
            <div key={m.label} className="text-center">
              <div className="text-[10px] text-cyber-gray">{m.label}</div>
              <div className="text-[14px] font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </RiskCard>
  );
}

/* Risk Trend -- bar chart of P&L% by position */
function RiskTrendCard({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => (b.pnlPct||0) - (a.pnlPct||0));
    return {
      grid: { left: 0, right: 14, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 9 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 9, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(100,116,139,0.1)' } } },
      series: [
        { name: '盈亏%', type: 'bar', data: sorted.map(p => parseFloat((p.pnlPct||0).toFixed(2))),
          itemStyle: { borderRadius: [4,4,0,0],
            color: (p) => p.value >= 0
              ? new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#22c55e'},{offset:1,color:'#16a34a'}])
              : new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ef4444'},{offset:1,color:'#dc2626'}])
          },
          label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9, formatter: '{c}%' },
        },
      ],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#3b82f6',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [positions]);

  return (
    <RiskCard title="持仓风险分布" rightContent={
      <div className="flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-[#22c55e]" />盈利</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-[#ef4444]" />亏损</span>
      </div>
    }>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
    </RiskCard>
  );
}

/* Risk Distribution Donut */
function RiskDistroCard({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const win = positions.filter(p => (p.pnl||0) >= 0).length;
    const lose = positions.filter(p => (p.pnl||0) < 0).length;
    return {
      series: [{ type: 'pie', radius: ['55%','80%'], center: ['50%','50%'],
        label: { show: true, color: '#94a3b8', fontSize: 10, formatter: '{b}\n{c}只' },
        data: [
          { value: win, name: '盈利', itemStyle: { color: '#22c55e' } },
          { value: lose, name: '亏损', itemStyle: { color: '#ef4444' } },
        ],
        emphasis: { scaleSize: 6 },
      }],
      tooltip: { trigger: 'item', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#3b82f6',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [positions]);

  return (
    <RiskCard title="盈亏分布">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
    </RiskCard>
  );
}

/* Risk Warnings */
function RiskWarningsCard({ positions }) {
  const warnings = useMemo(() => {
    const list = [];
    positions.forEach(p => {
      if ((p.pnlPct||0) < -5) list.push({ type: 'danger', msg: `${p.name} 跌幅超5%: ${(p.pnlPct||0).toFixed(1)}%`, color: '#ef4444' });
    });
    if (!list.length) list.push({ type: 'ok', msg: '当前无高风险持仓', color: '#22c55e' });
    return list;
  }, [positions]);

  return (
    <RiskCard title="风险预警" rightContent={<span className="text-[10px] text-cyber-gray">{warnings.length}条</span>}>
      <div className="overflow-auto flex-1">
        {warnings.map((w,i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-white/5">
            <FontAwesomeIcon icon={w.type === 'danger' ? faExclamationTriangle : faCheckCircle}
              style={{ color: w.color, fontSize: 11 }} />
            <span className="text-[12px] text-white/80">{w.msg}</span>
          </div>
        ))}
      </div>
    </RiskCard>
  );
}

function RiskMetricsCards({ positions, totalMarketVal }) {
  const sorted = [...positions].sort((a,b) => (a.pnlPct||0) - (b.pnlPct||0));
  const best = [...positions].sort((a,b) => (b.pnlPct||0) - (a.pnlPct||0))[0];
  const worst = sorted[0];
  const maxConc = positions.length ? Math.max(...positions.map(p => p.marketVal||0), 1) /
    Math.max(totalMarketVal, 1) * 100 : 0;

  const cards = [
    { label: '最佳个股', value: best?.name || '--', sub: `${(best?.pnlPct||0)>=0?'+':''}${(best?.pnlPct||0).toFixed(1)}%`, color: '#22c55e' },
    { label: '最差个股', value: worst?.name || '--', sub: `${(worst?.pnlPct||0).toFixed(1)}%`, color: '#ef4444' },
    { label: '最大集中度', value: `${maxConc.toFixed(1)}%`, sub: '单只股票', color: '#f59e0b' },
    { label: '持仓数量', value: `${positions.length}只`, sub: '分散程度', color: '#3b82f6' },
  ];

  return (
    <div className="risk-card">
      <div className="flex items-center gap-3 h-full">
        {cards.map((c,i) => (
          <div key={i} className="flex-1 text-center">
            <div className="text-[10px] text-cyber-gray mb-1">{c.label}</div>
            <div className="text-[16px] font-bold font-mono" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[9px] text-cyber-gray/60">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   Main Page
   ================================================================ */

export default function RiskControlPage() {
  useTitle('风控设置');
  const { positions, loading, totalMarketVal } = usePortfolioData();

  return (
    <div className="flex-1 overflow-auto p-5" style={{ background: 'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
      {positions.length > 0 ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', gridAutoRows: 'minmax(280px, auto)' }}>
          <RiskOverviewCard positions={positions} />
          <RiskTrendCard positions={positions} />
          <RiskDistroCard positions={positions} />
          <RiskWarningsCard positions={positions} />
          <div className="col-span-2">
            <RiskMetricsCards positions={positions} totalMarketVal={totalMarketVal} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className="text-cyber-gray text-[14px]">暂无持仓数据 — 前往"持仓明细"添加股票后，风险指标将自动计算</span>
        </div>
      )}
    </div>
  );
}
