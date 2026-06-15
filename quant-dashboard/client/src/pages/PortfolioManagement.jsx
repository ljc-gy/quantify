import { useTitle } from '../hooks/useTitle';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBriefcase, faSortUp, faSortDown, faTimes, faArrowUp, faArrowDown, faFilter, faChartLine, faExclamationTriangle, faUpload, faCog, faTrash, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';

import { getMockPositions, SummaryCards } from '../components/portfolio/SummaryCards';
import { ToolBar } from '../components/portfolio/ToolBar';
import { ModalShell, SellModal, AddPositionModal, StopLossModal, ManualAddModal } from '../components/portfolio/Modals';
import DataSettings from '../components/DataSettings';
import { fetchHoldings, deleteHolding, saveHolding } from '../services/api';

function normalizeHolding(h) {
  return {
    id: h.id,
    code: h.stock_code,
    name: h.stock_name,
    quantity: h.quantity,
    costPrice: h.cost_price,
    curPrice: h.cur_price,
    marketVal: h.market_val,
    pnl: h.profit_loss,
    pnlPct: h.pct_change,
    weight: 0,
    sector: '',
  };
}

const HEADERS = [
  { key: 'code', label: '代码', sortable: false, w: 80 },
  { key: 'name', label: '名称', sortable: false, w: 100 },
  { key: 'quantity', label: '持仓', sortable: true, w: 70 },
  { key: 'costPrice', label: '成本', sortable: true, w: 80 },
  { key: 'curPrice', label: '现价', sortable: true, w: 80 },
  { key: 'marketVal', label: '市值', sortable: true, w: 100 },
  { key: 'pnl', label: '盈亏', sortable: true, w: 90 },
  { key: 'pnlPct', label: '盈亏%', sortable: true, w: 75 },
  { key: 'weight', label: '占比', sortable: true, w: 65 },
  { key: 'sector', label: '行业', sortable: false, w: 70 },
];

export default function PortfolioManagement() {
  useTitle('持仓明细');
  const [apiPositions, setApiPositions] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const prevApiRef = useRef(null);
  const [realPrices, setRealPrices] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('all');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [modal, setModal] = useState(null);

  const loadData = useCallback(async () => {
    setApiLoading(true);
    try {
      const data = await fetchHoldings();
      const normalized = (data.holdings || []).map(normalizeHolding);
      const total = normalized.reduce((s, p) => s + p.marketVal, 0);
      normalized.forEach(p => { p.weight = total > 0 ? (p.marketVal / total) * 100 : 0; });
      prevApiRef.current = normalized;
      setApiPositions(normalized);
    } catch {
      if (prevApiRef.current && prevApiRef.current.length > 0) {
        setApiPositions(prevApiRef.current);
      } else {
        setApiPositions(null);
      }
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const positions = useMemo(() => {
    const base = (apiPositions && apiPositions.length > 0) ? apiPositions : [];
    // Merge real-time prices
    return base.map(p => {
      const real = realPrices[p.code];
      if (real) {
        const curPrice = real.price || p.curPrice;
        const marketVal = p.quantity * curPrice;
        const pnl = marketVal - p.quantity * p.costPrice;
        const pnlPct = p.costPrice > 0 ? ((curPrice - p.costPrice) / p.costPrice) * 100 : 0;
        return { ...p, curPrice, marketVal, pnl, pnlPct };
      }
      return p;
    });
  }, [apiPositions, realPrices]);
  // Real-time price polling (every 10s)
  useEffect(() => {
    const codes = positions.map(p => p.code).filter(Boolean);
    if (codes.length === 0) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await (await fetch('/api/market/quotes', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ codes }),
        })).json();
        if (active && res.code === 0) {
          setRealPrices(prev => {
            const next = { ...prev };
            (res.data || []).forEach(q => {
              if (q.price && q.price > 0) next[q.code] = q;
            });
            return next;
          });
        }
      } catch (_) {}
    };
    poll();
    const timer = setInterval(poll, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [positions.map(p => p.code).join(',')]);

  const sectors = useMemo(() => {
    const set = new Set(positions.map(p => p.sector));
    return ['all', ...Array.from(set)];
  }, [positions]);

  const sorted = useMemo(() => {
    let list = positions.filter(p => {
      if (search && !p.name.includes(search) && !p.code.includes(search)) return false;
      if (sector !== 'all' && p.sector !== sector) return false;
      return true;
    });
    if (sortKey) {
      list.sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        return sortDir === 'asc' ? va - vb : vb - va;
      });
    }
    return list;
  }, [positions, search, sector, sortKey, sortDir]);

  const handleSort = useCallback((key) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const isTrading = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return false;
    const h = now.getHours();
    const m = now.getMinutes();
    const t = h * 60 + m;
    return (t >= 570 && t <= 690) || (t >= 780 && t <= 900); // 9:30-11:30, 13:00-15:00
  }, []);

  const handleDelete = async (p) => {
    if (!window.confirm('Delete ' + p.name + ' (' + p.code + ')?')) return;
    try {
      await deleteHolding(p.id);
      loadData();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  // \u52a0\u4ed3: saveHolding with merged quantity
  const handleAddPosition = async (position, shares, amount) => {
    try {
      const newQty = (position.quantity || 0) + shares;
      const newCost = ((position.quantity * position.costPrice) + amount) / newQty;
      await saveHolding({
        id: position.id,
        stockCode: position.code,
        stockName: position.name,
        quantity: newQty,
        costPrice: newCost,
      });
      closeModal();
      loadData();
    } catch (e) {
      alert('\u5220\u9664\u5931\u8d25: ' + e.message);
    }
  };

  // \u52a0\u4ed3: saveHolding with reduced quantity
  const handleSellPosition = async (position, shares) => {
    try {
      const newQty = (position.quantity || 0) - shares;
      if (newQty <= 0) {
        await deleteHolding(position.id);
      } else {
        await saveHolding({
          id: position.id,
          stockCode: position.code,
          stockName: position.name,
          quantity: newQty,
          costPrice: position.costPrice,
        });
      }
      closeModal();
      loadData();
    } catch (e) {
      alert('\u5220\u9664\u5931\u8d25: ' + e.message);
    }
  };

  // ????
  const handleManualAdd = async (data) => {
    try {
      await saveHolding({
        stockCode: data.code,
        stockName: data.name,
        quantity: data.shares,
        costPrice: data.costPrice,
        curPrice: data.curPrice || data.costPrice,
        marketVal: data.shares * (data.curPrice || data.costPrice),
      });
      closeModal();
      loadData();
    } catch (e) {
      alert('\u6dfb\u52a0\u5931\u8d25: ' + e.message);
    }
  };

  const closeModal = () => setModal(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
      <header className="relative flex h-[60px] shrink-0 items-center justify-between overflow-hidden border-b px-6"
        style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 via-purple-400/40 to-transparent" />
        <div className="relative z-10 flex items-center gap-4">
          <FontAwesomeIcon icon={faBriefcase} className="text-sm" style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }} />
          <h1 className="text-xl font-bold tracking-widest text-white" style={{ textShadow: '0 0 14px rgba(59,130,246,0.4), 0 0 28px rgba(139,92,246,0.2)' }}>持仓明细</h1>
          <div className="h-5 w-px bg-gradient-to-b from-transparent via-blue-400/60 to-transparent" />
          <span className="text-xs font-medium tracking-[0.2em] text-cyber-gray">HOLDINGS</span>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4,
            background: apiPositions ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
            border: apiPositions ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(245,158,11,0.2)',
            color: apiPositions ? '#22c55e' : '#f59e0b' }}>
            {apiLoading ? '...' : apiPositions ? 'Live' : 'Mock'}
          </span>
          <button onClick={() => setShowSettings(true)}
            style={{ padding: '5px 10px', borderRadius: 4, fontSize: 10, fontWeight: 500, color: '#94a3b8',
              border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4 }}>
            <FontAwesomeIcon icon={faCog} />设置
          </button>
          <button onClick={() => setModal({ type: 'manualAdd' })}
            style={{ padding: '5px 10px', borderRadius: 4, fontSize: 10, fontWeight: 500, color: '#c4b5fd',
              border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.1)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4 }}>
            <FontAwesomeIcon icon={faUpload} />添加</button>
          <span className="text-[10px] text-cyber-gray">????: 15:30:00</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-5">
        <SummaryCards positions={positions} />
        <ToolBar search={search} onSearchChange={setSearch} sector={sector} sectors={sectors} onSectorChange={setSector} />

        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                {HEADERS.map(h => (
                  <th key={h.key} className="py-2 px-3 text-[11px] font-semibold text-cyber-gray sticky top-0"
                    style={{ width: h.w, background: 'rgba(7,11,20,0.95)', cursor: h.sortable ? 'pointer' : 'default' }}
                    onClick={() => h.sortable && handleSort(h.key)}>
                    {h.label}
                    {h.sortable && sortKey === h.key && (
                      <FontAwesomeIcon icon={sortDir === 'asc' ? faSortUp : faSortDown} className="ml-1 text-[10px]" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={HEADERS.length} className="py-10 text-center text-[13px] text-cyber-gray">暂无匹配的持仓记录</td></tr>
              ) : (
                sorted.map(p => (
                  <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                    <td className="py-2 px-3 text-[12px] font-mono text-cyber-gray">{p.code}</td>
                    <td className="py-2 px-3 text-[13px] text-white">{p.name}</td>
                    <td className="py-2 px-3 text-[12px] font-mono text-white">{p.quantity.toLocaleString()}</td>
                    <td className="py-2 px-3 text-[12px] font-mono text-cyber-gray">{p.costPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono text-white">{p.curPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-[12px] font-mono text-white">{(p.marketVal / 10000).toFixed(2)}w</td>
                    <td className={`py-2 px-3 text-[12px] font-mono ${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.pnl >= 0 ? '+' : ''}{p.pnl.toLocaleString()}
                    </td>
                    <td className={`py-2 px-3 text-[12px] font-mono ${p.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.pnlPct >= 0 ? '+' : ''}{p.pnlPct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-[12px] font-mono text-white">{p.weight.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-[12px] text-cyber-gray">{p.sector}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); if (isTrading) setModal({ type: 'add', position: p }); }}
                          title={isTrading ? '加仓' : '非交易时间段'}
                          style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11,
                            color: isTrading ? '#22c55e' : '#334155',
                            border: isTrading ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(51,65,85,0.2)',
                            background: isTrading ? 'rgba(34,197,94,0.08)' : 'rgba(51,65,85,0.05)',
                            cursor: isTrading ? 'pointer' : 'not-allowed',
                            opacity: isTrading ? 1 : 0.4 }}>
                          <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); if (isTrading) setModal({ type: 'sell', position: p }); }}
                          title={isTrading ? '减仓' : '非交易时间段'}
                          style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11,
                            color: isTrading ? '#f59e0b' : '#334155',
                            border: isTrading ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(51,65,85,0.2)',
                            background: isTrading ? 'rgba(245,158,11,0.08)' : 'rgba(51,65,85,0.05)',
                            cursor: isTrading ? 'pointer' : 'not-allowed',
                            opacity: isTrading ? 1 : 0.4 }}>
                          <FontAwesomeIcon icon={faMinus} className="text-[9px]" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                          title="\u5220\u9664"
                          style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11,
                            color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.2)',
                            background: 'rgba(239,68,68,0.08)',
                            cursor: 'pointer' }}>
                          <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.type === 'sell' && <SellModal position={modal.position} onClose={closeModal} onConfirm={(shares) => handleSellPosition(modal.position, shares)} />}
      {modal?.type === 'add' && <AddPositionModal position={modal.position} onClose={closeModal} onConfirm={(shares, amount) => handleAddPosition(modal.position, shares, amount)} />}
      {modal?.type === 'stoploss' && <StopLossModal position={modal.position} onClose={closeModal} onConfirm={closeModal} />}
      {modal?.type === 'manualAdd' && <ManualAddModal onClose={closeModal} onConfirm={handleManualAdd} />}
      {showSettings && <DataSettings onClose={() => setShowSettings(false)} onSaved={loadData} />}
    </div>
  );
}
