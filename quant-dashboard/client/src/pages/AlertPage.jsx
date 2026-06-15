import { useTitle } from '../hooks/useTitle';
import { useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faArrowUp, faArrowDown, faShieldHalved, faBullseye, faRobot, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import usePortfolioData from '../hooks/usePortfolioData';
import { fetchAlerts, autoGenerateSLTP } from '../services/api';

function AlertCard({ title, children }) {
  return (
    <div className="flex flex-col p-4 rounded-lg border" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(15,23,42,0.8)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-white tracking-wide">{title}</span>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

/* Up Alert -- gainers */
function UpsideAlertCard({ positions }) {
  const gainers = useMemo(() =>
    positions.filter(p => (p.pnlPct||0) > 0).sort((a,b) => (b.pnlPct||0) - (a.pnlPct||0)).slice(0, 6)
  , [positions]);

  const option = useMemo(() => {
    if (!gainers.length) return {};
    return {
      grid: { left: 0, right: 14, top: 8, bottom: 20, containLabel: true },
      xAxis: { type: 'category', data: gainers.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 9 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 9, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } } },
      series: [{ type: 'bar', data: gainers.map(p => parseFloat((p.pnlPct||0).toFixed(2))), barWidth: '55%',
        itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,
          [{offset:0,color:'#06b6d4'},{offset:1,color:'#22d3ee'}]) },
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 9, formatter: '{c}%' },
      }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#06b6d4',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [gainers]);

  return (
    <AlertCard title="涨幅排名">
      {gainers.length ? <>
        <ReactECharts option={option} style={{ height: '60%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        <div className="overflow-auto flex-1 px-2">
          {gainers.map((p,i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-[11px] border-b border-white/5">
              <span className="text-slate-500 w-5">{i+1}</span>
              <FontAwesomeIcon icon={faArrowUp} className="text-emerald-400 text-[9px]" />
              <span className="text-white flex-1">{p.name}</span>
              <span className="font-mono text-emerald-400">+{p.pnlPct.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </> : <div className="flex-1 flex items-center justify-center text-slate-500 text-[12px]">暂无盈利持仓</div>}
    </AlertCard>
  );
}

/* Down Alert -- losers */
function DownsideAlertCard({ positions }) {
  const losers = useMemo(() =>
    positions.filter(p => (p.pnlPct||0) < 0).sort((a,b) => (a.pnlPct||0) - (b.pnlPct||0)).slice(0, 6)
  , [positions]);

  const option = useMemo(() => {
    if (!losers.length) return {};
    return {
      grid: { left: 0, right: 14, top: 8, bottom: 20, containLabel: true },
      xAxis: { type: 'category', data: losers.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 9 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 9, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } } },
      series: [{ type: 'bar', data: losers.map(p => parseFloat((p.pnlPct||0).toFixed(2))), barWidth: '55%',
        itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,
          [{offset:0,color:'#ef4444'},{offset:1,color:'#f87171'}]) },
        label: { show: true, position: 'bottom', color: '#94a3b8', fontSize: 9, formatter: '{c}%' },
      }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#ef4444',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [losers]);

  return (
    <AlertCard title="跌幅排名">
      {losers.length ? <>
        <ReactECharts option={option} style={{ height: '60%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        <div className="overflow-auto flex-1 px-2">
          {losers.map((p,i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-[11px] border-b border-white/5">
              <span className="text-slate-500 w-5">{i+1}</span>
              <FontAwesomeIcon icon={faArrowDown} className="text-red-400 text-[9px]" />
              <span className="text-white flex-1">{p.name}</span>
              <span className="font-mono text-red-400">{p.pnlPct.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </> : <div className="flex-1 flex items-center justify-center text-slate-500 text-[12px]">暂无亏损持仓</div>}
    </AlertCard>
  );
}

/* Summary stats */
function AlertSummaryCard({ positions, totalMarketVal, totalPnl, dayPnlPct }) {
  return (
    <AlertCard title="持仓概览">
      <span className="ml-auto text-[12px] font-mono text-slate-400">{positions.length}只</span>
      <div className="flex-1 grid grid-cols-2 gap-3 items-center mt-2">
        {[
          { label: '总市值', value: (totalMarketVal/10000).toFixed(1)+'w', color: '#3b82f6' },
          { label: '总盈亏', value: `${totalPnl>=0?'+':''}${totalPnl.toFixed(0)}`, color: totalPnl>=0?'#22c55e':'#ef4444' },
          { label: '日收益率', value: `${dayPnlPct>=0?'+':''}${dayPnlPct.toFixed(2)}%`, color: dayPnlPct>=0?'#22c55e':'#ef4444' },
          { label: '盈利数', value: `${positions.filter(p=>(p.pnl||0)>=0).length}只`, color: '#06b6d4' },
        ].map((s,i) => (
          <div key={i} className="text-center">
            <div className="text-[10px] text-slate-500">{s.label}</div>
            <div className="text-[18px] font-bold font-mono" style={{ color: s.color, textShadow: `0 0 8px ${s.color}44` }}>{s.value}</div>
          </div>
        ))}
      </div>
    </AlertCard>
  );
}

/* Stop-Loss / Take-Profit auto generator */
function SLTPCard({ positions, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [slPct, setSlPct] = useState(-8);
  const [tpPct, setTpPct] = useState(15);
  const [generated, setGenerated] = useState(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await autoGenerateSLTP(slPct, tpPct);
      setGenerated(res);
      if (onRefresh) onRefresh();
    } catch (e) {
      alert('生成失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [slPct, tpPct, onRefresh]);

  return (
    <AlertCard title="止损止盈">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 block mb-0.5">止损比例 (%)</label>
            <input type="number" value={slPct} onChange={e => setSlPct(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 block mb-0.5">止盈比例 (%)</label>
            <input type="number" value={tpPct} onChange={e => setTpPct(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" />
          </div>
          <button onClick={handleGenerate} disabled={loading || positions.length === 0}
            className="shrink-0 mt-4 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-500 disabled:opacity-40 flex items-center gap-1">
            {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRobot} />}
            生成
          </button>
        </div>
        {generated && (
          <div className="text-[10px] text-emerald-400 mb-2 flex items-center gap-1">
            <FontAwesomeIcon icon={faCheck} /> {generated.message}
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {positions.length === 0 ? (
            <div className="text-center text-slate-500 text-[11px] py-4">暂无持仓</div>
          ) : (
            positions.map(p => {
              const cost = p.costPrice || 0;
              const slPrice = +(cost * (1 + slPct / 100)).toFixed(2);
              const tpPrice = +(cost * (1 + tpPct / 100)).toFixed(2);
              return (
                <div key={p.code} className="flex items-center gap-2 py-1.5 text-[11px] border-b border-white/5">
                  <span className="text-white w-16 truncate">{p.name}</span>
                  <span className="text-slate-500 font-mono text-[10px]">{cost.toFixed(2)}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="flex items-center gap-0.5 text-red-400">
                      <FontAwesomeIcon icon={faShieldHalved} className="text-[9px]" />
                      <span className="font-mono text-[10px]">{slPrice}</span>
                    </span>
                    <span className="text-slate-600 mx-1">|</span>
                    <span className="flex items-center gap-0.5 text-emerald-400">
                      <FontAwesomeIcon icon={faBullseye} className="text-[9px]" />
                      <span className="font-mono text-[10px]">{tpPrice}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AlertCard>
  );
}

/* ================================================================
   Main Page
   ================================================================ */
export default function AlertPage() {
  useTitle('涨跌提醒');
  const { positions, loading, totalMarketVal, totalPnl, dayPnlPct, refresh } = usePortfolioData();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
        <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-blue-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{ background: 'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
      {positions.length > 0 ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', gridAutoRows: '340px' }}>
          <AlertSummaryCard positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} dayPnlPct={dayPnlPct} />
          <SLTPCard positions={positions} onRefresh={refresh} />
          <UpsideAlertCard positions={positions} />
          <DownsideAlertCard positions={positions} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FontAwesomeIcon icon={faBell} className="text-4xl text-slate-600 mb-4" />
            <p className="text-slate-400 text-[14px]">暂无持仓数据，无法生成涨跌提醒</p>
            <p className="text-slate-600 text-[12px] mt-2">请先前往"持仓明细"页面添加股票持仓</p>
          </div>
        </div>
      )}
    </div>
  );
}
