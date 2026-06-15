import { useState, useRef, useEffect, useCallback } from 'react';
import Card from './Card';

const TABS = ['持仓明细', '盈亏明细'];

function MetricBlock({ title, value, valueColor, glowColor, progress }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] text-slate-500 font-mono mb-1 tracking-wide">{title}</div>
      <div className="text-[18px] font-bold font-mono mb-1.5 truncate"
        style={{ color: valueColor, textShadow: `0 0 12px ${glowColor}` }}>{value}</div>
      <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full progress-bar-fill"
          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${valueColor}, ${valueColor}88)`, boxShadow: `0 0 8px ${glowColor}` }} />
      </div>
    </div>
  );
}

export default function RevenueCard({ positions, totalMarketVal, totalPnl, dayPnlPct }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  const recalcUnderline = useCallback(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      const parent = el.parentElement;
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setUnderlineStyle({ left: elRect.left - parentRect.left, width: elRect.width });
    }
  }, [activeTab]);

  useEffect(() => { recalcUnderline(); window.addEventListener('resize', recalcUnderline); return () => window.removeEventListener('resize', recalcUnderline); }, [recalcUnderline]);

  // Build rows from real positions
  const best = [...positions].sort((a,b) => (b.pnlPct||0) - (a.pnlPct||0))[0];
  const worst = [...positions].sort((a,b) => (a.pnlPct||0) - (b.pnlPct||0))[0];
  const bestVal = [...positions].sort((a,b) => (b.pnl||0) - (a.pnl||0))[0];
  const worstVal = [...positions].sort((a,b) => (a.pnl||0) - (b.pnl||0))[0];

  const rows = positions.length > 0 ? [
    { left: { title: '最佳收益率个股', value: best?.name?.slice(0,8)||'--',
        valueColor: '#22c55e', glowColor: 'rgba(34,197,94,0.5)', progress: Math.min(100, Math.abs(best?.pnlPct||0)*5) },
      right: { title: '最差收益率个股', value: worst?.name?.slice(0,8)||'--',
        valueColor: '#ef4444', glowColor: 'rgba(239,68,68,0.5)', progress: Math.min(100, Math.abs(worst?.pnlPct||0)*5) } },
    { left: { title: '最佳盈亏额', value: bestVal?.name?.slice(0,8)||'--',
        valueColor: '#22c55e', glowColor: 'rgba(34,197,94,0.5)', progress: 50 },
      right: { title: '日收益率', value: `${dayPnlPct>=0?'+':''}${dayPnlPct.toFixed(2)}%`,
        valueColor: dayPnlPct>=0?'#22c55e':'#ef4444', glowColor: dayPnlPct>=0?'rgba(34,197,94,0.5)':'rgba(239,68,68,0.5)', progress: Math.min(100, Math.abs(dayPnlPct)*10) } },
    { left: { title: '总市值', value: `${(totalMarketVal/10000).toFixed(1)}万`,
        valueColor: '#8b5cf6', glowColor: 'rgba(139,92,246,0.5)', progress: 60 },
      right: { title: '总盈亏', value: `${totalPnl>=0?'+':''}${totalPnl.toFixed(0)}`,
        valueColor: totalPnl>=0?'#22c55e':'#ef4444', glowColor: totalPnl>=0?'rgba(34,197,94,0.5)':'rgba(239,68,68,0.5)', progress: 50 } },
  ] : [
    { left: { title: '暂无持仓', value: '--', valueColor: '#64748b', glowColor: 'rgba(100,116,139,0.3)', progress: 0 },
      right: { title: '请添加股票', value: '--', valueColor: '#64748b', glowColor: 'rgba(100,116,139,0.3)', progress: 0 } },
  ];

  return (
    <Card className="flex flex-col">
      <div className="relative flex items-center gap-1 mb-4 shrink-0" style={{ paddingBottom: '3px' }}>
        {TABS.map((tab, i) => (
          <button key={tab} ref={(el) => { tabRefs.current[i] = el; }} onClick={() => setActiveTab(i)}
            className={`px-5 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 ${activeTab===i?'text-white':'text-slate-500 hover:text-slate-300'}`}
            style={activeTab===i?{background:'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(59,130,246,0.2))',boxShadow:'0 0 14px rgba(139,92,246,0.4), 0 0 28px rgba(59,130,246,0.2)'}:{}}>
            {tab}
          </button>
        ))}
        <div className="tab-underline" style={{ left:`${underlineStyle.left}px`, width:`${underlineStyle.width}px` }} />
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-5">
            <MetricBlock {...row.left} />
            <MetricBlock {...row.right} />
          </div>
        ))}
      </div>
    </Card>
  );
}
