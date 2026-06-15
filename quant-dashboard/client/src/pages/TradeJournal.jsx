import { useTitle } from '../hooks/useTitle';
import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faPlus, faTrash, faEdit, faSave, faTimes, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import usePortfolioData from '../hooks/usePortfolioData';
import { fetchJournal, addJournalEntry, updateJournalEntry, deleteJournalEntry } from '../services/api';

const DIRECTION_MAP = { buy: '买入', sell: '卖出' };
const DIRECTION_COLORS = { buy: '#ef4444', sell: '#22c55e' };

export default function TradeJournal() {
  useTitle('交易日志');
  const { positions } = usePortfolioData();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterCode, setFilterCode] = useState('all');
  const [filterDir, setFilterDir] = useState('all');

  const [form, setForm] = useState({
    stockCode: '', stockName: '', direction: 'buy', price: '', quantity: '',
    tradeDate: new Date().toISOString().slice(0, 10), reason: '', review: '',
  });

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchJournal(200); setEntries(data.entries || []); }
    catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const resetForm = () => {
    setForm({ stockCode: '', stockName: '', direction: 'buy', price: '', quantity: '',
      tradeDate: new Date().toISOString().slice(0, 10), reason: '', review: '' });
    setEditingId(null); setShowForm(false);
  };

  const handleStockSelect = (code) => {
    const pos = positions.find(p => p.code === code);
    setForm(f => ({ ...f, stockCode: code, stockName: pos?.name || '' }));
  };

  const handleSubmit = async () => {
    if (!form.stockCode || !form.price || !form.quantity) return;
    try {
      if (editingId) {
        await updateJournalEntry(editingId, {
          stock_code: form.stockCode, stock_name: form.stockName,
          direction: form.direction, price: parseFloat(form.price),
          quantity: parseInt(form.quantity), trade_date: form.tradeDate,
          reason: form.reason, review: form.review,
        });
      } else {
        await addJournalEntry({
          stockCode: form.stockCode, stockName: form.stockName || form.stockCode,
          direction: form.direction, price: parseFloat(form.price),
          quantity: parseInt(form.quantity), tradeDate: form.tradeDate,
          reason: form.reason, review: form.review,
        });
      }
      resetForm(); loadEntries();
    } catch (e) { alert('保存失败: ' + e.message); }
  };

  const handleEdit = (entry) => {
    setForm({
      stockCode: entry.stock_code, stockName: entry.stock_name,
      direction: entry.direction, price: String(entry.price),
      quantity: String(entry.quantity), tradeDate: entry.trade_date,
      reason: entry.reason || '', review: entry.review || '',
    });
    setEditingId(entry.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除这条记录?')) return;
    try { await deleteJournalEntry(id); loadEntries(); }
    catch (e) { alert('删除失败: ' + e.message); }
  };

  const filtered = entries.filter(e => {
    if (filterCode !== 'all' && e.stock_code !== filterCode) return false;
    if (filterDir !== 'all' && e.direction !== filterDir) return false;
    return true;
  });

  const stats = { total: filtered.length, buy: filtered.filter(e => e.direction === 'buy').length, sell: filtered.filter(e => e.direction === 'sell').length };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: 'linear-gradient(180deg, #070b12 0%, #0f172a 100%)' }}>
      <header className="relative flex h-[60px] shrink-0 items-center justify-between overflow-hidden border-b px-6"
        style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
        <div className="relative z-10 flex items-center gap-4">
          <FontAwesomeIcon icon={faBook} className="text-sm" style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }} />
          <h1 className="text-xl font-bold tracking-widest text-white" style={{ textShadow: '0 0 14px rgba(59,130,246,0.4)' }}>{'交易日志'}</h1>
          <span className="text-[10px] text-slate-500">{stats.total}{'条记录'}</span>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <select value={filterCode} onChange={e => setFilterCode(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
            <option value="all">{'全部股票'}</option>
            {positions.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          <select value={filterDir} onChange={e => setFilterDir(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
            <option value="all">{'全部方向'}</option>
            <option value="buy">{'买入'}</option>
            <option value="sell">{'卖出'}</option>
          </select>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center gap-1">
            <FontAwesomeIcon icon={faPlus} /> {'新增'}
          </button>
        </div>
      </header>

      {showForm && (
        <div className="shrink-0 mx-4 mt-3 p-4 rounded-lg border" style={{ background: 'rgba(15,23,42,0.95)', borderColor: 'rgba(59,130,246,0.3)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">{editingId ? '编辑记录' : '新增交易记录'}</span>
            <button onClick={resetForm} className="text-slate-400 hover:text-white"><FontAwesomeIcon icon={faTimes} /></button>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr' }}>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">{'股票'}</label>
              <select value={form.stockCode} onChange={e => handleStockSelect(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white">
                <option value="">-- {'选择'} --</option>
                {positions.map(p => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">{'方向'}</label>
              <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white">
                <option value="buy">{'买入'}</option>
                <option value="sell">{'卖出'}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">{'价格'}</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white" placeholder={'成交价'} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">{'数量(股)'}</label>
              <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white" placeholder={'股数'} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">{'日期'}</label>
              <input type="date" value={form.tradeDate} onChange={e => setForm(f => ({ ...f, tradeDate: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white" />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label className="text-[10px] text-slate-400 block mb-1">{'交易理由'}</label>
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white" placeholder={'为什么买/卖? (技术面/基本面/消息面)'} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="text-[10px] text-slate-400 block mb-1">{'事后回顾'}</label>
              <input value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white" placeholder={'复盘总结 (可选)'} />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={handleSubmit}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center gap-1">
              <FontAwesomeIcon icon={faSave} /> {'保存'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center text-slate-500 py-10">{'加载中...'}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-10">{'暂无交易记录，点击右上角“新增”开始记录'}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                style={{ background: 'rgba(15,23,42,0.6)' }}>
                <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                  style={{ background: entry.direction === 'buy' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }}>
                  <FontAwesomeIcon icon={entry.direction === 'buy' ? faArrowUp : faArrowDown}
                    style={{ color: DIRECTION_COLORS[entry.direction], fontSize: 12 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{entry.stock_name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{entry.stock_code}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${entry.direction === 'buy' ? 'text-red-400 bg-red-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                      {DIRECTION_MAP[entry.direction]}
                    </span>
                    <span className="text-xs font-mono text-white ml-auto">{entry.price.toFixed(2)} x {entry.quantity}{'股'} = {(entry.price * entry.quantity).toLocaleString()}</span>
                  </div>
                  {entry.reason && <div className="text-[11px] text-slate-400 mt-1">{'理由'}: {entry.reason}</div>}
                  {entry.review && <div className="text-[11px] text-amber-400/80 mt-0.5">{'复盘'}: {entry.review}</div>}
                  <div className="text-[10px] text-slate-600 mt-1">{entry.trade_date}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(entry)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors" title={'编辑'}>
                    <FontAwesomeIcon icon={faEdit} className="text-[11px]" />
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors" title={'删除'}>
                    <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
