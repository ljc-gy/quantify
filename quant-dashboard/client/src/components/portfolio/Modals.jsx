import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faExclamationTriangle, faCoins, faShieldHalved,
  faArrowUp, faArrowDown,
} from '@fortawesome/free-solid-svg-icons';

export function ModalShell({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-sm bg-gradient-to-b from-blue-400 to-purple-500" />
            <h2 className="text-[16px] font-bold text-white tracking-wide">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#64748b] hover:text-white hover:bg-white/5 transition-all"
          >
            <FontAwesomeIcon icon={faTimes} className="text-[14px]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SellModal({ position, onClose, onConfirm }) {
  const [shares, setShares] = useState('');
  const estimatedAmount = shares ? (parseFloat(shares) * position.curPrice).toFixed(2) : '0.00';

  return (
    <ModalShell title={'减持 ' + position.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: '代码', value: position.code },
          { label: '现价', value: position.curPrice.toFixed(2) },
          { label: '当前持仓', value: position.quantity.toLocaleString() + ' 股' },
          { label: '市值', value: (position.marketVal / 10000).toFixed(1) + 'w' },
        ].map((row, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="text-[10px] text-[#64748b]">{row.label}</span>
            <span className="text-[13px] font-mono text-white">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mb-3">
        <label className="block text-[11px] text-[#94a3b8] mb-2">减持股数</label>
        <input
          type="number"
          min={1}
          max={position.quantity}
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder={'最大 ' + position.quantity.toLocaleString() + ' 股'}
          className="w-full px-4 py-2.5 rounded-md text-[13px] font-mono text-white placeholder-[#475569] outline-none transition-all duration-200"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.08)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
        />
      </div>

      <div className="flex items-center justify-between py-3 px-4 rounded-md mb-5" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
        <span className="text-[11px] text-[#94a3b8]">估计成交额</span>
        <span className="text-[15px] font-bold font-mono text-red-400">{estimatedAmount} 元</span>
      </div>

      <div className="flex items-start gap-2 mb-5 p-3 rounded-md" style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
        <FontAwesomeIcon icon={faExclamationTriangle} className="text-[12px] mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
        <span className="text-[11px] text-[#94a3b8] leading-relaxed">减持操作将在下个交易日执行，实际成交价格可能与当前价格存在偏差。</span>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2 rounded-md text-[12px] font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-all">取消</button>
        <button
          onClick={() => onConfirm(parseInt(shares) || 0)}
          disabled={!shares || parseInt(shares) <= 0}
          className="px-5 py-2 rounded-md text-[12px] font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 12px rgba(239, 68, 68, 0.3)' }}
        >确认减持</button>
      </div>
    </ModalShell>
  );
}

export function AddPositionModal({ position, onClose, onConfirm }) {
  const [amount, setAmount] = useState('');
  const estShares = amount ? Math.floor(parseFloat(amount) / position.curPrice) : 0;
  const priceLabel = position.curPrice ? position.curPrice.toFixed(2) + ' 元' : '--';

  return (
    <ModalShell title={'加仓 ' + position.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: '代码', value: position.code },
          { label: '当前价', value: priceLabel },
          { label: '当前持仓', value: position.quantity.toLocaleString() + ' 股' },
          { label: '市值', value: (position.marketVal / 10000).toFixed(1) + 'w' },
        ].map((row, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="text-[10px] text-[#64748b]">{row.label}</span>
            <span className="text-[13px] font-mono text-white">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mb-3">
        <label className="block text-[11px] text-[#94a3b8] mb-2">买入金额 (元)</label>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="输入买入金额"
          className="w-full px-4 py-2.5 rounded-md text-[13px] font-mono text-white placeholder-[#475569] outline-none transition-all duration-200"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.08)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)'; }}
        />
      </div>

      {estShares > 0 && (
        <div className="flex items-center justify-between py-3 px-4 rounded-md mb-5" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
          <span className="text-[11px] text-[#94a3b8]">预计买入</span>
          <span className="text-[15px] font-bold font-mono text-emerald-400">{estShares.toLocaleString()} 股 ≈ {parseFloat(amount).toFixed(2)} 元</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2 rounded-md text-[12px] font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-all">取消</button>
        <button
          onClick={() => onConfirm(estShares, parseFloat(amount))}
          disabled={!amount || parseFloat(amount) <= 0}
          className="px-5 py-2 rounded-md text-[12px] font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 12px rgba(34, 197, 94, 0.3)' }}
        >确认加仓</button>
      </div>
    </ModalShell>
  );
}

export function StopLossModal({ position, onClose, onConfirm }) {
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const slPct = stopLoss ? (((parseFloat(stopLoss) - position.curPrice) / position.curPrice) * 100).toFixed(1) : null;
  const tpPct = takeProfit ? (((parseFloat(takeProfit) - position.curPrice) / position.curPrice) * 100).toFixed(1) : null;

  return (
    <ModalShell title={'止盈止损 - ' + position.name} onClose={onClose}>
      <div className="flex items-center gap-3 mb-5 p-3 rounded-md" style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <FontAwesomeIcon icon={faCoins} className="text-[13px]" style={{ color: '#3b82f6' }} />
        <div className="flex items-center gap-6">
          <span className="text-[11px] text-[#94a3b8]">当前价 <span className="text-white font-mono ml-1">{position.curPrice.toFixed(2)}</span></span>
          <span className="text-[11px] text-[#94a3b8]">成本价 <span className="text-white font-mono ml-1">{position.costPrice.toFixed(2)}</span></span>
        </div>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-[11px] text-[#94a3b8] mb-2">
          <FontAwesomeIcon icon={faArrowDown} className="text-[10px]" style={{ color: '#ef4444' }} />
          止损价
          {slPct && <span className={'font-mono ' + (parseFloat(slPct) <= 0 ? 'text-red-400' : 'text-emerald-400')}>({slPct >= 0 ? '+' : ''}{slPct}%)</span>}
        </label>
        <input
          type="number"
          step="0.01"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          placeholder={'建议 ' + (position.costPrice * 0.93).toFixed(2)}
          className="w-full px-4 py-2.5 rounded-md text-[13px] font-mono text-white placeholder-[#475569] outline-none transition-all duration-200"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.06)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'; }}
        />
      </div>

      <div className="mb-5">
        <label className="flex items-center gap-2 text-[11px] text-[#94a3b8] mb-2">
          <FontAwesomeIcon icon={faArrowUp} className="text-[10px]" style={{ color: '#22c55e' }} />
          止盈价
          {tpPct && <span className={'font-mono ' + (parseFloat(tpPct) >= 0 ? 'text-emerald-400' : 'text-red-400')}>({tpPct >= 0 ? '+' : ''}{tpPct}%)</span>}
        </label>
        <input
          type="number"
          step="0.01"
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          placeholder={'建议 ' + (position.curPrice * 1.15).toFixed(2)}
          className="w-full px-4 py-2.5 rounded-md text-[13px] font-mono text-white placeholder-[#475569] outline-none transition-all duration-200"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.06)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.25)'; }}
        />
      </div>

      <div className="flex items-start gap-2 mb-5 p-3 rounded-md" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
        <FontAwesomeIcon icon={faShieldHalved} className="text-[12px] mt-0.5 shrink-0" style={{ color: '#3b82f6' }} />
        <span className="text-[11px] text-[#94a3b8] leading-relaxed">触发价格仅为预警，实际执行可能受市场流动性影响。</span>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2 rounded-md text-[12px] font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-all">取消</button>
        <button
          onClick={onConfirm}
          disabled={!stopLoss && !takeProfit}
          className="px-5 py-2 rounded-md text-[12px] font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)' }}
        >确认设置</button>
      </div>
    </ModalShell>
  );
}


export function ManualAddModal({ onClose, onConfirm }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [shares, setShares] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [curPrice, setCurPrice] = useState('');
  const [querying, setQuerying] = useState(false);

  const marketVal = shares && curPrice ? (parseInt(shares) * parseFloat(curPrice)).toFixed(2) : '0';

  const handleQuery = async () => {
    if (!code) return;
    setQuerying(true);
    try {
      const res = await (await fetch('/api/market/quote/' + code)).json();
      if (res.code === 0 && res.data) {
        setName(res.data.name && res.data.name !== code ? res.data.name : '');
        setCurPrice((res.data.price || 0).toFixed(2));
      }
    } catch (_) {}
    setQuerying(false);
  };

  return (
    <ModalShell title={'\u624b\u52a8\u6dfb\u52a0\u6301\u4ed3'} onClose={onClose}>
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-[11px] text-[#94a3b8] mb-2">{'\u80a1\u7968\u4ee3\u7801'}</label>
          <div className="flex gap-2">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
              placeholder={'\u4f8b: 000001'}
              className="flex-1 px-4 py-2.5 rounded-md text-[13px] font-mono text-white placeholder-[#475569] outline-none"
              style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.3)' }} />
            <button onClick={handleQuery} disabled={querying || !code}
              className="px-3 py-2 rounded-md text-[11px] font-medium text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              {querying ? '...' : '\u67e5\u8be2'}
            </button>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] text-[#94a3b8] mb-2">{'\u80a1\u7968\u540d\u79f0'}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={'\u81ea\u52a8\u8bc6\u522b\u6216\u624b\u52a8\u8f93\u5165'}
            className="w-full px-4 py-2.5 rounded-md text-[13px] text-white placeholder-[#475569] outline-none"
            style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)' }} />
        </div>
      </div>

      {curPrice && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-md" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <span className="text-[11px] text-[#94a3b8]">{'\u53c2\u8003\u73b0\u4ef7'}:</span>
          <span className="text-[14px] font-bold font-mono text-blue-400">{curPrice} {'\u5143'}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[11px] text-[#94a3b8] mb-2">{'\u6210\u672c\u4ef7 (\u5143)'}</label>
          <input type="number" min={0.01} step={0.01} value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder={'\u4f60\u7684\u4e70\u5165\u4ef7\u683c'}
            className="w-full px-4 py-2.5 rounded-md text-[13px] font-mono text-white placeholder-[#475569] outline-none"
            style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(245,158,11,0.3)' }} />
        </div>
        <div>
          <label className="block text-[11px] text-[#94a3b8] mb-2">{'\u6301\u6709\u4efd\u989d (\u80a1)'}</label>
          <input type="number" min={1} step={1} value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder={'\u4f60\u6301\u6709\u7684\u80a1\u6570'}
            className="w-full px-4 py-2.5 rounded-md text-[13px] font-mono text-white placeholder-[#475569] outline-none"
            style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(34,197,94,0.3)' }} />
        </div>
      </div>

      {shares && costPrice && curPrice && (
        <div className="flex items-center justify-between py-3 px-4 rounded-md mb-5" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <span className="text-[11px] text-[#94a3b8]">{'\u5f53\u524d\u5e02\u503c'} / {'\u4e8f\u76c8'}</span>
          <span className="text-[14px] font-bold font-mono">
            <span className="text-white">{(parseInt(shares) * parseFloat(curPrice) / 10000).toFixed(2)}w</span>
            <span className={parseFloat(curPrice) >= parseFloat(costPrice) ? ' text-emerald-400 ml-3' : ' text-red-400 ml-3'}>
              {parseFloat(curPrice) >= parseFloat(costPrice) ? '+' : ''}{((parseFloat(curPrice) - parseFloat(costPrice)) * parseInt(shares)).toFixed(0)}
            </span>
          </span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2 rounded-md text-[12px] font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-all">{'\u53d6\u6d88'}</button>
        <button
          onClick={() => onConfirm({ code, name, shares: parseInt(shares), costPrice: parseFloat(costPrice), curPrice: parseFloat(curPrice) })}
          disabled={!code || !name || !shares || parseInt(shares) <= 0 || !costPrice || parseFloat(costPrice) <= 0}
          className="px-5 py-2 rounded-md text-[12px] font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 0 12px rgba(59,130,246,0.3)' }}>
          {'\u786e\u8ba4\u6dfb\u52a0'}
        </button>
      </div>
    </ModalShell>
  );
}

