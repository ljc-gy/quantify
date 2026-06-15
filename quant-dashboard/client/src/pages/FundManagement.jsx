import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTitle } from '../hooks/useTitle';
import PageHeader from '../components/PageHeader';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

// ECharts global CJK font fix ? canvas default font does not render Chinese
const CJK_FONT = 'Microsoft YaHei, SimHei, PingFang SC, Noto Sans CJK SC, sans-serif';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSackDollar,
  faCube,
  faChartLine,
  faFileInvoiceDollar,
  faTableCells,
  faLandmark,
  faLock,
  faLayerGroup,
  faGear,
  faBoxesStacked,
  faExpand,
  faCircle,
  faFileExport,
  faPlus,
  faTimes,
  faSearch,
  faSort,
  faSortUp,
  faSortDown,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { resolveFund, fetchFunds, addFund, deleteFund,
  refreshNav, fetchYesterdayReturn, fetchFundHistory, fetchPortfolioTrend, fetchLongTermFunds,
  fetchFundRadar,
  fetchMarketFundScan,
} from '../services/api';
import { rankLongTermFundResults } from './fundLongTermView';
import Top10Recommend from './Top10Recommend';
// Real chart data now computed from API snapshots

/* ================================================================
   Shared: Card shell & Legend
   ================================================================ */
function FundCard({ title, rightContent, children, className = '' }) {
  return (
    <div className={`fund-card ${className}`}>
      <div className="fund-card-title">
        <span className="title-text">{title}</span>
        {rightContent && <div className="ml-auto">{rightContent}</div>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <FontAwesomeIcon icon={faCircle} className="text-[7px]" style={{ color }} />
      <span className="text-[10px] text-cyber-gray">{label}</span>
    </div>
  );
}

/* ================================================================
   Tab bar
   ================================================================ */
const TABS = [
  { id: 'charts',     label: '趋势总览', icon: faChartLine },
  { id: 'strong',     label: '强势捕捉', icon: faFileInvoiceDollar },
  { id: 'detail',     label: '基金明细', icon: faTableCells },
  { id: 'return',     label: '收益分析', icon: faChartLine },
];

function TabBar({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-medium transition-all hover-scale ${
            active === tab.id ? 'text-white' : 'text-cyber-gray hover:text-white/80'
          }`}
          style={
            active === tab.id
              ? { background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.15))', border: '1px solid rgba(59,130,246,0.3)' }
              : { background: 'transparent', border: '1px solid transparent' }
          }
        >
          <FontAwesomeIcon icon={tab.icon} className="text-[11px]" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ================================================================
   Build category cards from real fund data (grouped by type)
   ================================================================ */
const CAT_ICONS = [faCube, faFileInvoiceDollar, faLandmark, faLayerGroup, faBoxesStacked];
const CAT_RIGHT_ICONS = [faChartLine, faTableCells, faLock, faGear, faExpand];
const CAT_COLORS = ['#a78bfa', '#60a5fa', '#22d3ee', '#60a5fa', '#a78bfa'];
const CAT_BGS = [
  'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))',
  'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.2))',
  'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.2))',
  'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(16,185,129,0.2))',
  'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))',
];
const CAT_BORDERS = ['rgba(139,92,246,0.4)', 'rgba(59,130,246,0.4)', 'rgba(6,182,212,0.4)', 'rgba(16,185,129,0.4)', 'rgba(236,72,153,0.4)'];

function buildCategories(funds) {
  const groups = {};
  for (const f of funds) {
    const t = f.type || '其他';
    if (!groups[t]) groups[t] = { funds: [], totalAmount: 0, totalPL: 0, count: 0 };
    groups[t].funds.push(f);
    groups[t].totalAmount += f.amount || 0;
    groups[t].totalPL += f.pl || 0;
    groups[t].count++;
  }
  const keys = Object.keys(groups);
  return keys.slice(0, 5).map((k, i) => ({
    id: i,
    label: k,
    amount: groups[k].totalAmount.toFixed(2),
    holding: `持仓总金额：${groups[k].totalAmount.toFixed(2)}`,
    pl: groups[k].totalPL.toFixed(2),
    count: groups[k].count,
    icon: CAT_ICONS[i] || faCube,
    rightIcon: CAT_RIGHT_ICONS[i] || faChartLine,
    color: CAT_COLORS[i] || '#a78bfa',
    bg: CAT_BGS[i] || CAT_BGS[0],
    border: CAT_BORDERS[i] || CAT_BORDERS[0],
    type: k,
  }));
}

/* ================================================================
   Category card (with selection)
   ================================================================ */
function CategoryCard({ data, selected, onClick }) {
  const isSel = selected === data.id;
  return (
    <div
      onClick={() => onClick(data.id)}
      className={`fund-cat-card hover-scale cursor-pointer transition-all duration-300 ${isSel ? 'fund-cat-selected' : ''}`}
      style={{
        background: isSel ? 'linear-gradient(135deg, rgba(59,130,246,0.45), rgba(139,92,246,0.35))' : data.bg,
        borderColor: isSel ? 'rgba(96,165,250,0.6)' : data.border,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${data.border}` }}>
          <FontAwesomeIcon icon={data.icon} className="text-lg" style={{ color: data.color, filter: `drop-shadow(0 0 6px ${data.color})` }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-white mb-1 tracking-wide">{data.label}</div>
          <div className="text-[22px] font-bold font-mono text-white leading-none mb-1 text-glow">{data.amount}</div>
          <div className="text-[10px] text-cyber-gray truncate">{data.holding}</div>
        </div>
        <div className="flex-shrink-0 pt-1">
          <FontAwesomeIcon icon={data.rightIcon} className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }} />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Chart option builders
   ================================================================ */

function makeDonutOption(dataItems, centerX) {
  return {
    animation: true, animationDuration: 800,
    textStyle: { fontFamily: CJK_FONT },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: 'rgba(59,130,246,0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (p) => p.name + ': ' + Number(p.value).toLocaleString() + ' 元 (' + p.percent + '%)',
    },
    series: [
      {
        type: 'pie', radius: ['60%', '85%'], center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderColor: 'rgba(15,23,42,0.95)', borderWidth: 3 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
          scaleSize: 8,
        },
        data: dataItems,
      },
    ],
    graphic: [
      {
        type: 'text', left: 'center', top: 'center',
        style: { text: centerX, textAlign: 'center', fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
      },
    ],
  };
}

function makePLBarOption(funds) {
  const sorted = [...funds].sort((a, b) => (b.pl || 0) - (a.pl || 0));
  const plValues = sorted.map(f => f.pl || 0);
  const yMin = Math.min(0, ...plValues);
  const yMax = Math.max(0, ...plValues);
  const pad = Math.max((yMax - yMin) * 0.15, 1000);
  return {
    animation: true, animationDuration: 800,
    textStyle: { fontFamily: CJK_FONT },
    grid: { left: 10, right: 24, top: 8, bottom: 20 },
    xAxis: {
      type: 'category',
      data: sorted.map(f => f.name.length > 6 ? f.name.slice(0, 5) + '...' : f.name),
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    yAxis: {
                      type: 'value', min: Math.max(yMin - pad, 0),
                      max: yMax + pad,
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v) => (v / 10000).toFixed(1) + 'w' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: 'rgba(59,130,246,0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (p) => {
        const f = sorted[p[0].dataIndex];
        const sign = (f.pl || 0) >= 0 ? '+' : '';
        return f.name + '<br/>盈亏: ' + sign + (f.pl || 0).toFixed(2) + ' 元<br/>收益率: ' + sign + (f.rate || 0).toFixed(2) + '%';
      },
    },
    series: [{
      type: 'bar', barWidth: 20,
      data: sorted.map(f => ({
        value: f.pl || 0,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (f.pl || 0) >= 0
            ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#22c55e' }, { offset: 1, color: '#166534' }])
            : new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#991b1b' }]),
        },
      })),
    }],
  };
}

function LongTermFundPanel({ funds }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!funds.length) { setResults([]); return; }
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchLongTermFunds(360);
        const codes = new Set(funds.map(f => f.code).filter(Boolean));
        const filtered = (data.results || []).filter(r => codes.has(r.code));
        if (active) setResults(filtered);
      } catch (e) {
        console.error('Fund long-term analysis failed:', e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [funds.map(f => f.code).join(',')]);

  const ranked = rankLongTermFundResults(results);
  const colorFor = (score) => score >= 70 ? '#22c55e' : score >= 55 ? '#60a5fa' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <FundCard title="长期持有研判" className="fund-long-term-card" rightContent={<span className="text-[10px] text-cyber-gray">{loading ? '分析中...' : `${ranked.length}只 · 净值/快照`}</span>}>
      <div className="grid gap-3 h-full overflow-y-auto pr-1 pb-1 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
        {ranked.map((r) => {
          const color = colorFor(r.score);
          return (
            <div key={r.code} className="rounded-md px-3 py-2 flex flex-col min-w-0" style={{ background: 'rgba(30,41,59,0.45)', border: '1px solid rgba(59,130,246,0.12)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] font-semibold text-white truncate">{r.name}</span>
                <span className="ml-auto text-[13px] font-bold font-mono" style={{ color }}>{r.score}</span>
              </div>
              <div className="text-[10px] text-cyber-gray font-mono mb-2">{r.code} · {r.action}</div>
              <div className="text-[11px] leading-5 text-slate-300 overflow-hidden" style={{ maxHeight: 40 }}>{r.summary}</div>
              <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-cyber-gray">
                <span>年收益 {r.metrics?.oneYearReturn ?? 0}%</span>
                <span>回撤 {r.metrics?.drawdownPct ?? 0}%</span>
              </div>
              <div className="pt-1 flex items-center justify-between text-[10px] text-cyber-gray">
                <span>置信 {r.confidence?.level || '-'}</span>
                <span>验证 {r.validation?.samples || 0}样本/{r.validation?.hitRatePct || 0}%</span>
              </div>
              {r.dataQuality?.warnings?.length > 0 && <div className="text-[10px] text-amber-400 mt-1 truncate">{r.dataQuality.warnings[0]}</div>}
            </div>
          );
        })}
        {!loading && ranked.length === 0 && <div className="flex items-center justify-center text-[12px] text-cyber-gray">暂无足够基金净值数据生成长期研判</div>}
      </div>
    </FundCard>
  );
}

function strengthColor(score) {
  if (score >= 72) return '#22c55e';
  if (score >= 55) return '#60a5fa';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function tierLabel(tier) {
  if (tier === 'strong') return '强势';
  if (tier === 'watch') return '观察';
  return '偏弱';
}

function FundRadarSummary({ radar, loading }) {
  const summary = radar?.summary || {};
  const strongest = radar?.strong?.[0] || radar?.results?.[0];
  const cards = [
    { label: '长期样本', value: summary.total ?? 0, sub: loading ? '更新中' : '360日净值', color: '#e2e8f0' },
    { label: '强势基金', value: summary.strong ?? 0, sub: strongest ? `${strongest.name || strongest.code}` : '等待评分', color: '#22c55e' },
    { label: '观察名单', value: summary.watch ?? 0, sub: '趋势待确认', color: '#60a5fa' },
    { label: '平均强度', value: `${Number(summary.averageStrengthScore || 0).toFixed(1)}`, sub: '雷达分', color: strengthColor(summary.averageStrengthScore || 0) },
    { label: '数据异常', value: radar?.errors?.length ?? 0, sub: '需补齐净值', color: '#f59e0b' },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 mb-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md border px-3 py-2" style={{ background: 'rgba(15,23,42,0.72)', borderColor: 'rgba(59,130,246,0.14)' }}>
          <div className="text-[10px] text-cyber-gray mb-1">{card.label}</div>
          <div className="text-[17px] font-bold font-mono truncate" style={{ color: card.color }}>{card.value}</div>
          <div className="text-[10px] text-cyber-gray truncate mt-0.5">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}


function MarketFundScanner({ onAddFund }) {
  const [scanState, setScanState] = useState('idle');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [progress, setProgress] = useState('');

  const startScan = useCallback(async () => {
    setScanState('scanning');
    setScanError(null);
    setProgress('正在拉取全市场基金排名...');
    try {
      const result = await fetchMarketFundScan({
        scanDays: 360,
        maxPerCategory: 100,
        minScore: 55,
      });
      setScanResult(result);
      setScanState('done');
      setProgress('');
    } catch (err) {
      setScanError(err.message || '扫描失败');
      setScanState('error');
      setProgress('');
    }
  }, []);

  if (scanState === 'scanning') {
    return (
      <div className="rounded-lg border p-8 mb-5 text-center" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(59,130,246,0.2)' }}>
        <div className="animate-pulse">
          <FontAwesomeIcon icon={faSearch} className="text-[24px] text-blue-400 mb-3" />
          <div className="text-[14px] text-white mb-2">正在扫描全市场基金...</div>
          <div className="text-[11px] text-cyber-gray">{progress}</div>
          <div className="mt-4 text-[10px] text-cyber-gray">提示：扫描约400只基金，耗时约60-90秒</div>
        </div>
      </div>
    );
  }

  if (scanState === 'error') {
    return (
      <div className="rounded-lg border p-6 mb-5" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(239,68,68,0.3)' }}>
        <div className="text-[13px] text-red-400 mb-2">扫描失败</div>
        <div className="text-[11px] text-cyber-gray mb-3">{scanError}</div>
        <button onClick={startScan} className="px-4 py-1.5 rounded text-[11px] font-medium text-blue-300 border border-blue-400/20 hover:bg-blue-400/10 hover-scale transition-all">重试</button>
      </div>
    );
  }

  if (scanState === 'done' && scanResult) {
    const { meta, summary, strong, watch, errors } = scanResult;
    return (
      <div className="mb-5">
        {/* Scan meta bar */}
        <div className="flex items-center gap-4 mb-4 px-4 py-2.5 rounded-md" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <FontAwesomeIcon icon={faSearch} className="text-[12px] text-green-400" />
          <span className="text-[11px] text-green-300">全市场扫描完成 — 耗时{meta?.durationSec || '?'}s，扫描{meta?.candidatesScanned || 0}只基金</span>
          <span className="text-[11px] text-cyber-gray ml-auto">涵盖 {meta?.categories?.map(c => c.label).join('·') || '全部'}</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: '强势基金', value: summary?.strong ?? 0, color: '#22c55e' },
            { label: '观察名单', value: summary?.watch ?? 0, color: '#60a5fa' },
            { label: '已分析', value: summary?.totalAnalyzed ?? 0, color: '#e2e8f0' },
            { label: '平均强度', value: (summary?.averageStrengthScore ?? 0).toFixed(1), color: strengthColor(summary?.averageStrengthScore || 0) },
            { label: '异常', value: summary?.errors ?? 0, color: '#f59e0b' },
          ].map(card => (
            <div key={card.label} className="rounded-md border px-3 py-2" style={{ background: 'rgba(15,23,42,0.72)', borderColor: 'rgba(59,130,246,0.14)' }}>
              <div className="text-[10px] text-cyber-gray mb-1">{card.label}</div>
              <div className="text-[17px] font-bold font-mono" style={{ color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Top fund highlight */}
        {summary?.topFund && (
          <div className="mb-4 px-4 py-3 rounded-md" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="text-[10px] text-green-400/60 mb-1">TOP 1 强势基金</div>
            <div className="text-[14px] font-bold text-white">{summary.topFund}</div>
          </div>
        )}

        {/* Strong funds detail list */}
        {strong && strong.length > 0 && (
          <div className="mb-4">
            <div className="text-[13px] font-semibold text-white mb-3 flex items-center gap-2">
              <span style={{ color: '#22c55e' }}>强势候选</span>
              <span className="text-[10px] text-cyber-gray font-normal">{strong.length} 只</span>
            </div>
            <div className="grid gap-3">
              {strong.slice(0, 20).map(item => (
                <MarketFundDetailCard key={item.code} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Watch list (collapsible) */}
        {watch && watch.length > 0 && (
          <details className="mb-3">
            <summary className="text-[12px] text-slate-400 cursor-pointer hover:text-slate-300">观察名单 ({watch.length} 只)</summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {watch.slice(0, 30).map(item => (
                <div key={item.code} className="rounded border px-3 py-2 text-[11px]" style={{ background: 'rgba(30,41,59,0.4)', borderColor: 'rgba(59,130,246,0.1)' }}>
                  <span className="text-white font-medium">{item.name}</span>
                  <span className="text-cyber-gray font-mono ml-2">{item.code}</span>
                  <span className="text-blue-400 ml-2">强度 {item.radar?.strengthScore ?? item.score}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Rescan button */}
        <button onClick={startScan} className="px-4 py-1.5 rounded text-[11px] font-medium text-blue-300 border border-blue-400/15 hover:bg-blue-400/8 hover-scale transition-all">
          <FontAwesomeIcon icon={faSearch} className="mr-1.5 text-[9px]" />
          重新扫描
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6 mb-5 text-center" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(59,130,246,0.2)' }}>
      <div className="text-[13px] text-white mb-2">全市场强势基金扫描</div>
      <div className="text-[11px] text-cyber-gray mb-4 leading-relaxed">
        扫描东方财富全市场基金（股票型·混合型·指数型·QDII），<br/>
        对每只基金获取360日历史净值，运行长期趋势分析，<br/>
        筛选出走势强劲、趋势一致的优质基金。
      </div>
      <button onClick={startScan} className="px-6 py-2 rounded text-[13px] font-bold text-white hover-scale transition-all" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
        <FontAwesomeIcon icon={faSearch} className="mr-2" />
        开始全市场扫描
      </button>
      <div className="mt-3 text-[10px] text-cyber-gray">预计耗时约 60-90 秒</div>
    </div>
  );
}

function MarketFundDetailCard({ item }) {
  const color = strengthColor(item.radar?.strengthScore || item.score || 0);
  const metrics = item.metrics || {};
  const ret = item.rankReturns || {};

  return (
    <div className="rounded-lg border p-4" style={{ background: 'rgba(30,41,59,0.48)', borderColor: 'rgba(59,130,246,0.12)' }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-white truncate">{item.name || item.code}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-cyber-gray font-mono">{item.code}</span>
            <span className="text-[10px] text-cyber-gray">{item.category || '-'}</span>
            {item.rankInceptionDate && <span className="text-[9px] text-slate-600">成立 {item.rankInceptionDate}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-bold font-mono" style={{ color }}>{item.radar?.strengthScore ?? item.score}</div>
          <div className="text-[10px] text-cyber-gray">强度分</div>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          ['长期评分', `${item.score || 0}分`],
          ['年收益', `${metrics.oneYearReturn ?? 0}%`],
          ['半年收益', `${metrics.halfYearReturn ?? 0}%`],
          ['最大回撤', `${metrics.drawdownPct ?? 0}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded px-2 py-1.5 text-center" style={{ background: 'rgba(15,23,42,0.46)' }}>
            <div className="text-[9px] text-cyber-gray">{label}</div>
            <div className="text-[13px] font-bold font-mono text-white mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Market returns */}
      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {[
          ['近1月', ret.month1], ['近3月', ret.month3], ['近6月', ret.month6],
          ['近1年', ret.year1], ['近2年', ret.year2], ['近3年', ret.year3],
        ].map(([label, value]) => (
          <div key={label} className="text-center rounded px-1.5 py-1" style={{ background: 'rgba(15,23,42,0.32)' }}>
            <div className="text-[8px] text-cyber-gray">{label}</div>
            <div className="text-[11px] font-mono font-bold mt-0.5" style={{ color: (value || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
              {(value || 0) >= 0 ? '+' : ''}{(value || 0).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* Reasons */}
      {item.reasons && item.reasons.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] text-cyber-gray mb-1">分析理由</div>
          {item.reasons.slice(0, 3).map((r, i) => (
            <div key={i} className="text-[11px] text-green-300/80 leading-relaxed">{r}</div>
          ))}
        </div>
      )}

      {/* Risks */}
      {item.risks && item.risks.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] text-cyber-gray mb-1">风险提示</div>
          {item.risks.slice(0, 3).map((r, i) => (
            <div key={i} className="text-[10px] text-amber-400/70 leading-relaxed">{r}</div>
          ))}
        </div>
      )}

      {/* Additional metrics */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
        <span>波动率 {metrics.volatilityPct ?? 0}%</span>
        <span>趋势一致性 {metrics.trendConsistencyPct ?? 0}%</span>
        <span>位置分位 {metrics.positionPct ?? 0}%</span>
        <span>当前回撤 {metrics.currentDrawdownPct ?? 0}%</span>
        {item.validation?.samples > 0 && <span>验证 {item.validation.hitRatePct}%胜率</span>}
      </div>

      {/* Data quality */}
      {item.dataQuality && !item.dataQuality.reliable && (
        <div className="mt-2 text-[10px] text-amber-400/60">
          {item.dataQuality.warnings?.join('; ') || '数据质量存疑'}
        </div>
      )}

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-slate-700/30 text-[11px] text-slate-300 leading-relaxed">
        {item.summary || `${item.name} 长期评分 ${item.score}，建议${item.action || '观察'}。`}
      </div>
    </div>
  );
}


function StrengthRadarTab({ radar, loading }) {
  const groups = [
    { key: 'strong', title: '强势候选', empty: '暂无强势基金，先观察趋势是否重新站稳。' },
    { key: 'watch', title: '观察名单', empty: '暂无观察基金。' },
    { key: 'weak', title: '偏弱回避', empty: '暂无偏弱基金。' },
  ];

  if (loading && !radar) {
    return <div className="flex items-center justify-center py-20 text-cyber-gray text-[13px]">正在扫描长期趋势...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4 min-h-0">
      {groups.map((group) => {
        const items = radar?.[group.key] || [];
        return (
          <FundCard
            key={group.key}
            title={group.title}
            rightContent={<span className="text-[10px] text-cyber-gray">{items.length}只</span>}
          >
            <div className="flex flex-col gap-3 overflow-auto pr-1" style={{ maxHeight: 'calc(100vh - 310px)' }}>
              {items.map((item) => {
                const color = strengthColor(item.radar?.strengthScore || item.score || 0);
                return (
                  <div key={item.code} className="rounded-md border p-3" style={{ background: 'rgba(30,41,59,0.48)', borderColor: 'rgba(59,130,246,0.12)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-white truncate">{item.name || item.code}</div>
                        <div className="text-[10px] text-cyber-gray font-mono">{item.code} · {tierLabel(item.radar?.tier)}</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-[18px] font-bold font-mono" style={{ color }}>{item.radar?.strengthScore ?? item.score}</div>
                        <div className="text-[10px] text-cyber-gray">强度</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 my-3">
                      {[
                        ['长期分', item.score],
                        ['年收益', `${item.metrics?.oneYearReturn ?? 0}%`],
                        ['回撤', `${item.metrics?.drawdownPct ?? 0}%`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded px-2 py-1" style={{ background: 'rgba(15,23,42,0.46)' }}>
                          <div className="text-[9px] text-cyber-gray">{label}</div>
                          <div className="text-[11px] text-slate-200 font-mono truncate">{value}</div>
                        </div>
                      ))}
                    </div>
                    {item.radar?.reasons?.length > 0 && (
                      <div className="text-[11px] leading-5 text-slate-300">{item.radar.reasons[0]}</div>
                    )}
                    {item.radar?.warnings?.length > 0 && (
                    <div className="text-[10px] text-amber-400 mt-1 truncate">{item.radar.warnings[0]}</div>
                    )}
                    {item.macro && (
                      <div className="mt-2 pt-2 border-t border-slate-700/20 space-y-1">
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-slate-500">{item.macro.sector || ''}</span>
                          <span className="font-mono" style={{ color: (item.macro.compositeScore || 0) >= 70 ? '#22c55e' : '#f59e0b' }}>综合 {item.macro.compositeScore || '?'}分</span>
                        </div>
                        {item.macro.threeMonthOutlook && (
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-slate-500">3月展望</span>
                            <span className="font-mono" style={{ color: (item.macro.threeMonthOutlook.rangeMax || 0) >= 10 ? '#22c55e' : '#f59e0b' }}>
                              {(item.macro.threeMonthOutlook.rangeMin >= 0 ? '+' : '')}{item.macro.threeMonthOutlook.rangeMin}~{(item.macro.threeMonthOutlook.rangeMax >= 0 ? '+' : '')}{item.macro.threeMonthOutlook.rangeMax}%
                            </span>
                          </div>
                        )}
                        {item.macro.geoRiskNote && (
                          <div className="text-[8px] text-slate-500 leading-relaxed truncate">{item.macro.geoRiskNote}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {items.length === 0 && <div className="text-center py-8 text-[12px] text-cyber-gray">{group.empty}</div>}
            </div>
          </FundCard>
        );
      })}
    </div>
  );
}

function filterRadarByFunds(radar, funds) {
  if (!radar) return null;
  const codes = new Set(funds.map(f => f.code).filter(Boolean));
  const results = (radar.results || []).filter(item => codes.has(item.code));
  const strong = results.filter(item => item.radar?.tier === 'strong');
  const watch = results.filter(item => item.radar?.tier === 'watch');
  const weak = results.filter(item => item.radar?.tier === 'weak');
  const errors = (radar.errors || []).filter(item => codes.has(item.code));
  const averageStrengthScore = results.length
    ? results.reduce((sum, item) => sum + Number(item.radar?.strengthScore || 0), 0) / results.length
    : 0;

  return {
    ...radar,
    summary: {
      total: results.length,
      strong: strong.length,
      watch: watch.length,
      weak: weak.length,
      averageStrengthScore,
    },
    results,
    strong,
    watch,
    weak,
    errors,
  };
}


/* ================================================================
   Tab: Charts
   ================================================================ */
function ChartsTab({ funds }) {
  // Fetch portfolio NAV trend from East Money API
  const [trendData, setTrendData] = useState({ dates: [], values: [] });
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setTrendLoading(true);
      try {
        const data = await fetchPortfolioTrend(60);
        if (!cancelled) setTrendData(data);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setTrendLoading(false); }
    }
    if (funds.length > 0) load();
    else setTrendLoading(false);
    return () => { cancelled = true; };
  }, [funds]);

  const hasHistory = trendData.dates.length > 1;
  const totalAmount = funds.reduce((s, f) => s + (f.amount || 0), 0);

  // Portfolio value trend chart option
  const valueOption = useMemo(() => ({
    animation: true, animationDuration: 800,
    textStyle: { fontFamily: CJK_FONT },
    grid: { left: 10, right: 24, top: 24, bottom: 20 },
    xAxis: {
      type: 'category', data: trendData.dates.map(d => d.slice(5)), boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, interval: Math.max(Math.floor(trendData.dates.length / 8), 1) },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v) => (v / 10000).toFixed(1) + 'w' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)', type: 'dashed' } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: 'rgba(59,130,246,0.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (p) => p[0].axisValueLabel + '<br/>' + p.map(i => i.seriesName + ': ' + Number(i.value).toLocaleString() + ' ').join('<br/>'),
    },
    series: [
      {
        name: '', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: trendData.values, lineStyle: { width: 2, color: '#3b82f6' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59,130,246,0.35)' }, { offset: 1, color: 'rgba(59,130,246,0.02)' }]) },
        itemStyle: { color: '#3b82f6' },
      },
    ],
  }), [trendData]);

  // Fund type distribution donut
  const typeDonut = useMemo(() => {
    const typeMap = {};
    for (const f of funds) {
      const t = f.type || '其他';
      if (!typeMap[t]) typeMap[t] = 0;
      typeMap[t] += f.amount || 0;
    }
    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];
    return Object.entries(typeMap).map(([name, value], i) => ({
      name, value, itemStyle: { color: colors[i % colors.length] },
    }));
  }, [funds]);

  // Individual fund weight donut
  const fundDonut = useMemo(() => {
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e', '#ef4444', '#a78bfa'];
    return [...funds].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 8).map((f, i) => ({
      name: f.name.length > 8 ? f.name.slice(0, 7) + '...' : f.name,
      value: f.amount || 0,
      itemStyle: { color: colors[i % colors.length] },
    }));
  }, [funds]);

  const typeLegend = typeDonut.map(d => ({ color: d.itemStyle.color, label: d.name }));
  const fundLegend = fundDonut.map(d => ({ color: d.itemStyle.color, label: d.name }));

    if (funds.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-0">
        <div className="text-center">
          <div className="text-cyber-gray text-[13px] mb-2">暂无基金数据，图表不可用</div>
          <div className="text-cyber-gray text-[11px] opacity-60">请先在"基金明细"标签页中添加基金持仓</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      <div className="fund-slide-up h-[340px] max-h-[38vh] shrink-0">
        <LongTermFundPanel funds={funds} />
      </div>
      <div className="grid grid-cols-2 gap-5 flex-1 min-h-0">
        <div className="fund-slide-up">
        <FundCard title="持仓走势" rightContent={<div className="flex items-center gap-4"><LegendDot color="#3b82f6" label="持仓市值" /><LegendDot color="#8b5cf6" label="累计盈亏" /></div>}>
          {!hasHistory && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><span className="text-[10px] text-cyber-gray bg-cyber-dark/80 px-3 py-1 rounded">添加基金后自动记录，点击"刷新净值"更新走势</span></div>}
          <ReactECharts key="value" option={valueOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        </FundCard>
        </div>
        <div className="fund-slide-up">
        <FundCard title="基金类型分布" rightContent={<div className="flex items-center gap-3">{typeLegend.map((l, i) => <LegendDot key={i} color={l.color} label={l.label} />)}</div>}>
          <ReactECharts key="type" option={makeDonutOption(typeDonut, funds.length + '只')} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        </FundCard>
        </div>
        <div className="fund-slide-up">
        <FundCard title="个基盈亏排行" rightContent={<div className="flex items-center gap-4"><LegendDot color="#22c55e" label="盈利" /><LegendDot color="#ef4444" label="亏损" /></div>}>
          <ReactECharts key="pl" option={makePLBarOption(funds)} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        </FundCard>
        </div>
        <div className="fund-slide-up">
        <FundCard title="个基权重分布" rightContent={<div className="flex items-center gap-3 flex-wrap">{fundLegend.slice(0, 4).map((l, i) => <LegendDot key={i} color={l.color} label={l.label} />)}</div>}>
          <ReactECharts key="fund" option={makeDonutOption(fundDonut, (totalAmount / 10000).toFixed(1) + 'w')} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        </FundCard>
        </div>
      </div>
    </div>
  );
}
function DetailTab({ funds, onDelete, loading, yesterdayReturns }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Chart modal state
  const [chartFund, setChartFund] = useState(null);
  const [chartSnapshots, setChartSnapshots] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  const handleFundClick = async (fund) => {
    setChartFund(fund);
    setChartLoading(true);
    setChartSnapshots([]);
    try {
      if (fund.code) {
        const data = await fetchFundHistory(fund.code, 60);
        setChartSnapshots(data.history || []);
      }
    } catch (e) { console.error(e); }
    finally { setChartLoading(false); }
  };

  const sortIcon = (field) => sortField !== field ? faSort : (sortDir === 'asc' ? faSortUp : faSortDown);

  let filtered = funds.filter(f => f.name.includes(search) || (f.code || '').includes(search));
  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      const va = sortField === 'rate' ? (a.rate || 0) : (a.pl || 0);
      const vb = sortField === 'rate' ? (b.rate || 0) : (b.pl || 0);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }

  const thStyle = { padding: '8px 12px', fontSize: 11, color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid rgba(59,130,246,0.15)', cursor: 'pointer', userSelect: 'none' };
  const tdStyle = { padding: '10px 12px', fontSize: 12, color: '#e2e8f0', borderBottom: '1px solid rgba(59,130,246,0.08)' };

  if (loading) return <div className="flex items-center justify-center py-20 text-cyber-gray text-[13px]">加载中...</div>;

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 max-w-sm" style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <FontAwesomeIcon icon={faSearch} className="text-[11px] text-cyber-gray" />
          <input className="bg-transparent text-[12px] text-white placeholder:text-cyber-gray outline-none flex-1" placeholder="搜索基金名称或代码..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-[11px] text-cyber-gray">{filtered.length} 条记录</span>
      </div>
      <div className="flex-1 overflow-auto rounded-lg" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...thStyle, width: 100 }}>基金代码</th>
            <th style={thStyle}>基金名称</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>类型</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>持仓份额</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>单位净值</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>持仓金额</th>
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('pl')}><div className="flex items-center justify-end gap-1">盈亏 <FontAwesomeIcon icon={sortIcon('pl')} className="text-[9px]" /></div></th>
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('rate')}><div className="flex items-center justify-end gap-1">收益率 <FontAwesomeIcon icon={sortIcon('rate')} className="text-[9px]" /></div></th>
            <th style={{ ...thStyle, textAlign: 'right' }}>昨日收益</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>管理</th>
          </tr></thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id} className="hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => handleFundClick(f)}>
                <td style={tdStyle}><span className="font-mono text-[11px] text-cyber-gray">{f.code || '-'}</span></td>
                <td style={tdStyle}><span className="font-medium">{f.name}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right' }}><span className="text-[11px] text-cyber-gray">{f.type}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right' }} className="font-mono">{(f.shares || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }} className="font-mono">{(f.nav || 0).toFixed(4)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }} className="font-mono">{(f.amount || 0).toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }} className="font-mono"><span style={{ color: (f.pl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{(f.pl || 0) >= 0 ? '+' : ''}{(f.pl || 0).toFixed(2)}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right' }} className="font-mono"><span style={{ color: (f.rate || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{(f.rate || 0) >= 0 ? '+' : ''}{(f.rate || 0).toFixed(2)}%</span></td>
                <td style={{ ...tdStyle, textAlign: 'right' }} className="font-mono"><span style={{ color: (yesterdayReturns[f.id] || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{(yesterdayReturns[f.id] || 0) >= 0 ? '+' : ''}{(yesterdayReturns[f.id] || 0).toFixed(2)}</span></td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={(event) => { event.stopPropagation(); handleFundClick(f); }} className="px-2.5 py-1 rounded text-[10px] font-medium text-blue-300 border border-blue-400/20 hover:bg-blue-400/10 hover-scale transition-all">走势</button>
                    <button onClick={(event) => { event.stopPropagation(); onDelete(f.id); }} className="px-2 py-1 rounded text-[10px] font-medium text-red-400/60 border border-red-400/10 hover:bg-red-400/10 hover-scale transition-all"><FontAwesomeIcon icon={faTrash} className="text-[9px]" /></button>
                  </div></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>暂无基金数据，点击右上角"添加基金"开始录入</td></tr>
            )}
          </tbody>
        </table>

      {/* Fund NAV chart modal */}
      {chartFund && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => { setChartFund(null); setChartSnapshots([]); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "92vw", maxWidth: 1100, height: "88vh", padding: 24, borderRadius: 12, background: "rgba(15,23,42,0.98)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 0 32px rgba(59,130,246,0.15)", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[16px] font-bold text-white">{chartFund.name}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[11px] text-cyber-gray">{chartFund.code || '-'}</span>
                  <span className="text-[11px] text-cyber-gray">{chartFund.type}</span>
                  <span className="text-[11px] text-cyber-gray">近{chartSnapshots.length}个交易日</span>
                </div>
              </div>
              <button onClick={() => { setChartFund(null); setChartSnapshots([]); }} className="text-cyber-gray hover:text-white transition-colors">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '最新净值', value: (chartFund.nav || 0).toFixed(4), color: '#e2e8f0' },
                { label: '持仓成本', value: (chartFund.cum_nav || 0).toFixed(4), color: '#f59e0b' },
                { label: '持仓盈亏', value: ((chartFund.pl || 0) >= 0 ? '+' : '') + (chartFund.pl || 0).toFixed(2), color: (chartFund.pl || 0) >= 0 ? '#22c55e' : '#ef4444' },
                { label: '收益率', value: ((chartFund.rate || 0) >= 0 ? '+' : '') + (chartFund.rate || 0).toFixed(2) + '%', color: (chartFund.rate || 0) >= 0 ? '#22c55e' : '#ef4444' },
              ].map((s, i) => (
                <div key={i} className="px-3 py-2 rounded-md" style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(59,130,246,0.12)" }}>
                  <div className="text-[10px] text-cyber-gray mb-0.5">{s.label}</div>
                  <div className="text-[14px] font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0" style={{ height: 320 }}>
              {chartLoading ? (
                <div className="flex items-center justify-center h-full text-cyber-gray text-[13px]">正在从东方财富获取历史净值...</div>
              ) : chartSnapshots.length === 0 ? (
                <div className="flex items-center justify-center h-full text-cyber-gray text-[13px]">暂无数据，请确认基金代码正确</div>
              ) : (
                (() => {
                  const dates = chartSnapshots.map(s => (s.date || '').slice(5));
                  
                  const navs = chartSnapshots.map(s => s.nav || 0);
                  const costBasis = chartFund.cum_nav || 0;
                  // Compute y-axis range with padding
                  const allVals = [...navs, costBasis].filter(v => v > 0);
                  const yMin = allVals.length > 0 ? Math.min(...allVals) : 0;
                  const yMax = allVals.length > 0 ? Math.max(...allVals) : 1;
                  const pad = Math.max((yMax - yMin) * 0.15, 0.02);

                  const option = {
                    animation: true, animationDuration: 600,
                    textStyle: { fontFamily: CJK_FONT },
                    grid: { left: 60, right: 30, top: 20, bottom: 40 },
                    xAxis: {
                      type: 'category', data: dates, boundaryGap: false,
                      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
                      axisTick: { show: false },
                      axisLabel: {
                        color: '#64748b', fontSize: 9,
                        rotate: dates.length > 30 ? 45 : 0,
                        interval: Math.max(Math.floor(dates.length / 12), 0),
                      },
                    },
                    yAxis: {
                      type: 'value', min: Math.max(yMin - pad, 0),
                      max: yMax + pad,
                      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v) => v.toFixed(3) },
                      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)', type: 'dashed' } },
                    },
                    tooltip: {
                      trigger: 'axis',
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      borderColor: 'rgba(59,130,246,0.3)',
                      textStyle: { color: '#e2e8f0', fontSize: 12 },
                      formatter: (params) => {
                        const idx = params[0].dataIndex;
                        const nav = navs[idx];
                        const diff = nav - costBasis;
                        const sign = diff >= 0 ? '+' : '';
                        const pct = costBasis > 0 ? ((nav - costBasis) / costBasis * 100) : 0;
                        const pctSign = pct >= 0 ? '+' : '';
                        return chartSnapshots[idx].date + '<br/>净值: <b>' + nav.toFixed(4) + '</b><br/>较成本: ' + sign + diff.toFixed(4) + ' (' + pctSign + pct.toFixed(2) + '%)';
                      },
                    },
                    series: [{
                      type: 'line', data: navs, smooth: true, symbol: 'none',
                      lineStyle: { width: 2, color: '#3b82f6' },
                      areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                          { offset: 0, color: 'rgba(59,130,246,0.25)' },
                          { offset: 1, color: 'rgba(59,130,246,0.02)' },
                        ]),
                      },
                      itemStyle: { color: '#3b82f6' },
                      markLine: {
                        silent: true,
                        symbol: 'none',
                        lineStyle: { color: '#f59e0b', type: 'dashed', width: 2 },
                        label: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold', formatter: '成本 {c}' },
                        data: [{ yAxis: costBasis, name: '持仓成本' }],
                      },
                    }],
                  };
                  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />;
                })()
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

/* ================================================================
   Tab: Return Analysis (computed from real fund data)
   ================================================================ */
function ReturnAnalysisTab({ funds, yesterdayReturns }) {
  const totalPL = funds.reduce((s, f) => s + (f.pl || 0), 0);
  const totalAmount = funds.reduce((s, f) => s + (f.amount || 0), 1);
  const avgRate = totalAmount > 0 ? (totalPL / totalAmount * 100) : 0;
  const yesterdayTotal = funds.reduce((s, f) => s + (yesterdayReturns[f.id] || 0), 0);

  const stats = [
    { label: '', value: `${yesterdayTotal >= 0 ? '+' : ''}${yesterdayTotal.toFixed(2)}`, sub: '', color: yesterdayTotal >= 0 ? '#22c55e' : '#ef4444' },
    { label: '', value: `${funds.length} `, sub: `${totalAmount.toLocaleString()} `, color: '#e2e8f0' },
    { label: '', value: `${totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}`, sub: `${avgRate >= 0 ? '+' : ''}${avgRate.toFixed(2)}%`, color: totalPL >= 0 ? '#22c55e' : '#ef4444' },
    { label: '', value: `${new Set(funds.map(f => f.type)).size} `, sub: '', color: '#60a5fa' },
  ];

  const barData = [...funds].sort((a, b) => (b.pl || 0) - (a.pl || 0)).slice(0, 8);
  const barOption = useMemo(() => ({
    animation: true, animationDuration: 800,
    textStyle: { fontFamily: CJK_FONT },
    grid: { left: 10, right: 24, top: 8, bottom: 20 },
    xAxis: { type: 'category', data: barData.map(f => f.name.length > 6 ? f.name.slice(0, 6) + '...' : f.name), axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } } },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(59,130,246,0.3)', textStyle: { color: '#e2e8f0', fontSize: 12 }, formatter: (p) => { const f = barData[p[0].dataIndex]; return `${f.name}<br/>: ${(f.pl || 0) >= 0 ? '+' : ''}${(f.pl || 0).toFixed(2)} `; } },
    series: [{
      type: 'bar', data: barData.map(f => f.pl || 0), barWidth: 20,
      itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#8b5cf6' }]) },
    }],
  }), [funds]);

  // Per-fund return breakdown
  const fundReturns = [...funds]
    .map(f => ({ ...f, yReturn: yesterdayReturns[f.id] || 0 }))
    .sort((a, b) => (b.yReturn || 0) - (a.yReturn || 0));

  return (
    <div className="flex flex-col gap-5 min-h-0">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="fund-cat-card" style={{ background: 'rgba(15,23,42,0.8)' }}>
            <div className="text-[11px] text-cyber-gray mb-2">{['昨日收益', '基金数量', '累计盈亏', '基金种类'][i]}</div>
            <div className="text-[20px] font-bold font-mono text-glow" style={{ color: s.color }}>{s.value}</div>
            {s.sub && <div className="text-[11px] text-cyber-gray mt-1">{s.sub}</div>}
          </div>
        ))}
      </div>
      <div className="flex-1 fund-card" style={{ minHeight: 200 }}>
        <div className="fund-card-title"><span className="title-text"></span></div>
        <div className="flex-1 min-h-0">
          <ReactECharts option={barOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
        </div>
      </div>
      {/* Yesterday return per fund */}
      <div className="fund-card">
        <div className="fund-card-title"><span className="title-text">昨日收益明细</span></div>
        <div className="flex-1 min-h-0 overflow-auto" style={{ maxHeight: 260 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ padding: '6px 10px', fontSize: 11, color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>基金名称</th>
              <th style={{ padding: '6px 10px', fontSize: 11, color: '#94a3b8', textAlign: 'right', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>持仓金额</th>
              <th style={{ padding: '6px 10px', fontSize: 11, color: '#94a3b8', textAlign: 'right', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>累计盈亏</th>
              <th style={{ padding: '6px 10px', fontSize: 11, color: '#94a3b8', textAlign: 'right', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>昨日收益</th>
            </tr></thead>
            <tbody>
              {fundReturns.map((f, i) => (
                <tr key={f.id} className="hover:bg-white/[0.03] transition-colors">
                  <td style={{ padding: '7px 10px', fontSize: 12, color: '#e2e8f0', borderBottom: '1px solid rgba(59,130,246,0.08)' }}><span className="text-[10px] text-cyber-gray mr-2">{i + 1}</span>{f.name.length > 10 ? f.name.slice(0, 9) + '...' : f.name}</td>
                  <td style={{ padding: '7px 10px', fontSize: 12, color: '#94a3b8', textAlign: 'right', borderBottom: '1px solid rgba(59,130,246,0.08)' }} className="font-mono text-[11px]">{(f.amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '7px 10px', fontSize: 12, textAlign: 'right', borderBottom: '1px solid rgba(59,130,246,0.08)' }} className="font-mono"><span style={{ color: (f.pl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{(f.pl || 0) >= 0 ? '+' : ''}{(f.pl || 0).toFixed(2)}</span></td>
                  <td style={{ padding: '7px 10px', fontSize: 12, textAlign: 'right', borderBottom: '1px solid rgba(59,130,246,0.08)' }} className="font-mono"><span style={{ color: (f.yReturn || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{(f.yReturn || 0) >= 0 ? '+' : ''}{(f.yReturn || 0).toFixed(2)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Export CSV
   ================================================================ */
function exportToCSV(funds) {
  const rows = [['基金代码', '基金名称', '类型', '持仓份额', '单位净值', '累计净值', '持仓金额', '盈亏', '收益率'], ...funds.map(f => [f.code, f.name, f.type, f.shares, f.nav, f.cum_nav, f.amount, f.pl, (f.rate || 0) + '%'])];
  const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'fund_data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ================================================================
   Add Fund Modal — saves to backend API
   ================================================================ */


function AddFundModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ code: "", name: "", type: "", shares: "", cost: "1.0000" });
  const [saving, setSaving] = useState(false);
  const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: 6, fontSize: 13, background: "rgba(30,41,59,0.8)", border: "1px solid rgba(59,130,246,0.3)", color: "#e2e8f0", outline: "none" };

  const handleCodeChange = async (value) => {

    setForm(prev => ({ ...prev, code: value }));

    if (value.length >= 6) {

      try {

        const info = await resolveFund(value);

        if (info && info.name) {

          setForm(prev => ({ ...prev, name: info.name, type: info.type }));

        }

      } catch (_) {}

    }

  };


  const shares = parseFloat(form.shares) || 0;
  const cost = parseFloat(form.cost) || 0;
  const computedAmount = (shares * cost).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type.trim()) return;
    setSaving(true);
    try {
      const result = await addFund({
        name: form.name, code: form.code, type: form.type,
        shares, nav: cost, cumNav: cost, amount: parseFloat(computedAmount),
        pl: 0, rate: 0,
      });
      // Auto-refresh NAV from East Money after adding
      try { await refreshNav(result.id); } catch (_) {}
      onSaved();
      onClose();
    } catch (err) { alert("保存失败: " + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 420, padding: 28, borderRadius: 12, background: "rgba(15,23,42,0.98)", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 0 24px rgba(59,130,246,0.2)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-white">添加基金</h3>
          <button onClick={onClose} className="text-cyber-gray hover:text-white transition-colors"><FontAwesomeIcon icon={faTimes} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div style={{ width: 140 }}>
              <label className="block text-[11px] text-cyber-gray mb-1.5">基金代码</label>
              <input style={inputStyle} value={form.code} onChange={e => handleCodeChange(e.target.value)} placeholder="000001" />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-cyber-gray mb-1.5">基金名称</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="输入代码自动识别或手动填写" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-cyber-gray mb-1.5">基金类型 {form.code && form.name && <span className="text-green-400 text-[10px]">（已自动识别）</span>}</label>
            <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="">请选择类型</option>
                <option value="股票型基金">股票型基金</option>
                <option value="混合基金">混合基金</option>
                <option value="债券型基金">债券型基金</option>
                <option value="货币型基金">货币型基金</option>
                <option value="QDII基金">QDII基金</option>
              </select>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[11px] text-cyber-gray mb-1.5">持仓份额 *</label>
              <input style={inputStyle} type="number" step="any" min="0" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} placeholder="例: 12000" />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-cyber-gray mb-1.5">单份成本 (元)</label>
              <input style={inputStyle} type="number" step="any" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="1.5234" />
            </div>
          </div>
          {(shares > 0 || cost > 0) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <span className="text-[11px] text-cyber-gray">持仓金额:</span>
              <span className="text-[13px] font-mono font-semibold text-white text-glow">{computedAmount} 元</span>
            </div>
          )}
          <button type="submit" disabled={saving || !form.name.trim() || !form.type.trim() || shares <= 0} className="mt-2 py-2.5 rounded-lg text-[13px] font-semibold text-white hover-scale" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", cursor: (saving || !form.name.trim() || !form.type.trim() || shares <= 0) ? "not-allowed" : "pointer", opacity: (saving || !form.name.trim() || !form.type.trim() || shares <= 0) ? 0.6 : 1 }}>{saving ? "保存中..." : "确认添加"}</button>
        </form>
      </div>
    </div>
  );
}
/* ================================================================
   Main page
   ================================================================ */
export default function FundManagement() {
  useTitle('基金管理');
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState('charts');
  const [showModal, setShowModal] = useState(false);
  const [funds, setFunds] = useState([]);
  const [fundRadar, setFundRadar] = useState(null);
  const [loadingFunds, setLoadingFunds] = useState(true);
  const [loadingRadar, setLoadingRadar] = useState(true);
  const [selectedType, setSelectedType] = useState(null); // null = show all

  const [yesterdayReturns, setYesterdayReturns] = useState({});
  const loadFunds = useCallback(async () => {
    try {
      const data = await fetchFunds();
      const fundList = data.funds || [];
      setFunds(fundList);
      if (fundList.length > 0) {
        try { await refreshNav(); } catch (_) {}
        const fresh = await fetchFunds();
        setFunds(fresh.funds || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingFunds(false); }
  }, []);

  const loadFundRadar = useCallback(async () => {
    setLoadingRadar(true);
    try {
      const data = await fetchFundRadar(360);
      setFundRadar(data);
    } catch (e) {
      console.error(e);
      setFundRadar(null);
    } finally {
      setLoadingRadar(false);
    }
  }, []);

  const loadYesterdayReturns = useCallback(async () => {
    try {
      const data = await fetchYesterdayReturn();
      const map = {};
      for (const r of data.returns || []) map[r.fundId] = r.yesterdayReturn;
      setYesterdayReturns(map);
    } catch (e) { console.error(e); }
  }, []);

  const reloadAll = useCallback(async () => {
    const data = await fetchFunds();
    const fundList = data.funds || [];
    setFunds(fundList);
    await loadFundRadar();
  }, [loadFundRadar]);

  useEffect(() => { loadFunds(); loadYesterdayReturns(); loadFundRadar(); }, [loadFunds, loadYesterdayReturns, loadFundRadar]);



  const handleDelete = async (id) => { await deleteFund(id); loadFunds(); };

  // Auto-refresh NAV from East Money API for all funds
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const data = await refreshNav();
      reloadAll();
    } catch (e) {
      alert('刷新失败: ' + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const categories = buildCategories(funds);
  const typeFilteredFunds = selectedType ? funds.filter(f => (f.type || '') === selectedType) : funds;
  const typeFilteredRadar = filterRadarByFunds(fundRadar, typeFilteredFunds);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        icon={faSackDollar}
        title="个人基金管理"
        tag="FUND MANAGEMENT"
        color="fund"
        rightContent={
          <div className="flex items-center gap-4">
            <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-blue-300 border border-blue-500/30 hover:bg-blue-500/15 hover-scale transition-all">
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" /><span>添加基金</span>
            </button>
            <button onClick={handleRefreshAll} disabled={funds.length === 0 || refreshing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-green-300 border border-green-500/30 hover:bg-green-500/15 hover-scale transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <FontAwesomeIcon icon={faChartLine} className="text-[10px]" spin={refreshing} /><span>{refreshing ? '刷新中...' : '刷新净值'}</span>
            </button>
            <button onClick={() => exportToCSV(funds)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-cyber-gray border border-white/10 hover:bg-white/5 hover-scale transition-all">
              <FontAwesomeIcon icon={faFileExport} className="text-[10px]" /><span>导出数据</span>
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-5 flex flex-col" style={{ background: 'linear-gradient(135deg, #070b14 0%, #0f172a 100%)' }}>
        <FundRadarSummary radar={typeFilteredRadar} loading={loadingRadar} />

        {/* Category cards — built from real fund data */}
        <div className="grid grid-cols-5 gap-5 mb-5 fund-cat-grid">
          {categories.length > 0 ? categories.map((data, i) => (
            <div key={data.id} className="fund-slide-up" style={{ animationDelay: `${0.05 + i * 0.08}s` }}>
              <CategoryCard data={data} selected={selected} onClick={(id) => { if (selected === id) { setSelected(-1); setSelectedType(null); } else { setSelected(id); setSelectedType(data.type); }; setTab('strong'); }} />
            </div>
          )) : (
            <div className="col-span-5 flex items-center justify-center py-8 text-cyber-gray text-[13px]">
              暂无基金数据，点击右上角"添加基金"录入第一笔
            </div>
          )}
        </div>

        <TabBar active={tab} onChange={setTab} />

        <div className="flex-1 min-h-0">
          {tab === 'charts'     && <ChartsTab funds={typeFilteredFunds} />}
          {tab === 'strong'     && (
          <div className="flex flex-col gap-5">
            <Top10Recommend />
            <div>
              <div className="text-[12px] text-slate-400 mb-3">全市场强势基金扫描</div>
              <MarketFundScanner />
            </div>
            <div>
              <div className="text-[12px] text-slate-400 mb-3">自选基金趋势雷达</div>
              <StrengthRadarTab radar={typeFilteredRadar} loading={loadingRadar} />
            </div>
          </div>
        )}
          {tab === 'detail'     && <DetailTab funds={typeFilteredFunds} onDelete={handleDelete} loading={loadingFunds} yesterdayReturns={yesterdayReturns} />}
          {tab === 'return'     && <ReturnAnalysisTab funds={typeFilteredFunds} yesterdayReturns={yesterdayReturns} />}
        </div>
      </div>

      {showModal && <AddFundModal onClose={() => setShowModal(false)} onSaved={() => { reloadAll(); }} />}
    </div>
  );
}
