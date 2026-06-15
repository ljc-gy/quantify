import { useTitle } from '../hooks/useTitle';
import { useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faChartLine, faCircle } from '@fortawesome/free-solid-svg-icons';
import usePortfolioData from '../hooks/usePortfolioData';

function CardTitle({ title, right }) {
  return (
    <div className="quant-card-title">
      <span className="title-text">{title}</span>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

/* Performance comparison -- bar chart from real positions */
function PerformanceCard({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => (b.pnlPct||0) - (a.pnlPct||0));
    return {
      grid: { left: 16, right: 16, top: 32, bottom: 16 },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [{
        type: 'bar', data: sorted.map(p => parseFloat((p.pnlPct||0).toFixed(2))), barWidth: '55%',
        itemStyle: {
          borderRadius: [4,4,0,0],
          color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#06b6d4'},{offset:1,color:'#22d3ee'}])
        },
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 10, formatter: '{c}%' },
      }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(13,21,40,0.95)', borderColor: '#06b6d4',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [positions]);

  return (
    <div className="quant-card">
      <CardTitle title="收益对比 (持仓个股)" />
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
      </div>
    </div>
  );
}

/* Market value distribution -- bar chart */
function MarketValueCard({ positions }) {
  const option = useMemo(() => {
    if (!positions.length) return {};
    const sorted = [...positions].sort((a,b) => b.marketVal - a.marketVal);
    return {
      grid: { left: 16, right: 16, top: 32, bottom: 16 },
      xAxis: { type: 'category', data: sorted.map(p => p.name.length > 4 ? p.name.slice(0,4)+'..' : p.name),
        axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: v => (v/10000).toFixed(0)+'w' },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [{
        type: 'bar', data: sorted.map(p => p.marketVal), barWidth: '55%',
        itemStyle: { borderRadius: [0,4,4,0],
          color: (p) => {
            const colors = ['#3b82f6','#8b5cf6','#06b6d4','#22c55e','#f59e0b','#ec4899'];
            return colors[p.dataIndex % colors.length];
          }
        },
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10,
          formatter: p => (p.value/10000).toFixed(1)+'w' },
      }],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(13,21,40,0.95)', borderColor: '#06b6d4',
        textStyle: { color: '#e2e8f0', fontSize: 11 } },
    };
  }, [positions]);

  return (
    <div className="quant-card">
      <CardTitle title="权重分布 (市值)" />
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} notMerge lazyUpdate />
      </div>
    </div>
  );
}

/* Position detail table */
function PositionTableCard({ positions }) {
  return (
    <div className="quant-card">
      <CardTitle title="持仓分析" right={<span className="text-[10px] text-cyber-gray">{positions.length}只股票</span>} />
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead><tr className="border-b border-white/5">
            {['代码','名称','数量','成本','现价','盈亏%','市值'].map(h => (
              <th key={h} className="py-1.5 px-2 text-[10px] text-cyber-gray">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {positions.map(p => (
              <tr key={p.code} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                <td className="py-1.5 px-2 text-[11px] font-mono text-cyber-gray">{p.code}</td>
                <td className="py-1.5 px-2 text-[12px] text-white">{p.name}</td>
                <td className="py-1.5 px-2 text-[11px] font-mono text-white">{p.quantity.toLocaleString()}</td>
                <td className="py-1.5 px-2 text-[11px] font-mono text-cyber-gray">{p.costPrice.toFixed(2)}</td>
                <td className="py-1.5 px-2 text-[11px] font-mono text-white">{p.curPrice.toFixed(2)}</td>
                <td className={`py-1.5 px-2 text-[11px] font-mono ${(p.pnlPct||0)>=0?'text-emerald-400':'text-red-400'}`}>
                  {(p.pnlPct||0)>=0?'+':''}{(p.pnlPct||0).toFixed(2)}%
                </td>
                <td className="py-1.5 px-2 text-[11px] font-mono text-white">{(p.marketVal/10000).toFixed(1)}w</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyQuantCard({ title, message }) {
  return (
    <div className="quant-card flex items-center justify-center">
      <div className="text-center">
        <span className="text-[13px] text-cyber-gray">{message || '暂无持仓数据'}</span>
      </div>
    </div>
  );
}

/* ================================================================
   Main Page
   ================================================================ */

export default function QuantAnalysis() {
  useTitle('量化分析');
  const { positions, loading, totalMarketVal, totalPnl, dayPnlPct } = usePortfolioData();

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        icon={faMicrochip}
        title="量化分析"
        tag="QUANT ANALYSIS"
        color="cyan"
        rightContent={
          <div className="flex items-center gap-3">
            <span className={`text-[10px] ${positions.length > 0 ? 'text-green-400' : 'text-cyber-gray'}`}>
              {loading ? '加载中...' : positions.length > 0 ? `${positions.length}只持仓 | 真实数据` : '无持仓数据'}
            </span>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-5" style={{ background: 'linear-gradient(135deg, #070b14 0%, #0f172a 100%)' }}>
        {positions.length > 0 ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', gridAutoRows: '320px' }}>
            <PerformanceCard positions={positions} />
            <MarketValueCard positions={positions} />
            <div className="col-span-2">
              <PositionTableCard positions={positions} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FontAwesomeIcon icon={faChartLine} className="text-4xl text-cyber-gray/30 mb-4" />
              <p className="text-cyber-gray text-[14px]">暂无持仓数据，无法生成量化分析</p>
              <p className="text-cyber-gray/50 text-[12px] mt-2">请先前往"持仓明细"页面添加股票持仓</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
