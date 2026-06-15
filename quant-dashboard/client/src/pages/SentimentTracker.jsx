import { useTitle } from '../hooks/useTitle';
import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faSearch, faLink, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import usePortfolioData from '../hooks/usePortfolioData';
import tickers from '../data/sentimentTickers.json';

const SECTOR_COLORS = {
  '光通信/CPO': '#8b5cf6',
  '化合物半导体': '#f59e0b',
  'Neocloud': '#06b6d4',
  'AI算力': '#3b82f6',
  '存储/HBM': '#ec4899',
  '半导体制造': '#22c55e',
  '半导体设备': '#a78bfa',
  '金融科技': '#f97316',
  '航天/防务': '#64748b',
  '其他': '#94a3b8',
};

const SECTORS = Object.keys(SECTOR_COLORS);

function CardShell({ title, children }) {
  return (
    <div className="p-4 rounded-lg border" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(15,23,42,0.8)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-white tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function SentimentTracker() {
  useTitle('情绪追踪');
  const { positions } = usePortfolioData();
  const [selectedSector, setSelectedSector] = useState('all');
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => [...tickers].sort((a, b) => b.mentions - a.mentions), []);

  const filtered = useMemo(() => {
    return sorted.filter(t => {
      if (selectedSector !== 'all' && t.sector !== selectedSector) return false;
      if (search && !t.ticker.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sorted, selectedSector, search]);

  const holdingsOverlap = useMemo(() => {
    if (!positions.length) return [];
    const matches = [];
    for (const t of sorted) {
      const found = positions.find(p =>
        p.code.includes(t.ticker) || p.name.toUpperCase().includes(t.ticker)
      );
      if (found) matches.push({ ...t, holding: found });
    }
    return matches;
  }, [positions, sorted]);

  const barOption = useMemo(() => {
    const top = filtered.slice(0, 20);
    return {
      grid: { left: 4, right: 12, top: 8, bottom: 32, containLabel: true },
      xAxis: { type: 'category', data: top.map(t => t.ticker),
        axisLabel: { color: '#94a3b8', fontSize: 9, rotate: 45 },
        axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [{
        type: 'bar', data: top.map(t => ({
          value: t.mentions,
          itemStyle: { color: SECTOR_COLORS[t.sector] || '#94a3b8', borderRadius: [3, 3, 0, 0] },
        })), barWidth: '55%',
      }],
      tooltip: {
        trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#6366f1',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: (p) => p[0].name + '<br/>提及次数: ' + p[0].value + '<br/>板块: ' + top[p[0].dataIndex].sector,
      },
    };
  }, [filtered]);

  const pieOption = useMemo(() => {
    const sectorCounts = {};
    for (const t of sorted) sectorCounts[t.sector] = (sectorCounts[t.sector] || 0) + t.mentions;
    const data = Object.entries(sectorCounts).map(([name, value]) => ({
      name, value,
      itemStyle: { color: SECTOR_COLORS[name] || '#94a3b8' },
    }));
    return {
      series: [{
        type: 'pie', radius: ['45%', '72%'], center: ['50%', '55%'],
        data, label: { color: '#94a3b8', fontSize: 10 },
      }],
      tooltip: {
        trigger: 'item', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#6366f1',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: '{b}: {c}次 ({d}%)',
      },
    };
  }, [sorted]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
      <header className="relative flex h-[60px] shrink-0 items-center justify-between overflow-hidden border-b px-6"
        style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400/60 via-purple-400/40 to-transparent" />
        <div className="relative z-10 flex items-center gap-4">
          <FontAwesomeIcon icon={faFire} className="text-sm" style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.5))' }} />
          <h1 className="text-xl font-bold tracking-widest text-white" style={{ textShadow: '0 0 14px rgba(245,158,11,0.4)' }}>{'情绪追踪'}</h1>
          <div className="h-5 w-px bg-gradient-to-b from-transparent via-orange-400/60 to-transparent" />
          <span className="text-[10px] font-medium tracking-[0.2em] text-slate-400">SENTIMENT</span>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{'数据来源: @aleabitoreddit (5,851条推文 · 669只标的)'}</span>
        </div>
      </header>

      <div className="flex items-center gap-3 px-5 py-3 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-1 bg-slate-800/50 rounded px-2 py-1">
          <FontAwesomeIcon icon={faSearch} className="text-[10px] text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={'搜索代码...'}
            className="bg-transparent text-xs text-white outline-none w-28" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setSelectedSector('all')}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${selectedSector === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {'全部'}
          </button>
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSelectedSector(s)}
              style={{ borderColor: selectedSector === s ? SECTOR_COLORS[s] : 'transparent' }}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${selectedSector === s ? 'text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
        {holdingsOverlap.length > 0 && (
          <div className="ml-auto flex items-center gap-1 text-[10px] text-amber-400">
            <FontAwesomeIcon icon={faLink} />
            {'发现 '}{holdingsOverlap.length}{' 只与持仓相关的标的'}
          </div>
        )}
      </div>

      <div className="grid gap-4 p-4 shrink-0" style={{ gridTemplateColumns: '2fr 1fr', height: 300 }}>
        <CardShell title={'讨论热度 TOP20'}>
          <ReactECharts option={barOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        </CardShell>
        <CardShell title={'板块分布'}>
          <ReactECharts option={pieOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        </CardShell>
      </div>

      {holdingsOverlap.length > 0 && (
        <div className="px-4 pb-2">
          <CardShell title={'持仓关联标的'}>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {holdingsOverlap.map(t => (
                <div key={t.ticker} className="flex items-center gap-2 p-2 rounded border border-amber-500/20 bg-amber-500/5">
                  <span className="text-sm font-bold text-amber-400 font-mono">{t.ticker}</span>
                  <span className="text-[10px] text-slate-400">{t.mentions}{'次提及'}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">{t.sector}</span>
                </div>
              ))}
            </div>
          </CardShell>
        </div>
      )}

      <div className="flex-1 overflow-auto px-4 pb-4">
        <CardShell title={`${'标的列表'} (${filtered.length})`}>
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-500 sticky top-0" style={{ background: 'rgba(15,23,42,0.95)' }}>
                  <th className="py-2 px-2 w-8">#</th>
                  <th className="py-2 px-2 w-20">{'代码'}</th>
                  <th className="py-2 px-2 w-14">{'提及'}</th>
                  <th className="py-2 px-2 w-24">{'板块'}</th>
                  <th className="py-2 px-2 w-20">{'信心'}</th>
                  <th className="py-2 px-2">{'核心观点'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.ticker} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 px-2 text-[11px] text-slate-600">{i + 1}</td>
                    <td className="py-2 px-2"><span className="text-[12px] font-mono font-bold text-white">{t.ticker}</span></td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 rounded-full" style={{ width: Math.min(60, t.mentions / 12), background: SECTOR_COLORS[t.sector] || '#94a3b8', opacity: 0.7 }} />
                        <span className="text-[11px] font-mono text-slate-300">{t.mentions}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: (SECTOR_COLORS[t.sector] || '#94a3b8') + '20', color: SECTOR_COLORS[t.sector] || '#94a3b8' }}>{t.sector}</span>
                    </td>
                    <td className="py-2 px-2"><span className="text-[10px] text-slate-400">{t.tier}</span></td>
                    <td className="py-2 px-2 text-[11px] text-slate-400">{t.thesis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardShell>
      </div>

      <div className="shrink-0 px-5 py-2 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-600">
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />
        {'以上数据来自 Twitter @aleabitoreddit 公开推文分析，不构成投资建议。提及次数不代表推荐，仅供参考。'}
      </div>
    </div>
  );
}
