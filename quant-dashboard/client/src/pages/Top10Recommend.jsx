import { useState, useEffect } from 'react';
import { fetchTop10Funds } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faChevronDown, faChevronUp, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

function strengthColor(score) { if (score >= 72) return '#22c55e'; if (score >= 55) return '#60a5fa'; if (score >= 40) return '#f59e0b'; return '#ef4444'; }
function geoRiskColor(risk) { if (risk <= 3) return '#22c55e'; if (risk <= 5) return '#f59e0b'; return '#ef4444'; }

function Top10Card({ fund, rank, expanded, onToggle, activeView }) {
  const macro = fund.macro || {};
  const isExpanded = expanded === fund.code;
  const color = activeView === 'composite' ? strengthColor(macro.compositeScore || fund.strengthScore) : activeView === 'geopolitical' ? geoRiskColor(macro.geoRisk || 5) : strengthColor(fund.strengthScore);
  const displayScore = activeView === 'composite' ? macro.compositeScore : activeView === 'geopolitical' ? macro.geoRisk : fund.strengthScore;
  const scoreLabel = activeView === 'composite' ? '综合分' : activeView === 'geopolitical' ? '地缘风险' : '强度分';

  return (
    <div className="rounded-lg border overflow-hidden" style={{ background: 'rgba(30,41,59,0.55)', borderColor: 'rgba(59,130,246,0.12)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors" onClick={() => onToggle(isExpanded ? null : fund.code)}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>{rank}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-white truncate">{fund.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[10px] text-cyber-gray">{fund.code}</span>
            <span className="text-[9px] text-slate-600">{fund.category}</span>
            {macro.sector && <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }}>{macro.sector}</span>}
            {fund.buyable && <span className="text-[9px] text-green-400 flex items-center gap-0.5"><FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" /> 可入手</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[20px] font-bold font-mono" style={{ color }}>{displayScore}</div>
          <div className="text-[9px] text-cyber-gray">{scoreLabel}</div>
        </div>
        <div className="hidden md:grid grid-cols-3 gap-3 text-right flex-shrink-0">
          {[{ label: '年收益', value: fund.yearReturn + '%', color: fund.yearReturn >= 0 ? '#22c55e' : '#ef4444' },{ label: '技术分', value: fund.strengthScore, color: strengthColor(fund.strengthScore) },{ label: '供需', value: macro.supplyDemand?.level || '-', color: (macro.supplyDemand?.score || 50) >= 55 ? '#22c55e' : '#f59e0b' }].map(function(m) { return (<div key={m.label}><div className="text-[9px] text-cyber-gray">{m.label}</div><div className="text-[12px] font-mono font-semibold" style={{ color: m.color }}>{m.value}</div></div>); })}
        </div>
        <div className="flex-shrink-0 ml-1"><FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-[10px] text-cyber-gray" /></div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
          <div className="pt-3 space-y-3">
            {macro.compositeScore && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[{ label: '综合评分', value: macro.compositeScore, color: strengthColor(macro.compositeScore) },{ label: '技术面', value: macro.technicalScore, color: strengthColor(macro.technicalScore) },{ label: '地缘风险', value: macro.geoRisk + '/10', color: geoRiskColor(macro.geoRisk) }].map(function(c) { return (<div key={c.label} className="rounded px-2 py-1.5 text-center" style={{ background: 'rgba(15,23,42,0.46)' }}><div className="text-[9px] text-cyber-gray">{c.label}</div><div className="text-[13px] font-bold font-mono mt-0.5" style={{ color: c.color }}>{c.value}</div></div>); })}
              </div>
            )}
            {macro.geoRiskNote && (
              <div className="rounded p-2.5 text-[10px] leading-relaxed" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <span className="text-amber-400 font-medium">地缘政治</span><span className="text-slate-400 ml-2">{macro.geoRiskNote}</span>
              </div>
            )}
            {macro.supplyDemand && (
              <div className="rounded p-2.5 text-[10px] leading-relaxed" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <span className="text-blue-400 font-medium">供需关系</span><span className="text-slate-400 ml-2">{macro.supplyDemand.detail}，综合判定：<span style={{ color: (macro.supplyDemand.score >= 55) ? '#22c55e' : '#f59e0b' }}>{macro.supplyDemand.level}（{macro.supplyDemand.score}分）</span></span>
              </div>
            )}
            {macro.narrative && (
              <div className="text-[10px] text-slate-400 leading-relaxed whitespace-pre-line" style={{ background: 'rgba(15,23,42,0.4)', padding: 8, borderRadius: 4 }}>{macro.narrative}</div>
            )}
            <div>
              <div className="text-[10px] text-cyber-gray mb-1.5">技术面依据</div>
              <div className="space-y-1">{fund.reasons.map(function(r, i) { return (<div key={i} className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5 flex-shrink-0">+</span><span className="text-[11px] text-green-300/80 leading-relaxed">{r}</span></div>); })}</div>
            </div>
            {/* Top 10 Holdings */}
            {macro.holdings && macro.holdings.length > 0 && (
              <div>
                <div className="text-[10px] text-cyber-gray mb-1.5">前十大持仓</div>
                <div className="flex flex-wrap gap-1">
                  {macro.holdings.map(function(h) {
                    var w = h.weight || 0;
                    return (
                      <span key={h.stockCode} className="rounded px-2 py-1 text-[10px] font-mono" style={{
                        background: w > 8 ? 'rgba(34,197,94,0.1)' : w > 4 ? 'rgba(59,130,246,0.08)' : 'rgba(100,116,139,0.06)',
                        border: '1px solid ' + (w > 8 ? 'rgba(34,197,94,0.2)' : w > 4 ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.1)'),
                        color: w > 8 ? '#4ade80' : w > 4 ? '#93c5fd' : '#94a3b8'
                      }}>
                        {h.stockName.replace(/<[^>]+>/g, '').trim()} {w.toFixed(1)}%
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3-month outlook */}
            {macro.threeMonthOutlook && (
              <div className="rounded p-2.5" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <div className="text-[10px] text-cyber-gray mb-1.5">三个月内展望</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px] font-bold font-mono" style={{ color: (macro.threeMonthOutlook.rangeMax || 0) >= 10 ? '#22c55e' : '#f59e0b' }}>
                    {macro.threeMonthOutlook.rangeMin >= 0 ? '+' : ''}{macro.threeMonthOutlook.rangeMin}% ~ {macro.threeMonthOutlook.rangeMax >= 0 ? '+' : ''}{macro.threeMonthOutlook.rangeMax}%
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                    background: macro.threeMonthOutlook.confidence === '高' ? 'rgba(34,197,94,0.15)' : macro.threeMonthOutlook.confidence === '中' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.1)',
                    color: macro.threeMonthOutlook.confidence === '高' ? '#22c55e' : macro.threeMonthOutlook.confidence === '中' ? '#f59e0b' : '#94a3b8'
                  }}>置信度: {macro.threeMonthOutlook.confidence}</span>
                </div>
                <div className="text-[9px] text-slate-500 leading-relaxed">{macro.threeMonthOutlook.basis}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 italic">注意: 此为历史数据参考，不构成投资建议</div>
              </div>
            )}

            {fund.risks.length > 0 && (
              <div><div className="text-[10px] text-cyber-gray mb-1.5">风险提示</div><div className="space-y-1">{fund.risks.map(function(r, i) { return (<div key={i} className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5 flex-shrink-0">-</span><span className="text-[10px] text-amber-400/70 leading-relaxed">{r}</span></div>); })}</div></div>
            )}
            <div><div className="text-[10px] text-cyber-gray mb-1.5">各周期收益</div><div className="grid grid-cols-6 gap-1.5">{[['近1月',fund.month1],['近3月',fund.month3],['近6月',fund.month6],['近1年',fund.year1],['近2年',fund.year2],['近3年',fund.year3]].map(function(_a) { var l=_a[0],v=_a[1]; return (<div key={l} className="rounded px-2 py-1.5 text-center" style={{ background: 'rgba(15,23,42,0.4)' }}><div className="text-[8px] text-cyber-gray">{l}</div><div className="text-[12px] font-mono font-bold mt-0.5" style={{color:(v||0)>=0?'#22c55e':'#ef4444'}}>{(v||0)>=0?'+':''}{(v||0).toFixed(1)}%</div></div>); })}</div></div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
              <span>技术分 {fund.strengthScore}</span><span>波动率 {fund.volatility}%</span><span>趋势 {fund.trendConsistency}%</span>
              {fund.validationSamples > 0 && <span>验证 {fund.validationSamples}样本 {fund.validationWinRate}%胜率</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Top10Recommend() {
  const [top10, setTop10] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [activeView, setActiveView] = useState('composite');

  useEffect(function() {
    setLoading(true);
    fetchTop10Funds()
      .then(function(data) { setTop10(data.top10 || []); })
      .catch(function(e) { setError(e.message); })
      .finally(function() { setLoading(false); });
  }, []);

  if (loading) return (<div className="rounded-lg border p-6 mb-5 text-center" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(59,130,246,0.15)' }}><div className="animate-pulse text-[13px] text-cyber-gray">正在加载长期看好基金数据...</div></div>);
  if (error || !top10.length) return (<div className="rounded-lg border p-6 mb-5 text-center" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(239,68,68,0.2)' }}><div className="text-[13px] text-red-400 mb-2">暂无预扫描数据</div><div className="text-[11px] text-cyber-gray">请先运行下方的"全市场扫描"生成推荐数据</div></div>);

  var sorted = top10.slice();
  if (activeView === 'composite') sorted.sort(function(a,b) { return (b.macro?.compositeScore || 0) - (a.macro?.compositeScore || 0); });
  else if (activeView === 'technical') sorted.sort(function(a,b) { return (b.strengthScore || 0) - (a.strengthScore || 0); });
  else if (activeView === 'geopolitical') sorted.sort(function(a,b) { return (a.macro?.geoRisk || 5) - (b.macro?.geoRisk || 5); });

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <FontAwesomeIcon icon={faChartLine} className="text-green-400 text-[12px]" />
        <span className="text-[14px] font-bold text-white">长期看好 · 综合最优 TOP 10</span>
        <span className="text-[10px] text-cyber-gray ml-auto">走势 + 地缘政治 + 供需关系 综合评分</span>
      </div>
      <div className="flex items-center gap-1 mb-4">
        {[{ id: 'composite', label: '综合最优' },{ id: 'technical', label: '技术最强' },{ id: 'geopolitical', label: '地缘最稳' }].map(function(t) { return (<button key={t.id} onClick={function() { setActiveView(t.id); }} className="px-3 py-1 rounded text-[10px] font-medium transition-all" style={{ background: activeView === t.id ? 'rgba(34,197,94,0.12)' : 'transparent', border: activeView === t.id ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent', color: activeView === t.id ? '#22c55e' : '#94a3b8' }}>{t.label}</button>); })}
      </div>
      <div className="grid gap-3">
        {sorted.map(function(fund) {
          return (<Top10Card key={fund.code} fund={fund} rank={sorted.indexOf(fund) + 1} expanded={expanded} onToggle={setExpanded} activeView={activeView} />);
        })}
      </div>
    </div>
  );
}
