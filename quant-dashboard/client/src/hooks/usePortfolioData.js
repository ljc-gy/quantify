import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { fetchHoldings } from '../services/api';

/**
 * Normalize a raw holding row into a clean position object.
 */
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
  };
}

/**
 * Shared hook: loads holdings from API and merges real-time prices.
 * Used by all A股量化 pages to share the same real data.
 *
 * Key behaviors:
 * - On API failure, KEEPS previous data instead of clearing to []
 * - Polls /api/market/quotes every 10s for real-time prices
 * - Computes derived aggregates (totalMarketVal, totalPnl, dayPnlPct)
 *
 * Returns { positions, loading, totalMarketVal, totalPnl, dayPnlPct }
 */
export default function usePortfolioData() {
  const [rawHoldings, setRawHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realPrices, setRealPrices] = useState({});
  const prevRawRef = useRef([]);

  // Load holdings from API -- NEVER clear on failure
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHoldings();
      const normalized = (data.holdings || []).map(normalizeHolding);
      const total = normalized.reduce((s, p) => s + (p.marketVal || 0), 0);
      normalized.forEach(p => {
        p.weight = total > 0 ? ((p.marketVal || 0) / total) * 100 : 0;
      });
      setRawHoldings(normalized);
      prevRawRef.current = normalized;
    } catch {
      // Keep previous data on failure -- DO NOT CLEAR
      if (prevRawRef.current.length > 0) {
        setRawHoldings(prevRawRef.current);
      }
      // On first load with no prior data, show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Merge real-time prices into positions
  const positions = useMemo(() => {
    if (rawHoldings.length === 0) return [];
    return rawHoldings.map(p => {
      const real = realPrices[p.code];
      if (real && real.price) {
        const curPrice = real.price;
        const marketVal = p.quantity * curPrice;
        const pnl = marketVal - p.quantity * p.costPrice;
        const pnlPct = p.costPrice > 0 ? ((curPrice - p.costPrice) / p.costPrice) * 100 : 0;
        return { ...p, curPrice, marketVal, pnl, pnlPct, name: real.name || p.name };
      }
      return p;
    });
  }, [rawHoldings, realPrices]);

  // Poll real-time prices every 10s
  useEffect(() => {
    const codes = positions.map(p => p.code).filter(Boolean);
    if (codes.length === 0) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/market/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codes }),
        });
        const json = await res.json();
        if (active && json.code === 0) {
          setRealPrices(prev => {
            const next = { ...prev };
            (json.data || []).forEach(q => {
              if (q.price && q.price > 0) next[q.code] = q;
            });
            return next;
          });
        }
      } catch (_) { /* silent */ }
    };
    poll();
    const timer = setInterval(poll, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [positions.map(p => p.code).join(',')]);

  // Derived aggregates
  const totalMarketVal = useMemo(
    () => positions.reduce((s, p) => s + (p.marketVal || 0), 0),
    [positions]
  );
  const totalPnl = useMemo(
    () => positions.reduce((s, p) => s + (p.pnl || 0), 0),
    [positions]
  );
  const totalCost = useMemo(
    () => positions.reduce((s, p) => s + p.quantity * p.costPrice, 0),
    [positions]
  );
  const dayPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return {
    positions,
    loading,
    totalMarketVal,
    totalPnl,
    totalCost,
    dayPnlPct,
    count: positions.length,
    refresh: loadData,
  };
}
