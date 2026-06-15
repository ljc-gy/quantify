import { useTitle } from '../hooks/useTitle';
import { useState, useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLightbulb, faChartLine, faTrophy,
  faArrowUp, faArrowDown, faCheckCircle,
  faStar, faExclamationTriangle, faSearch,
  faBook, faRobot, faFilter, faChartPie,
} from '@fortawesome/free-solid-svg-icons';
import usePortfolioData from '../hooks/usePortfolioData';
import strategies from '../data/strategies.json';
import { analyzeStockRadar, analyzeStrategies } from '../services/api';

const CATEGORY_ORDER = ['趋势跟踪', '均值回归', '动量策略', '波动率策略', '资金管理', '订单管理'];
const CATEGORY_ICONS = {
  '趋势跟踪': faChartLine, '均值回归': faChartPie, '动量策略': faTrophy,
  '波动率策略': faExclamationTriangle, '资金管理': faBook, '订单管理': faRobot,
};

function normalizeStrategyText(value = '') {
  return typeof value === 'string' ? value : String(value ?? '');
}

function researchFriendlyText(value = '') {
  return normalizeStrategyText(value)
    .replace(/全仓买入/g, '强势确认')
    .replace(/买入/g, '转强')
    .replace(/卖出/g, '转弱')
    .replace(/止盈止损/g, '风险边界')
    .replace(/止盈/g, '风险上沿')
    .replace(/止损/g, '风险下沿')
    .replace(/下单/g, '记录条件')
    .replace(/交易/g, '观察');
}

function getStrategyExplanation(strategy) {
  const name = normalizeStrategyText(strategy.name);
  const category = normalizeStrategyText(strategy.category);
  const keywords = (strategy.keywords || []).map(normalizeStrategyText).filter(Boolean);
  const methods = (strategy.methods || []).map(normalizeStrategyText).filter(Boolean);
  const joined = `${name} ${category} ${keywords.join(' ')} ${methods.join(' ')}`;

  const categoryCopy = {
    '趋势跟踪': {
      fit: '适合走势已经比较清楚、价格沿着一个方向持续推进的时候。',
      caution: '最怕来回震荡，价格没有方向时容易连续小亏。',
    },
    '均值回归': {
      fit: '适合价格在一个区间里来回波动、涨多了会回落、跌多了会反弹的时候。',
      caution: '如果行情真的突破区间并开始单边走，不能一直硬扛。',
    },
    '动量策略': {
      fit: '适合市场情绪和价格速度都比较强，强者继续强的时候。',
      caution: '信号变慢或情绪反转时，追得太晚容易买在高位。',
    },
    '波动率策略': {
      fit: '适合行情波动明显放大，需要用波动幅度来评估风险承受度的时候。',
      caution: '波动突然收缩或异常放大时，参数容易失真。',
    },
    '资金管理': {
      fit: '适合你更关心仓位节奏、组合暴露和风险控制的时候。',
      caution: '它管的是资金分配，不保证单个标的一定选得对。',
    },
    '订单管理': {
      fit: '适合已经有观察条件，需要把风险边界写清楚的时候。',
      caution: '条件设置太近可能频繁提示，设置太远又可能保护不够。',
    },
  };

  let summary = '这个策略会把复杂的价格变化简化成几个规则，帮助你判断走势是在转强、转弱还是继续观察。';
  let watches = methods[0] || keywords[0] || '价格、成交量和指标变化';

  if (/Dual|Thrust|通道/.test(joined)) {
    summary = '它像给价格画出上下警戒线，冲过上沿就认为买方占优，跌破下沿就认为风险变大。';
    watches = '最近一段时间的最高价、最低价和收盘价形成的价格通道。';
  } else if (/海龟|ATR|唐安奇/.test(joined)) {
    summary = '它像顺着大浪走，行情突破后确认趋势，再用波动范围评估风险。';
    watches = '价格是否突破重要区间，以及 ATR 反映的市场波动大小。';
  } else if (/均线|EMA|DMA|TEMA|金叉|死叉/.test(joined)) {
    summary = '它把价格拉成几条平滑的线，用短线和长线的位置变化判断趋势有没有转强或转弱。';
    watches = '短期均线和长期均线的交叉、距离和方向。';
  } else if (/BOLL|布林|标准差/.test(joined)) {
    summary = '它像给价格套一个弹性区间，太靠上可能偏热，太靠下可能偏冷。';
    watches = '价格相对布林带上轨、中轨、下轨的位置。';
  } else if (/RSI|CCI|W&R|超买|超卖/.test(joined)) {
    summary = '它在看市场有没有短时间涨过头或跌过头，用来提醒别在情绪最热时追高。';
    watches = '指标是否进入超买或超卖区域。';
  } else if (/MACD|KDJ|MOM|ROC|CMO|动量/.test(joined)) {
    summary = '它关注价格变化的速度和力度，想抓住正在变强的方向。';
    watches = '动量指标的方向、交叉和强弱变化。';
  } else if (/网格/.test(joined)) {
    summary = '它把价格区间切成一格一格，低一点买一些，高一点卖一些，靠波动慢慢做差价。';
    watches = '预设价格网格和当前价格落在哪一格。';
  } else if (/定投|定买|价值平均/.test(joined)) {
    summary = '它把观察节奏规则化，价格低或目标差距大时提高关注度，价格高时降低追踪权重。';
    watches = '当前市值和目标市值之间的差距。';
  } else if (/止盈|止损|委托|下单|条件/.test(joined)) {
    summary = '它把事先想好的风险边界显性化，减少临场判断的漂移。';
    watches = '你预设的触发价、风险线或跟踪条件。';
  }

  const fallback = categoryCopy[category] || categoryCopy['资金管理'];

  return {
    summary,
    watches,
    fit: fallback.fit,
    caution: fallback.caution,
  };
}

/* ================================================================
   Card Shell
   ================================================================ */
function CardShell({ title, children, rightContent }) {
  return (
    <div className="strategy-card">
      <span style={{ position:'absolute',top:0,left:0,width:10,height:10,
        borderTop:'2px solid rgba(59,130,246,0.6)',borderLeft:'2px solid rgba(59,130,246,0.6)',pointerEvents:'none' }} />
      <span style={{ position:'absolute',top:0,right:0,width:10,height:10,
        borderTop:'2px solid rgba(139,92,246,0.5)',borderRight:'2px solid rgba(139,92,246,0.5)',pointerEvents:'none' }} />
      {title && (
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14,flexShrink:0 }}>
          <span style={{ display:'inline-block',width:2,height:14,borderRadius:2,
            background:'linear-gradient(180deg, #3b82f6, #8b5cf6)',flexShrink:0 }} />
          <span style={{ fontSize:15,fontWeight:700,color:'#fff',letterSpacing:'0.025em' }}>{title}</span>
          {rightContent && <div style={{ marginLeft:'auto' }}>{rightContent}</div>}
        </div>
      )}
      <div style={{ flex:1,minHeight:0 }}>{children}</div>
    </div>
  );
}

/* ================================================================
   Tab: Real-time Position Analysis (existing)
   ================================================================ */
function StatCards({ positions, totalMarketVal, totalPnl, dayPnlPct }) {
  const winRate = positions.length ? (positions.filter(p=>(p.pnl||0)>=0).length / positions.length * 100).toFixed(0) : 0;
  const avgReturn = positions.length ? (positions.reduce((s,p)=>s+(p.pnlPct||0),0) / positions.length).toFixed(1) : 0;
  const cards = [
    { icon: faLightbulb, iconColor:'#8b5cf6', value:positions.length, title:'持仓数量', valColor:'#8b5cf6', suffix:'只股票' },
    { icon: faChartLine, iconColor:'#3b82f6', value:`${avgReturn}%`, title:'平均收益率', valColor:parseFloat(avgReturn)>=0?'#22c55e':'#ef4444', suffix:'实时' },
    { icon: faTrophy, iconColor:'#06b6d4', value:`${winRate}%`, title:'胜率', valColor:'#06b6d4', suffix:'盈利占比' },
  ];
  return (
    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20 }}>
      {cards.map((c,i) => (
        <div key={i} style={{ background:'rgba(15,23,42,0.8)',backdropFilter:'blur(12px)',
          border:'1px solid rgba(148,163,184,0.15)',borderRadius:12,padding:'16px 20px',boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:40,height:40,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',
              background:`${c.iconColor}15`,border:`1px solid ${c.iconColor}30` }}>
              <FontAwesomeIcon icon={c.icon} style={{ color:c.iconColor,fontSize:16 }} />
            </div>
            <div>
              <div style={{ fontSize:11,color:'#94a3b8',marginBottom:2 }}>{c.title}</div>
              <div style={{ fontSize:22,fontWeight:700,color:c.valColor,textShadow:`0 0 10px ${c.valColor}44` }}>{c.value}
                <span style={{ fontSize:10,color:'#64748b',marginLeft:6 }}>{c.suffix}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioPieCard({ positions, totalMarketVal }) {
  const option = useMemo(() => {
    if (!positions.length || totalMarketVal <= 0) return {};
    const colors = ['#3b82f6','#8b5cf6','#06b6d4','#22c55e','#f59e0b','#ec4899'];
    return {
      series: [{ type:'pie',radius:['55%','80%'],center:['50%','50%'],label:{ show:false },emphasis:{ scaleSize:6 },
        data: positions.map((p,i) => ({
          value: parseFloat((p.marketVal/totalMarketVal*100).toFixed(1)), name: p.name,
          itemStyle: { color: colors[i%colors.length] },
        })),
      }],
      tooltip: { trigger:'item',backgroundColor:'rgba(15,23,42,0.95)',borderColor:'#3b82f6',
        textStyle:{ color:'#e2e8f0',fontSize:11 }, formatter: '{b}: {c}%' },
    };
  }, [positions, totalMarketVal]);
  return (
    <CardShell title="持仓分布"><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></CardShell>
  );
}

function PnlComparisonCard({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => (b.pnlPct||0) - (a.pnlPct||0));
    return {
      grid: { left:10,right:14,top:8,bottom:0,containLabel:true },
      xAxis: { type:'category',data:sorted.map(p=>p.name.length>4?p.name.slice(0,4)+'..':p.name),
        axisLine:{show:false},axisTick:{show:false},axisLabel:{color:'#94a3b8',fontSize:9} },
      yAxis: { type:'value',axisLabel:{color:'#64748b',fontSize:10,formatter:'{value}%'},
        splitLine:{lineStyle:{color:'rgba(148,163,184,0.1)'}} },
      series: [{ type:'bar',data:sorted.map(p=>parseFloat((p.pnlPct||0).toFixed(2))),barWidth:'55%',
        itemStyle: { borderRadius:[4,4,0,0],
          color: (p) => p.value>=0
            ? new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#22c55e'},{offset:1,color:'#16a34a'}])
            : new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ef4444'},{offset:1,color:'#dc2626'}])
        },
        label:{ show:true,position:'top',color:'#94a3b8',fontSize:9,formatter:'{c}%' },
      }],
      tooltip:{ trigger:'axis',backgroundColor:'rgba(15,23,42,0.95)',borderColor:'#3b82f6',
        textStyle:{color:'#e2e8f0',fontSize:11} },
    };
  }, [positions]);
  return (
    <CardShell title="个股收益对比"><ReactECharts option={option} style={{height:'100%',width:'100%'}} opts={{renderer:'canvas'}} notMerge lazyUpdate /></CardShell>
  );
}

function StrategyAdviceCard({ positions, totalMarketVal }) {
  const advices = useMemo(() => {
    const list = [];
    const maxP = [...positions].sort((a,b) => b.marketVal - a.marketVal)[0];
    if (maxP && totalMarketVal > 0 && maxP.marketVal/totalMarketVal > 0.3) {
      list.push({ icon:faExclamationTriangle,color:'#f59e0b',title:'降低集中度',
        desc:`${maxP.name}占比${(maxP.marketVal/totalMarketVal*100).toFixed(0)}%，建议分散配置`,
        action:'检查单一标的暴露是否过高' });
    }
    if (positions.length >= 1 && positions.length < 3) {
      list.push({ icon:faStar,color:'#3b82f6',title:'增加分散度',
        desc:`当前仅${positions.length}只股票，建议持有5-10只分散风险`,
        action:'考虑增加持仓品种' });
    }
    const weakPositions = positions.filter(p => (p.pnlPct||0) < -5);
    if (weakPositions.length) {
      list.push({ icon:faExclamationTriangle,color:'#ef4444',title:'弱势复盘',
        desc:`${weakPositions.length}只股票跌幅超5%: ${weakPositions.map(p=>p.name).join(', ')}`,
        action:'检查长期逻辑是否仍成立' });
    }
    if (positions.length >= 3 && !weakPositions.length && (!maxP || maxP.marketVal/totalMarketVal <= 0.3)) {
      list.push({ icon:faCheckCircle,color:'#22c55e',title:'持仓健康',
        desc:'当前持仓结构合理，分散度良好',action:'继续保持' });
    }
    return list;
  }, [positions, totalMarketVal]);

  return (
    <CardShell title="策略建议" rightContent={<span style={{fontSize:10,color:'#64748b'}}>基于实时持仓分析</span>}>
      <div style={{display:'flex',flexDirection:'column',gap:12,overflow:'auto',flex:1}}>
        {advices.map((s,i) => (
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:12,
            background:'rgba(30,41,59,0.4)',borderRadius:8,border:'1px solid rgba(59,130,246,0.1)'}}>
            <FontAwesomeIcon icon={s.icon} style={{color:s.color,fontSize:18,marginTop:2}} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:4}}>{s.title}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>{s.desc}</div>
              <div style={{fontSize:10,color:s.color}}>{s.action}</div>
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function PositionTableCard({ positions, totalMarketVal }) {
  return (
    <CardShell title="持仓明细" rightContent={<span style={{fontSize:10,color:'#64748b'}}>{positions.length}只</span>}>
      <div style={{overflow:'auto',flex:1}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            {['代码','名称','数量','成本','现价','盈亏%','市值','占比'].map(h=>(
              <th key={h} style={{padding:'8px 6px',fontSize:10,color:'#94a3b8',textAlign:'left'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{positions.map(p=>(
              <tr key={p.code} style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                <td style={{padding:'8px 6px',fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{p.code}</td>
                <td style={{padding:'8px 6px',fontSize:12,color:'#fff'}}>{p.name}</td>
                <td style={{padding:'8px 6px',fontSize:11,color:'#fff',fontFamily:'monospace'}}>{p.quantity.toLocaleString()}</td>
                <td style={{padding:'8px 6px',fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{p.costPrice.toFixed(2)}</td>
                <td style={{padding:'8px 6px',fontSize:11,color:'#fff',fontFamily:'monospace'}}>{p.curPrice.toFixed(2)}</td>
                <td style={{padding:'8px 6px',fontSize:11,fontFamily:'monospace',color:(p.pnlPct||0)>=0?'#22c55e':'#ef4444'}}>
                  {(p.pnlPct||0)>=0?'+':''}{(p.pnlPct||0).toFixed(2)}%
                </td>
                <td style={{padding:'8px 6px',fontSize:11,color:'#fff',fontFamily:'monospace'}}>{(p.marketVal/10000).toFixed(1)}w</td>
                <td style={{padding:'8px 6px',fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>
                  {totalMarketVal>0?((p.marketVal/totalMarketVal)*100).toFixed(1):0}%
                </td>
              </tr>
            ))}</tbody>
        </table>
      </div>
    </CardShell>
  );
}

function RealTimeTab({ positions, totalMarketVal, totalPnl, dayPnlPct }) {
  return (
    <>
      <LongTermStockPanel positions={positions} />
      <StatCards positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} dayPnlPct={dayPnlPct} />
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16,minHeight:320}}>
        <PortfolioPieCard positions={positions} totalMarketVal={totalMarketVal} />
        <PnlComparisonCard positions={positions} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,minHeight:320}}>
        <StrategyAdviceCard positions={positions} totalMarketVal={totalMarketVal} />
        <PositionTableCard positions={positions} totalMarketVal={totalMarketVal} />
      </div>
    </>
  );
}

function LongTermStockPanel({ positions }) {
  const [loading, setLoading] = useState(false);
  const [radar, setRadar] = useState(null);

  useEffect(() => {
    if (!positions.length) { setRadar(null); return; }
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await analyzeStockRadar(positions.map(p => p.code), 'day', 360);
        if (active) setRadar(data);
      } catch (e) {
        console.error('Stock radar analysis failed:', e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [positions.map(p => p.code).join(',')]);

  const colorFor = (score) => score >= 70 ? '#22c55e' : score >= 55 ? '#60a5fa' : score >= 40 ? '#f59e0b' : '#ef4444';
  const groups = [
    { key: 'strong', label: '强势候选' },
    { key: 'watch', label: '观察名单' },
    { key: 'weak', label: '偏弱修复' },
  ];
  const visibleGroups = groups.map(group => ({ ...group, items: (radar?.[group.key] || []).slice(0, 4) }));

  return (
    <CardShell
      title="强势股票雷达"
      rightContent={<span style={{fontSize:10,color:'#64748b'}}>{loading ? '扫描中...' : `${radar?.summary?.total || 0}只 · 日线360点`}</span>}
    >
      <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:10}}>
        {visibleGroups.map((group) => (
          <div key={group.key} style={{display:'flex',flexDirection:'column',gap:8,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'#94a3b8'}}>
              <span>{group.label}</span>
              <span style={{marginLeft:'auto',fontFamily:'monospace'}}>{group.items.length}</span>
            </div>
            {group.items.map((r) => {
              const p = positions.find(item => item.code === r.code);
              const strength = r.radar?.strengthScore ?? r.score;
              const color = colorFor(strength);
              return (
                <div key={r.code} style={{padding:12,borderRadius:8,background:'rgba(30,41,59,0.45)',border:'1px solid rgba(59,130,246,0.12)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p?.name || r.code}</span>
                    <span style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace'}}>{r.code}</span>
                    <span style={{marginLeft:'auto',fontSize:14,fontWeight:700,color}}>{strength}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:6,marginBottom:8}}>
                    {[
                      ['长期分', r.score],
                      ['年收益', `${r.metrics?.oneYearReturn ?? 0}%`],
                      ['回撤', `${r.metrics?.drawdownPct ?? 0}%`],
                    ].map(([label, value]) => (
                      <div key={label} style={{background:'rgba(15,23,42,0.35)',borderRadius:6,padding:'5px 6px'}}>
                        <div style={{fontSize:9,color:'#64748b'}}>{label}</div>
                        <div style={{fontSize:10,color:'#e2e8f0',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis'}}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {r.radar?.reasons?.length > 0 && (
                    <div style={{fontSize:10,lineHeight:1.5,color:'#cbd5e1'}}>{r.radar.reasons[0]}</div>
                  )}
                  {r.company && (
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:6}}>
                      公司分 {r.company.score} · {r.company.level}
                    </div>
                  )}
                  {r.radar?.warnings?.length > 0 && (
                    <div style={{fontSize:10,color:'#f59e0b',marginTop:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.radar.warnings[0]}</div>
                  )}
                </div>
              );
            })}
            {!loading && group.items.length === 0 && (
              <div style={{fontSize:12,color:'#64748b',padding:'18px 10px',textAlign:'center',border:'1px dashed rgba(148,163,184,0.14)',borderRadius:8}}>
                暂无{group.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </CardShell>
  );
}

/* ================================================================
   Tab: Strategy Library
   ================================================================ */
function StrategyLibraryTab({ positions }) {
  const [search, setSearch] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [expandedStrategy, setExpandedStrategy] = useState(null);

  const categories = ['全部', ...CATEGORY_ORDER];

  const toggleStrategy = (strategyKey) => {
    setExpandedStrategy((current) => (current === strategyKey ? null : strategyKey));
  };

  const handleStrategyKeyDown = (event, strategyKey) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleStrategy(strategyKey);
    }
  };

  const filtered = useMemo(() => {
    return strategies.filter(s => {
      if (activeCategory !== '全部' && s.category !== activeCategory) return false;
      if (search && !researchFriendlyText(s.name).includes(search) && !s.keywords.some(k => researchFriendlyText(k).includes(search)) && !s.methods.some(m => researchFriendlyText(m).includes(search))) return false;
      return true;
    });
  }, [search, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts = { '全部': strategies.length };
    CATEGORY_ORDER.forEach(cat => {
      counts[cat] = strategies.filter(s => s.category === cat).length;
    });
    return counts;
  }, []);

  const runAnalysis = async () => {
    if (!positions.length) return;
    setAnalyzing(true);
    try {
      const codes = positions.map(p => p.code);
      const data = await analyzeStrategies(codes);
      setAnalysisResults(data.results || []);
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Category Tabs */}
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{
              padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,
              border:'1px solid',cursor:'pointer',transition:'all 0.2s',
              color: activeCategory === cat ? '#fff' : '#94a3b8',
              background: activeCategory === cat ? 'rgba(59,130,246,0.2)' : 'rgba(30,41,59,0.5)',
              borderColor: activeCategory === cat ? 'rgba(59,130,246,0.4)' : 'rgba(148,163,184,0.15)',
            }}>
            {cat === '全部' ? <FontAwesomeIcon icon={faFilter} style={{marginRight:4}} /> :
              CATEGORY_ICONS[cat] && <FontAwesomeIcon icon={CATEGORY_ICONS[cat]} style={{marginRight:4}} />}
            {cat} <span style={{fontSize:10,opacity:0.6,marginLeft:4}}>{categoryCounts[cat]||0}</span>
          </button>
        ))}
        <div style={{flex:1}} />
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:6,
          background:'rgba(30,41,59,0.6)',border:'1px solid rgba(148,163,184,0.15)',width:240}}>
          <FontAwesomeIcon icon={faSearch} style={{color:'#64748b',fontSize:12}} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索策略名称或关键词..."
            style={{background:'transparent',border:'none',outline:'none',color:'#e2e8f0',fontSize:12,flex:1}} />
        </div>
      </div>

      {/* Strategy Grid */}

      {/* Analysis Section */}
      {positions.length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={runAnalysis} disabled={analyzing}
              style={{padding:'8px 20px',borderRadius:6,fontSize:12,fontWeight:600,
                color:'#fff',border:'none',cursor:analyzing?'wait':'pointer',
                background:analyzing?'rgba(59,130,246,0.3)':'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                opacity:analyzing?0.7:1}}>
              <FontAwesomeIcon icon={faChartLine} style={{marginRight:6}} spin={analyzing} />
              {analyzing ? '分析中...' : `对当前${positions.length}只持仓运行指标分析`}
            </button>
            {analysisResults && (
              <span style={{fontSize:11,color:'#94a3b8'}}>
                共{analysisResults.reduce((s,r)=>s+(r.signals?.length||0),0)}个指标提示
              </span>
            )}
          </div>

          {analysisResults && analysisResults.length > 0 && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))',gap:12,marginTop:12}}>
              {analysisResults.filter(r => !r.error).map((result) => (
                <div key={result.code} style={{background:'rgba(15,23,42,0.9)',border:'1px solid rgba(59,130,246,0.2)',
                  borderRadius:8,padding:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>{result.code}</span>
                    <span style={{fontSize:13,color:result.changePct>=0?'#22c55e':'#ef4444'}}>
                      ¥{result.price?.toFixed(2)} ({result.changePct>=0?'+':''}{result.changePct?.toFixed(2)}%)
                    </span>
                    {/* Mini indicator chips */}
                    <span style={{marginLeft:'auto',fontSize:9,color:'#64748b'}}>
                      RSI{result.indicators?.rsi14?.toFixed(0)||'--'} |
                      K{result.indicators?.kdj?.k?.toFixed(0)||'--'} |
                      D{result.indicators?.kdj?.d?.toFixed(0)||'--'}
                    </span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {result.signals?.filter(s => s.signal !== 'hold').slice(0, 4).map((sig, j) => (
                      <div key={j} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 8px',borderRadius:4,
                        background:sig.signal==='buy'?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)',
                        border:`1px solid ${sig.signal==='buy'?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`}}>
                        <span style={{fontSize:10,fontWeight:600,
                          color:sig.signal==='buy'?'#22c55e':'#ef4444',
                          padding:'1px 6px',borderRadius:3,
                          background:sig.signal==='buy'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)'}}>
                          {sig.signal==='buy'?'转强':'转弱'} {sig.strength}%
                        </span>
                        <span style={{fontSize:10,color:'#94a3b8'}}>{sig.strategy}</span>
                        <span style={{fontSize:10,color:'#e2e8f0',flex:1}}>{sig.reason}</span>
                      </div>
                    ))}
                    {result.signals?.filter(s => s.signal !== 'hold').length === 0 && (
                      <span style={{fontSize:10,color:'#64748b'}}>当前无明确强弱提示</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))',gap:14}}>
        {filtered.map((s,i) => {
          const strategyKey = `${s.category}-${s.name}-${i}`;
          const isExpanded = expandedStrategy === strategyKey;
          const explanation = getStrategyExplanation(s);

          return (
            <div key={strategyKey}
              data-testid="strategy-library-card"
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-controls={`strategy-explanation-${i}`}
              style={{background:'rgba(15,23,42,0.85)',border:'1px solid rgba(59,130,246,0.15)',
                borderRadius:10,padding:16,display:'flex',flexDirection:'column',gap:10,
                transition:'all 0.2s',cursor:'pointer',outline:'none'}}
              onClick={() => toggleStrategy(strategyKey)}
              onKeyDown={(event) => handleStrategyKeyDown(event, strategyKey)}
              onFocus={e => { e.currentTarget.style.borderColor='rgba(59,130,246,0.4)'; e.currentTarget.style.boxShadow='0 0 16px rgba(59,130,246,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor='rgba(59,130,246,0.15)'; e.currentTarget.style.boxShadow='none'; }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(59,130,246,0.4)'; e.currentTarget.style.boxShadow='0 0 16px rgba(59,130,246,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(59,130,246,0.15)'; e.currentTarget.style.boxShadow='none'; }}>
              {/* Header */}
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:14,fontWeight:600,color:'#fff'}}>{researchFriendlyText(s.name)}</span>
                {s.isEth && <span style={{fontSize:9,padding:'1px 6px',borderRadius:3,
                  background:'rgba(139,92,246,0.15)',color:'#a78bfa'}}>ETH</span>}
                <span style={{marginLeft:'auto',fontSize:10,padding:'2px 8px',borderRadius:4,
                  background:'rgba(59,130,246,0.1)',color:'#60a5fa'}}>{s.category}</span>
              </div>
              {/* Keywords */}
              {s.keywords.length > 0 && (
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {s.keywords.map((kw,j) => (
                    <span key={j} style={{fontSize:10,padding:'2px 8px',borderRadius:4,
                      background:'rgba(30,41,59,0.8)',color:'#94a3b8',
                      border:'1px solid rgba(148,163,184,0.1)'}}>{researchFriendlyText(kw)}</span>
                  ))}
                </div>
              )}
              {/* Methods */}
              {s.methods.length > 0 && (
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {s.methods.map((m,j) => (
                    <div key={j} style={{fontSize:11,color:'#94a3b8',display:'flex',alignItems:'flex-start',gap:6}}>
                      <span style={{color:'#3b82f6',flexShrink:0}}>{j+1}.</span>
                      <span>{researchFriendlyText(m)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{fontSize:10,color:isExpanded?'#a78bfa':'#64748b',marginTop:'auto'}}>
                {isExpanded ? '收起解释' : '点击查看解释'}
              </div>
              {isExpanded && (
                <div id={`strategy-explanation-${i}`} style={{
                  borderTop:'1px solid rgba(148,163,184,0.12)',paddingTop:10,
                  display:'grid',gap:8,
                }}>
                  {[
                    ['一句话理解', explanation.summary],
                    ['它在看什么', explanation.watches],
                    ['适合什么时候', explanation.fit],
                    ['要小心什么', explanation.caution],
                  ].map(([label, text]) => (
                    <div key={label}>
                      <div style={{fontSize:10,color:'#60a5fa',marginBottom:3}}>{label}</div>
                      <div style={{fontSize:11,lineHeight:1.6,color:'#cbd5e1'}}>{text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{textAlign:'center',padding:60,color:'#64748b'}}>
          <FontAwesomeIcon icon={faSearch} style={{fontSize:32,opacity:0.3,marginBottom:12}} />
          <div style={{fontSize:13}}>未找到匹配的策略</div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Main Page
   ================================================================ */
export default function StrategyRecommendation() {
  useTitle('策略推荐');
  const { positions, loading, totalMarketVal, totalPnl, dayPnlPct } = usePortfolioData();
  const [tab, setTab] = useState('realtime');

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background:'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
      {/* Header */}
      <header className="relative flex h-[60px] shrink-0 items-center justify-between overflow-hidden border-b px-6"
        style={{ borderColor:'rgba(59,130,246,0.2)',background:'rgba(7,11,20,0.85)',backdropFilter:'blur(8px)' }}>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 via-purple-400/40 to-transparent" />
        <div className="relative z-10 flex items-center gap-4">
          <FontAwesomeIcon icon={faLightbulb} className="text-sm" style={{ color:'#8b5cf6',filter:'drop-shadow(0 0 6px rgba(139,92,246,0.5))' }} />
          <h1 className="text-xl font-bold tracking-widest text-white" style={{ textShadow:'0 0 14px rgba(139,92,246,0.4)' }}>策略推荐</h1>
          <div className="h-5 w-px bg-gradient-to-b from-transparent via-purple-400/60 to-transparent" />
          <span className="text-xs font-medium tracking-[0.2em] text-cyber-gray">STRATEGIES</span>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          {[{ id:'realtime',label:'持仓分析',icon:faChartLine },
            { id:'library',label:'策略库',icon:faBook }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding:'6px 16px',borderRadius:6,fontSize:12,fontWeight:500,
                border:'1px solid',cursor:'pointer',transition:'all 0.2s',
                color: tab===t.id ? '#fff' : '#94a3b8',
                background: tab===t.id ? 'rgba(139,92,246,0.15)' : 'transparent',
                borderColor: tab===t.id ? 'rgba(139,92,246,0.3)' : 'transparent',
              }}>
              <FontAwesomeIcon icon={t.icon} style={{marginRight:6}} />{t.label}
            </button>
          ))}
          <span className="text-[10px] text-cyber-gray ml-2">
            {tab === 'library' ? `${strategies.length}个策略` : `${positions.length}只持仓`}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {tab === 'realtime' && (
          positions.length > 0 ? (
            <RealTimeTab positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} dayPnlPct={dayPnlPct} />
          ) : (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
              <div style={{textAlign:'center'}}>
                <FontAwesomeIcon icon={faChartLine} style={{fontSize:48,color:'rgba(148,163,184,0.2)',marginBottom:16}} />
                <p style={{fontSize:14,color:'#94a3b8'}}>暂无持仓数据，无法生成实时分析</p>
                <p style={{fontSize:12,color:'#64748b',marginTop:8}}>请先前往"持仓明细"添加股票，或浏览"策略库"查看可用策略</p>
                <button onClick={() => setTab('library')}
                  style={{marginTop:16,padding:'8px 20px',borderRadius:6,fontSize:12,fontWeight:500,
                    color:'#a78bfa',border:'1px solid rgba(139,92,246,0.3)',background:'rgba(139,92,246,0.1)',cursor:'pointer'}}>
                  <FontAwesomeIcon icon={faBook} style={{marginRight:6}} />浏览策略库
                </button>
              </div>
            </div>
          )
        )}
        {tab === 'library' && <StrategyLibraryTab positions={positions} />}
      </div>
    </div>
  );
}
