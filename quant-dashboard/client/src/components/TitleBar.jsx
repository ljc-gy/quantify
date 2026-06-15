import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';

export default function TitleBar({ onRefresh, wsConnected, pageTitle = '实时监控系统' }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      const y = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const h = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTime(`${y}-${mo}-${d}  ${h}:${mi}:${s}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="
        relative flex h-[60px] shrink-0 items-center
        justify-between overflow-hidden
        border-b border-indigo-500/15 px-6
        bg-cyber-dark/60 backdrop-blur-sm
      "
    >
      {/* Top gradient bar */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/50 via-cyan-400/30 to-transparent" />

      {/* Left decoration */}
      <div className="absolute -left-12 top-1/2 h-28 w-24 -translate-y-1/2 -skew-x-[18deg] bg-gradient-to-r from-cyan-500/6 to-transparent" />
      <div className="absolute -left-6 top-1/2 h-20 w-12 -translate-y-1/2 -skew-x-[18deg] bg-gradient-to-r from-indigo-500/12 to-transparent" />

      {/* Right decoration */}
      <div className="absolute -right-12 top-1/2 h-28 w-24 -translate-y-1/2 skew-x-[18deg] bg-gradient-to-l from-cyan-500/6 to-transparent" />
      <div className="absolute -right-6 top-1/2 h-20 w-12 -translate-y-1/2 skew-x-[18deg] bg-gradient-to-l from-indigo-500/12 to-transparent" />

      {/* Title */}
      <div className="relative z-10 flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-widest text-white text-glow">{pageTitle}</h1>
        <div className="h-5 w-px bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent" />
        <span className="text-xs font-medium tracking-[0.2em] text-cyber-gray">REAL-TIME</span>
      </div>

      {/* Right: status + time + refresh */}
      <div className="relative z-10 flex items-center gap-5">
        {wsConnected !== undefined && (
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              wsConnected
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                : 'bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
            }`}
            title={wsConnected ? '实时连接' : '连接断开'}
          />
        )}
        <span className="font-mono text-sm tracking-wider text-cyber-gray">{time}</span>
        {onRefresh && (
          <button className="btn-primary" title="刷新数据" onClick={onRefresh}>
            <FontAwesomeIcon icon={faRotate} className="text-xs" />
            <span>刷新数据</span>
          </button>
        )}
      </div>
    </header>
  );
}
