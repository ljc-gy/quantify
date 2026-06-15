import { useTitle } from '../hooks/useTitle';
import PageHeader from '../components/PageHeader';
import usePortfolioData from '../hooks/usePortfolioData';
import { useState, useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBriefcase, faArrowUp, faArrowDown, faCircle,
  faChartLine, faShieldHalved, faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';

/* ================================================================
   Shared helpers
   ================================================================ */

function CardTitle({ title, right }) {
  return (
    <div className="pos-card-title">
      <span className="title-text">{title}</span>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

function PosCard({ title, children, right }) {
  return (
    <div className="pos-card">
      <CardTitle title={title} right={right} />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function EmptyCard({ title, message }) {
  return (
    <div className="pos-card flex items-center justify-center">
      <div className="text-center">
        <span className="text-[13px] text-cyber-gray">{message || '暂无持仓数据'}</span>
        {title && <span className="block text-[10px] text-cyber-gray/50 mt-1">去"持仓明细"添加股票</span>}
      </div>
    </div>
  );
}

/* ================================================================
   Page Header with 3 main tabs
   ================================================================ */

function PositionPageHeader({ activeTab, onTabChange, dataState }) {
  const tabs = [
    { id: 'overview', label: '持仓总览', icon: faChartLine },
    { id: 'profit',   label: '今日收益', icon: faBriefcase },
    { id: 'risk',     label: '风险预警', icon: faShieldHalved },
  ];

  const tabRefs = useRef([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === activeTab);
    const el = tabRefs.current[idx];
    if (el) {
      const parent = el.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setUnderlineStyle({ left: elRect.left - parentRect.left, width: elRect.width });
    }
  }, [activeTab]);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  const statusLabel = dataState.loading ? '加载中...' : dataState.count > 0 ? '真实数据' : '无持仓';

  return (
    <PageHeader
      icon={faBriefcase}
      title="持仓管理"
      tag="POSITION"
      color="blue"
      rightContent={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-0">
            {tabs.map((tab, i) => (
              <button key={tab.id} ref={(el) => { tabRefs.current[i] = el; }} onClick={() => onTabChange(tab.id)} className={`pos-tab ${activeTab === tab.id ? 'active' : ''}`}>
                <FontAwesomeIcon icon={tab.icon} className="mr-1.5 text-[11px]" />
                {tab.label}
              </button>
            ))}
            <div className="tab-underline" style={{ left: `${underlineStyle.left}px`, width: `${underlineStyle.width}px` }} />
          </div>
          <span className={`text-[10px] ${dataState.count > 0 ? 'text-green-400' : 'text-cyber-gray'}`}>
            {statusLabel} | {timeStr}
          </span>
        </div>
      }
    />
  );
}

/* ================================================================
   Overview Tab -- Charts (computed from real positions)
   ================================================================ */

function ProfitSummaryCard({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => (b.pnl||0) - (a.pnl||0)).slice(0, 8);
    return {
      grid: { left: 0, right: 14, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: (v) => (v/10000).toFixed(0)+'w' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [{
        type: 'bar', data: sorted.map(p => p.pnl || 0), barWidth: '50%',
        itemStyle: {
          borderRadius: [4,4,0,0],
          color: (p) => p.value >= 0
            ? new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#22c55e'},{offset:1,color:'#16a34a'}])
            : new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ef4444'},{offset:1,color:'#dc2626'}])
        },
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9 }
      }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#3b82f6',
        textStyle: { color: '#e2e8f0', fontSize: 11 },
        formatter: (p) => `${p[0].name}<br/>盈亏: ${p[0].value >= 0 ? '+' : ''}${p[0].value.toLocaleString()} 元` },
    };
  }, [positions]);

  if (!positions.length) return <EmptyCard title="持仓盈亏概览" />;
  return <PosCard title="持仓盈亏概览"><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></PosCard>;
}

function SectorDistributionCard({ positions, totalMarketVal }) {
  const option = useMemo(() => {
    if (!positions.length || totalMarketVal <= 0) return {};
    // Group by weight tiers
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal).slice(0, 8);
    return {
      grid: { left: 0, right: 14, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [{ type: 'bar', data: sorted.map(p => parseFloat((p.marketVal/totalMarketVal*100).toFixed(1))), barWidth: '50%',
        itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,
          [{offset:0,color:'#8b5cf6'},{offset:1,color:'#a78bfa'}]) },
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 10, formatter: '{c}%' } }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#8b5cf6',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [positions, totalMarketVal]);

  if (!positions.length) return <EmptyCard title="个股权重" />;
  return <PosCard title="个股权重"><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></PosCard>;
}

function DailyTrendCard({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    // Show P&L% distribution as a bar chart
    const sorted = [...positions].sort((a,b) => (b.pnlPct||0) - (a.pnlPct||0));
    return {
      grid: { left: 0, right: 14, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 9 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [
        { name: '盈亏%', type: 'bar', data: sorted.map(p => parseFloat((p.pnlPct||0).toFixed(2))), barWidth: '55%',
          itemStyle: {
            borderRadius: [4,4,0,0],
            color: (p) => p.value >= 0
              ? new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#22c55e'},{offset:1,color:'#16a34a'}])
              : new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ef4444'},{offset:1,color:'#dc2626'}])
          },
          label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9, formatter: '{c}%' } }
      ],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#3b82f6',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [positions]);

  if (!positions.length) return <EmptyCard title="个股盈亏%" />;
  return <PosCard title="个股盈亏%" right={null}><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></PosCard>;
}

function StockRankingCard({ positions }) {
  if (!positions.length) return <EmptyCard title="个股市值排名" />;
  const sorted = [...positions].sort((a,b) => (b.marketVal||0) - (a.marketVal||0));
  return (
    <PosCard title="个股市值排名">
      <div className="overflow-auto flex-1">
        {sorted.slice(0, 8).map((p,i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <span className="text-[10px] font-mono text-cyber-gray w-5">{i+1}</span>
            <FontAwesomeIcon icon={(p.pnl||0) >= 0 ? faArrowUp : faArrowDown} style={{color:(p.pnl||0)>=0?'#22c55e':'#ef4444',fontSize:10}} />
            <span className="text-[12px] text-white flex-1">{p.name}</span>
            <span className="text-[11px] font-mono text-white">{(p.marketVal/10000).toFixed(1)}w</span>
            <span className={`text-[11px] font-mono ${(p.pnlPct||0)>=0?'text-emerald-400':'text-red-400'}`}>
              {(p.pnlPct||0)>=0?'+':''}{(p.pnlPct||0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </PosCard>
  );
}

function HexStatCards({ positions, totalMarketVal, totalPnl, dayPnlPct }) {
  const cards = [
    { label: '总市值', value: (totalMarketVal/10000).toFixed(1)+'w', suffix: '元', color: '#3b82f6', icon: faChartLine },
    { label: '今日盈亏', value: `${totalPnl>=0?'+':''}${(totalPnl).toFixed(0)}`, suffix: '元', color: totalPnl>=0?'#22c55e':'#ef4444', icon: totalPnl>=0?faArrowUp:faArrowDown },
    { label: '持仓数量', value: String(positions.length), suffix: '只', color: '#8b5cf6', icon: faBriefcase },
    { label: '日收益率', value: `${dayPnlPct>=0?'+':''}${dayPnlPct.toFixed(2)}`, suffix: '%', color: dayPnlPct>=0?'#22c55e':'#ef4444', icon: faCircle },
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:'14px',minHeight:0}}>
      {cards.map((c,i) => (
        <div key={i} className="hex-card">
          <FontAwesomeIcon icon={c.icon} className="text-[14px] mb-1.5" style={{color:c.color,filter:`drop-shadow(0 0 6px ${c.color}66)`}} />
          <span className="text-[10px] text-cyber-gray mb-1">{c.label}</span>
          <span className="text-[20px] font-bold font-mono tracking-tight" style={{color:c.color,textShadow:`0 0 10px ${c.color}44`}}>{c.value}</span>
          <span className="text-[9px] text-cyber-gray">{c.suffix}</span>
        </div>
      ))}
    </div>
  );
}

function PositionDetailCard({ positions }) {
  const rows = positions.map(p => ({
    ...p, up: (p.pnl||0) >= 0
  }));
  if (!rows.length) return <EmptyCard title="持仓明细" />;
  return (
    <PosCard title="持仓明细">
      <div className="overflow-auto flex-1">
        {rows.map((d,i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <FontAwesomeIcon icon={d.up ? faArrowUp : faArrowDown} style={{color:d.up?'#22c55e':'#ef4444',fontSize:10}} />
            <span className="text-[12px] text-white w-[70px]">{d.name}</span>
            <span className="text-[11px] text-cyber-gray w-[55px] font-mono">{d.code}</span>
            <span className="text-[11px] text-cyber-gray w-[50px] text-right font-mono">{d.quantity.toLocaleString()}</span>
            <span className="text-[11px] text-white w-[65px] text-right font-mono">{d.curPrice.toFixed(2)}</span>
            <span className={`text-[11px] w-[80px] text-right font-mono ${d.up?'text-emerald-400':'text-red-400'}`}>{(d.pnl||0).toFixed(0)}</span>
            <span className={`text-[11px] w-[60px] text-right font-mono ${d.up?'text-emerald-400':'text-red-400'}`}>{(d.pnlPct||0)>=0?'+':''}{(d.pnlPct||0).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </PosCard>
  );
}

/* ================================================================
   Profit Tab
   ================================================================ */

function AllocationPieCard({ positions, totalMarketVal }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal).slice(0, 6);
    const colors = ['#3b82f6','#8b5cf6','#06b6d4','#22c55e','#f59e0b','#ec4899'];
    return {
      series: [{ type: 'pie', radius: ['55%','78%'], center: ['50%','50%'], label: { show: false }, emphasis: { scaleSize: 6 },
        data: sorted.map((p,i) => ({ value: parseFloat((p.marketVal/totalMarketVal*100).toFixed(1)), name: p.name, itemStyle: { color: colors[i%colors.length] } })) }],
      tooltip: { trigger: 'item', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#3b82f6',
        textStyle: { color: '#e2e8f0', fontSize: 11 }, formatter: '{b}: {c}%' },
    };
  }, [positions, totalMarketVal]);

  if (!positions.length) return <EmptyCard title="持仓分布" />;
  return <PosCard title="持仓分布"><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></PosCard>;
}

function ConcentrationCard({ positions, totalMarketVal }) {
  const option = useMemo(() => {
    if (!positions.length || totalMarketVal <= 0) return {};
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal).slice(0, 8);
    return {
      grid: { left: 0, right: 14, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 9, rotate: 20 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [{ type: 'bar', data: sorted.map(p => parseFloat((p.marketVal/totalMarketVal*100).toFixed(1))), barWidth: '45%',
        itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,
          [{offset:0,color:'#f59e0b'},{offset:1,color:'#fbbf24'}]) },
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9 } }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#f59e0b',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [positions, totalMarketVal]);
  if (!positions.length) return <EmptyCard title="个股权重" />;
  return <PosCard title="个股权重"><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></PosCard>;
}

function MarketValueTrendCard({ positions, totalMarketVal }) {
  // Show market value per stock as pie/donut since we don't have trend history
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal);
    const colors = ['#06b6d4','#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ec4899'];
    return {
      series: [{ type: 'pie', radius: ['60%','85%'], center: ['50%','50%'], label: { show: false }, emphasis: { scaleSize: 6 },
        data: sorted.map((p,i) => ({ value: p.marketVal, name: p.name, itemStyle: { color: colors[i%colors.length] } })) }],
      tooltip: { trigger: 'item', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#06b6d4',
        textStyle: { color: '#e2e8f0', fontSize: 11 }, formatter: (p) => `${p.name}: ${(p.value/10000).toFixed(1)}w (${p.percent}%)` },
    };
  }, [positions]);
  if (!positions.length) return <EmptyCard title="市值分布" />;
  return <PosCard title="市值分布"><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></PosCard>;
}

function CostDistributionCard({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const bins = { '<10':0, '10-20':0, '20-50':0, '50-100':0, '100-200':0, '>200':0 };
    positions.forEach(p => {
      const cp = p.costPrice || 0;
      if (cp < 10) bins['<10']++;
      else if (cp < 20) bins['10-20']++;
      else if (cp < 50) bins['20-50']++;
      else if (cp < 100) bins['50-100']++;
      else if (cp < 200) bins['100-200']++;
      else bins['>200']++;
    });
    const keys = Object.keys(bins);
    return {
      grid: { left: 0, right: 14, top: 8, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: keys,
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 9 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [{ type: 'bar', data: keys.map(k => bins[k]), barWidth: '50%',
        itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,
          [{offset:0,color:'#8b5cf6'},{offset:1,color:'#c4b5fd'}]) },
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9 } }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#8b5cf6',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [positions]);
  if (!positions.length) return <EmptyCard title="成本分布" />;
  return <PosCard title="成本分布"><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></PosCard>;
}

function OverviewHexCards({ positions, totalMarketVal }) {
  const avgCost = positions.length ? (positions.reduce((s,p) => s + p.costPrice * p.quantity, 0) / positions.reduce((s,p) => s + p.quantity, 1)).toFixed(2) : '0';
  const cards = [
    { label: '持仓股数', value: positions.reduce((s,p)=>s+p.quantity,0).toLocaleString(), color: '#3b82f6' },
    { label: '平均成本', value: avgCost, color: '#8b5cf6' },
    { label: '持仓市值', value: (totalMarketVal/10000).toFixed(1)+'w', color: '#22c55e' },
    { label: '股票数量', value: String(positions.length), color: '#06b6d4' },
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:'14px',minHeight:0}}>
      {cards.map((c,i) => (
        <div key={i} className="hex-card" style={{animation:`hexBreatheBlue 3s ease-in-out infinite`,animationDelay:`${i*150}ms`}}>
          <span className="text-[10px] text-cyber-gray mb-1">{c.label}</span>
          <span className="text-[22px] font-bold font-mono" style={{color:c.color,textShadow:`0 0 10px ${c.color}44`}}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}

function FullPositionTable({ positions, totalPnl, totalMarketVal }) {
  return (
    <PosCard title="全部持仓">
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead><tr className="border-b border-white/5">
            {['代码','名称','数量','成本','现价','市值','盈亏','盈亏%','占比'].map(h => (
              <th key={h} className="py-2 px-2 text-[10px] text-cyber-gray font-semibold">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {positions.map((p,i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                <td className="py-2 px-2 text-[11px] font-mono text-cyber-gray">{p.code}</td>
                <td className="py-2 px-2 text-[12px] text-white">{p.name}</td>
                <td className="py-2 px-2 text-[11px] font-mono text-white">{p.quantity.toLocaleString()}</td>
                <td className="py-2 px-2 text-[11px] font-mono text-cyber-gray">{p.costPrice.toFixed(2)}</td>
                <td className="py-2 px-2 text-[11px] font-mono text-white">{p.curPrice.toFixed(2)}</td>
                <td className="py-2 px-2 text-[11px] font-mono text-white">{(p.marketVal/10000).toFixed(1)}w</td>
                <td className={`py-2 px-2 text-[11px] font-mono ${(p.pnl||0)>=0?'text-emerald-400':'text-red-400'}`}>
                  {(p.pnl||0)>=0?'+':''}{p.pnl.toLocaleString()}
                </td>
                <td className={`py-2 px-2 text-[11px] font-mono ${(p.pnlPct||0)>=0?'text-emerald-400':'text-red-400'}`}>
                  {(p.pnlPct||0)>=0?'+':''}{(p.pnlPct||0).toFixed(2)}%
                </td>
                <td className="py-2 px-2 text-[11px] font-mono text-white">
                  {totalMarketVal>0?((p.marketVal/totalMarketVal)*100).toFixed(1):'0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PosCard>
  );
}

/* ================================================================
   Risk Tab (simulated -- computed metrics from real data)
   ================================================================ */

function RiskGaugeCard({ positions }) {
  // Compute a simple risk score from volatility of P&L% and concentration
  const riskScore = useMemo(() => {
    if (positions.length < 2) return 30;
    const pnlPcts = positions.map(p => Math.abs(p.pnlPct||0));
    const maxConc = Math.max(...positions.map(p => (p.marketVal||0)), 1);
    const totalVal = positions.reduce((s,p) => s + (p.marketVal||0), 1);
    const concentration = maxConc / totalVal;
    const avgVol = pnlPcts.reduce((a,b)=>a+b,0) / pnlPcts.length;
    return Math.min(95, Math.round(avgVol * 3 + concentration * 40));
  }, [positions]);

  const option = useMemo(() => ({
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, center: ['50%','58%'], radius: '80%',
      min: 0, max: 100, splitNumber: 10,
      axisLine: { lineStyle: { width: 14, color: [[0.35,'#22c55e'],[0.65,'#f59e0b'],[1,'#ef4444']] } },
      pointer: { length: '60%', width: 6, itemStyle: { color: '#3b82f6' } },
      detail: { valueAnimation: true, formatter: '{value}', color: '#fff', fontSize: 28, fontWeight: 'bold',
        offsetCenter: [0,'55%'] },
      data: [{ value: riskScore, name: '风险评分' }],
    }],
  }), [riskScore]);

  if (!positions.length) return <EmptyCard title="风险总览" />;
  return <PosCard title="风险总览" right={<span className="text-[10px] text-cyber-gray">基于持仓数据计算</span>}>
    <ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate />
  </PosCard>;
}

function MaxDrawdownCard({ positions }) {
  if (!positions.length) return <EmptyCard title="最大回撤" />;
  const worst = [...positions].sort((a,b) => (a.pnlPct||0) - (b.pnlPct||0))[0];
  const worstPct = (worst?.pnlPct || 0).toFixed(2);
  return (
    <PosCard title="最大回撤" right={<span className="text-[10px] text-red-400">{worstPct}%</span>}>
      <div className="flex items-center justify-center h-full">
        <span className="text-[32px] font-bold font-mono text-red-400">{worstPct}%</span>
      </div>
    </PosCard>
  );
}

function VaRCard({ positions }) {
  // Simple VaR: worst performer P&L%
  if (!positions.length) return <EmptyCard title="VaR (95%)" />;
  const sorted = [...positions].sort((a,b) => (a.pnlPct||0) - (b.pnlPct||0));
  const var95Idx = Math.max(0, Math.floor(sorted.length * 0.05));
  const var95 = (sorted[var95Idx]?.pnlPct || 0).toFixed(2);
  return (
    <PosCard title="VaR (95%)" right={<span className="text-[10px] text-amber-400">{var95}%</span>}>
      <div className="flex items-center justify-center h-full">
        <span className="text-[32px] font-bold font-mono text-amber-400">{var95}%</span>
      </div>
    </PosCard>
  );
}

function VolatilityMonitorCard({ positions }) {
  // Simple volatility: std dev of P&L%
  const vol = useMemo(() => {
    if (positions.length < 2) return 0;
    const pcts = positions.map(p => p.pnlPct||0);
    const mean = pcts.reduce((a,b)=>a+b,0) / pcts.length;
    const variance = pcts.reduce((s,v) => s + (v-mean)**2, 0) / pcts.length;
    return Math.sqrt(variance).toFixed(2);
  }, [positions]);

  if (!positions.length) return <EmptyCard title="波动率监控" />;
  return (
    <PosCard title="波动率监控" right={<span className="text-[10px] text-purple-400">{vol}%</span>}>
      <div className="flex items-center justify-center h-full">
        <span className="text-[32px] font-bold font-mono text-purple-400">{vol}%</span>
      </div>
    </PosCard>
  );
}

function RiskHexCards({ positions }) {
  const sorted = [...positions].sort((a,b) => (a.pnlPct||0) - (b.pnlPct||0));
  const var95Idx = Math.max(0, Math.floor(sorted.length * 0.05));
  const var95 = (sorted[var95Idx]?.pnlPct || 0).toFixed(2);
  const pcts = positions.map(p => p.pnlPct||0);
  const mean = pcts.length ? pcts.reduce((a,b)=>a+b,0)/pcts.length : 0;
  const sharpe = pcts.length > 1 ? (mean / (Math.sqrt(pcts.reduce((s,v)=>s+(v-mean)**2,0)/pcts.length)||1)*Math.sqrt(252)).toFixed(2) : '0';
  const maxConc = positions.length ? Math.max(...positions.map(p=> (p.marketVal||0)),1) /
    Math.max(positions.reduce((s,p)=>s+(p.marketVal||0),1), 1) * 100 : 0;

  const cards = [
    { label: 'Beta', value: '--', color: '#3b82f6' },
    { label: 'Sharpe', value: sharpe, color: '#22c55e' },
    { label: 'CVaR', value: `${var95}%`, color: '#ef4444' },
    { label: '最大集中度', value: `${maxConc.toFixed(1)}%`, color: '#06b6d4' },
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:'14px',minHeight:0}}>
      {cards.map((c,i) => (
        <div key={i} className="hex-card" style={{animation:`hexBreatheBlue 3s ease-in-out infinite`,animationDelay:`${i*150}ms`}}>
          <span className="text-[10px] text-cyber-gray mb-1">{c.label}</span>
          <span className="text-[22px] font-bold font-mono" style={{color:c.color,textShadow:`0 0 10px ${c.color}44`}}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}

function RiskAlertList({ positions }) {
  const alerts = useMemo(() => {
    const list = [];
    const now = new Date();
    positions.forEach(p => {
      if ((p.pnlPct||0) < -3) list.push({ date: now.toISOString().slice(5,10)+' '+now.toTimeString().slice(0,5),
        type: 'danger', msg: `${p.name}(${p.code}) 跌幅 ${Math.abs(p.pnlPct||0).toFixed(1)}%`, color: '#ef4444' });
      else if ((p.pnlPct||0) < -1) list.push({ date: now.toISOString().slice(5,10)+' '+now.toTimeString().slice(0,5),
        type: 'warning', msg: `${p.name}(${p.code}) 跌幅 ${Math.abs(p.pnlPct||0).toFixed(1)}%`, color: '#f59e0b' });
    });
    if (list.length === 0) list.push({ date: now.toISOString().slice(5,10)+' '+now.toTimeString().slice(0,5),
      type: 'success', msg: '所有持仓表现正常', color: '#22c55e' });
    return list;
  }, [positions]);

  const icons = { danger: faExclamationTriangle, warning: faExclamationTriangle, info: faCircle, success: faCircle };
  return (
    <PosCard title="预警记录" right={<span className="text-[10px] text-cyber-gray">基于实时数据</span>}>
      <div className="overflow-auto flex-1">
        {alerts.map((a,i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-default">
            <FontAwesomeIcon icon={icons[a.type]||faCircle} className="text-[11px] shrink-0" style={{color:a.color}} />
            <span className="text-[10px] font-mono text-cyber-gray w-[85px] shrink-0">{a.date}</span>
            <span className="text-[11px] text-white/80 truncate">{a.msg}</span>
          </div>
        ))}
      </div>
    </PosCard>
  );
}

/* ================================================================
   Main Page
   ================================================================ */

export default function PositionManagement() {
  useTitle('持仓管理');
  const { positions, loading, totalMarketVal, totalPnl, dayPnlPct } = usePortfolioData();
  const [activeTab, setActiveTab] = useState('overview');
  const [subTab, setSubTab] = useState('charts');

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
      <PositionPageHeader activeTab={activeTab} onTabChange={setActiveTab}
        dataState={{ loading, count: positions.length }} />
      <div className="flex-1 overflow-auto p-5 pos-scroll">
        {activeTab === 'overview' && (
          <div className="flex items-center gap-1 mb-4 shrink-0">
            {[{ id: 'charts', label: '收益图表' }, { id: 'detail', label: '持仓明细' }].map((st) => (
              <button key={st.id} onClick={() => setSubTab(st.id)} className={`pos-subtab ${subTab === st.id ? 'active' : ''}`}>{st.label}</button>
            ))}
          </div>
        )}
        {activeTab === 'overview' && subTab === 'charts' && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '280px' }}>
            <ProfitSummaryCard positions={positions} />
            <SectorDistributionCard positions={positions} totalMarketVal={totalMarketVal} />
            <DailyTrendCard positions={positions} />
            <StockRankingCard positions={positions} />
            <HexStatCards positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} dayPnlPct={dayPnlPct} />
            <PositionDetailCard positions={positions} />
          </div>
        )}
        {activeTab === 'overview' && subTab === 'detail' &&
          <FullPositionTable positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} />}
        {activeTab === 'profit' && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '280px' }}>
            <AllocationPieCard positions={positions} totalMarketVal={totalMarketVal} />
            <ConcentrationCard positions={positions} totalMarketVal={totalMarketVal} />
            <MarketValueTrendCard positions={positions} totalMarketVal={totalMarketVal} />
            <CostDistributionCard positions={positions} />
            <OverviewHexCards positions={positions} totalMarketVal={totalMarketVal} />
          </div>
        )}
        {activeTab === 'risk' && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '280px' }}>
            <RiskGaugeCard positions={positions} />
            <MaxDrawdownCard positions={positions} />
            <VaRCard positions={positions} />
            <VolatilityMonitorCard positions={positions} />
            <RiskHexCards positions={positions} />
            <RiskAlertList positions={positions} />
          </div>
        )}
      </div>
    </div>
  );
}
