import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBriefcase, faChartLine,
  faCoins, faBalanceScale,
} from '@fortawesome/free-solid-svg-icons';

export function getMockPositions() {
  return [
    { id: 1, code: '600519', name: '贵州茅台', quantity: 2000, costPrice: 1620.00, curPrice: 1685.00, marketVal: 3370000, pnl: 130000, pnlPct: 4.01, weight: 25.6, sector: '消费' },
    { id: 2, code: '300750', name: '宁德时代', quantity: 5000, costPrice: 195.30, curPrice: 208.50, marketVal: 1042500, pnl: 66000, pnlPct: 6.76, weight: 7.9, sector: '新能源' },
    { id: 3, code: '002594', name: '比亚迪', quantity: 3000, costPrice: 252.10, curPrice: 245.80, marketVal: 737400, pnl: -18900, pnlPct: -2.50, weight: 5.6, sector: '新能源' },
    { id: 4, code: '688981', name: '中芯国际', quantity: 6000, costPrice: 51.20, curPrice: 55.80, marketVal: 334800, pnl: 27600, pnlPct: 9.01, weight: 2.5, sector: '科技' },
    { id: 5, code: '603259', name: '药明康德', quantity: 3500, costPrice: 65.80, curPrice: 68.30, marketVal: 239050, pnl: 8750, pnlPct: 3.80, weight: 1.8, sector: '医药' },
    { id: 6, code: '000858', name: '五粮液', quantity: 4500, costPrice: 148.50, curPrice: 154.20, marketVal: 693900, pnl: 25650, pnlPct: 3.84, weight: 5.3, sector: '消费' },
    { id: 7, code: '601012', name: '隆基绿能', quantity: 10000, costPrice: 21.80, curPrice: 22.15, marketVal: 221500, pnl: 3500, pnlPct: 1.60, weight: 1.7, sector: '新能源' },
    { id: 8, code: '600276', name: '恒瑞医药', quantity: 2800, costPrice: 42.30, curPrice: 44.50, marketVal: 124600, pnl: 6160, pnlPct: 5.20, weight: 0.9, sector: '医药' },
    { id: 9, code: '002415', name: '海康威视', quantity: 3800, costPrice: 30.20, curPrice: 31.80, marketVal: 120840, pnl: 6080, pnlPct: 5.30, weight: 0.9, sector: '科技' },
    { id: 10, code: '600036', name: '招商银行', quantity: 3200, costPrice: 34.60, curPrice: 35.20, marketVal: 112640, pnl: 1920, pnlPct: 1.73, weight: 0.9, sector: '金融' },
    { id: 11, code: '300124', name: '汇川技术', quantity: 2200, costPrice: 58.90, curPrice: 62.40, marketVal: 137280, pnl: 7700, pnlPct: 5.94, weight: 1.0, sector: '科技' },
    { id: 12, code: '601318', name: '中国平安', quantity: 2800, costPrice: 41.50, curPrice: 42.80, marketVal: 119840, pnl: 3640, pnlPct: 3.13, weight: 0.9, sector: '金融' },
  ];
}

const cardDefs = [
  { key: 'marketVal',  label: '总市值',   icon: faChartLine,    color: '#3b82f6', format: (v) => (v / 10000).toFixed(1) + 'w' },
  { key: 'pnl',        label: '总盈亏',   icon: faCoins,        color: '#22c55e', format: (v) => (v >= 0 ? '+' : '') + v.toLocaleString() },
  { key: 'count',      label: '持仓数量', icon: faBriefcase,    color: '#8b5cf6', format: (v) => v + ' 只' },
  { key: 'dayReturn',  label: '日收益率', icon: faBalanceScale, color: '#06b6d4', format: (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%' },
];

export function SummaryCards({ positions }) {
  const stats = useMemo(() => {
    const totalMkv = positions.reduce((s, p) => s + p.marketVal, 0);
    const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
    const dayReturn = totalMkv > 0 ? (totalPnl / (totalMkv - totalPnl)) * 100 : 0;
    return { marketVal: totalMkv, pnl: totalPnl, count: positions.length, dayReturn };
  }, [positions]);

  const getColor = (def, val) => {
    if (def.key === 'pnl' || def.key === 'dayReturn') return val >= 0 ? '#22c55e' : '#ef4444';
    return def.color;
  };

  return (
    <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {cardDefs.map((def) => {
        const val = stats[def.key];
        const clr = getColor(def, val);
        return (
          <div key={def.key} className="gradient-num-card" style={{ background: `linear-gradient(135deg, ${clr}18 0%, ${clr}05 100%)`, borderLeft: `2px solid ${clr}` }}>
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={def.icon} className="text-[12px]" style={{ color: clr }} />
              <span className="text-[11px] text-cyber-gray">{def.label}</span>
            </div>
            <span className="text-[22px] font-bold font-mono tracking-tight" style={{ color: clr, textShadow: `0 0 10px ${clr}44` }}>
              {def.format(val)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
