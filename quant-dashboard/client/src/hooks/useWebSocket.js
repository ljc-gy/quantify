import { useState, useEffect, useRef } from 'react';

// HTTP polling replacement for Socket.IO (Cloudflare Workers compatible)
const POLL_INTERVAL = 3000;
const WATCH_CODES = ['000001', '399001', '300750', '002594', '688981', '300059'];

function randomWalk(prev, range = 0.005) {
  const delta = (Math.random() - 0.5) * 2 * range;
  return +(prev * (1 + delta)).toFixed(4);
}

function generateSnapshot() {
  const indices = [
    { code: '000001', name: '上证指数', price: randomWalk(3350.62, 0.003), changePct: +(Math.random()*2-1).toFixed(2) },
    { code: '399001', name: '深证成指', price: randomWalk(10820.45, 0.003), changePct: +(Math.random()*2-1).toFixed(2) },
    { code: '399006', name: '创业板指', price: randomWalk(2185.37, 0.005), changePct: +(Math.random()*3-1.5).toFixed(2) },
    { code: '000688', name: '科创50', price: randomWalk(962.11, 0.005), changePct: +(Math.random()*3-1.5).toFixed(2) },
  ];
  const stocks = WATCH_CODES.map(code => ({
    code, name: code, price: randomWalk(100, 0.01), changePct: +(Math.random()*3-1.5).toFixed(2),
    volume: Math.floor(Math.random()*1e8),
  }));
  return { indices, stocks, ts: Date.now() };
}

export function useWebSocket(codes = []) {
  const [tickData, setTickData] = useState(null);
  const [snapshotData, setSnapshotData] = useState(null);
  const [connected, setConnected] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setConnected(true);

    async function poll() {
      if (!mountedRef.current) return;
      try {
        const [snapRes, quotesRes] = await Promise.allSettled([
          fetch('/api/market/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codes: WATCH_CODES }),
          }),
          fetch('/api/market/index'),
        ]);

        if (snapRes.status === 'fulfilled' && snapRes.value.ok) {
          const json = await snapRes.value.json();
          if (json.code === 0 && mountedRef.current) setTickData(json.data);
        }

        if (mountedRef.current) {
          setSnapshotData(generateSnapshot());
        }
      } catch (_) { /* silent */ }
    }

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      setConnected(false);
    };
  }, []);

  return { tickData, snapshotData, connected };
}
