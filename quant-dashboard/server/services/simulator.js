/**
 * Simulated real-time market data pusher.
 * Broadcasts comprehensive ticks over Socket.IO at 3s intervals.
 *
 * Integration points for real data:
 *   East Money:  http://push2.eastmoney.com/api/qt/stock/get
 *   Tushare:     pro_bar(ts_code, freq) + realtime_quote()
 *   Sina:        http://hq.sinajs.cn/list=...
 */

import { mockDashboardSnapshot } from './mockData.js';

const WATCH_CODES = ['000001', '399001', '300750', '002594', '688981', '300059'];

function randomWalk(prev, range = 0.005) {
  const delta = (Math.random() - 0.5) * 2 * range;
  return +(prev * (1 + delta)).toFixed(4);
}

export function startSimulator(io, realtimeNs) {
  const state = {
    '000001': { price: 3350.62, changePct: 0, name: '上证指数' },
    '399001': { price: 10820.45, changePct: 0, name: '深证成指' },
    '300750': { price: 215.38, changePct: 0, name: '宁德时代' },
    '002594': { price: 282.11, changePct: 0, name: '比亚迪' },
    '688981': { price: 62.54, changePct: 0, name: '中芯国际' },
    '300059': { price: 23.86, changePct: 0, name: '东方财富' },
  };

  const prevClose = {};
  for (const code of Object.keys(state)) {
    prevClose[code] = state[code].price;
  }

  const intervalMs = 3000;

  setInterval(() => {
    const ticks = [];

    for (const [code, s] of Object.entries(state)) {
      s.price = randomWalk(s.price, code.length === 6 && code.startsWith('00') ? 0.003 : 0.008);
      s.changePct = +(((s.price - prevClose[code]) / prevClose[code]) * 100).toFixed(2);

      ticks.push({
        code,
        name: s.name,
        price: s.price,
        changePct: s.changePct,
        volume: Math.floor(Math.random() * 1e8),
        ts: Date.now(),
      });
    }

    // Default namespace — individual tick stream
    io.emit('market:tick', ticks);

    // /realtime namespace — dashboard snapshot (every ~3rd tick)
    if (Math.random() < 0.33) {
      const snapshot = mockDashboardSnapshot();
      realtimeNs.emit('dashboard:snapshot', snapshot);
    }
  }, intervalMs);

  console.log(`[simulator] started — broadcasting every ${intervalMs / 1000}s`);
}
