// Dev: Vite proxy forwards /api -> localhost:3001.  Production: same-origin.
const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.error || 'Unknown API error');
  return json.data;
}

// --- Asset ---
export function fetchAssetOverview() { return request('/asset/overview'); }

// --- Market ---
export function fetchMarketRealtime() { return request('/market/realtime'); }
export function fetchMarketHistory() { return request('/market/history'); }
export function fetchIndices() { return request('/market/index'); }
export function fetchSectors() { return request('/market/sectors'); }
export function fetchQuote(code) { return request(`/market/quote/${code}`); }
export function fetchQuotes(codes) {
  return request('/market/quotes', { method: 'POST', body: JSON.stringify({ codes }) });
}

// --- Stock / Watchlist ---
export function fetchWatchlist() { return request('/stock/watchlist'); }
export function addToWatchlist({ code, name, market, exchange }) {
  return request('/stock/watchlist', {
    method: 'POST', body: JSON.stringify({ code, name, market, exchange }),
  });
}

// --- Portfolio ---
export function fetchHoldings() { return request('/portfolio/holdings'); }
export function deleteHolding(id) { return fetch(`/api/portfolio/holdings/${id}`, { method: 'DELETE' }).then(r => r.json()); }
export function saveHolding(data) {
  if (data.id) {
    return fetch(`/api/portfolio/holdings/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json());
  }
  return fetch('/api/portfolio/holdings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json());
}



// --- Import ---
export function importCsv(formData) {
  return fetch(`${API_BASE}/import/csv`, { method: 'POST', body: formData })
    .then(r => r.json())
    .then(j => { if (j.code !== 0) throw new Error(j.error); return j.data; });
}
export function importJson(holdings) {
  return request('/import/json', { method: 'POST', body: JSON.stringify({ holdings }) });
}

// --- Risk ---
export function fetchRiskAssessment() { return request('/risk/assessment'); }
export function fetchVolatilityCone() { return request('/risk/volatility-cone'); }

// --- Alerts ---
export function fetchAlerts() { return request('/alert/list'); }
export function createAlert({ stockCode, stockName, alertType, threshold, direction }) {
  return request('/alert/set', {
    method: 'POST', body: JSON.stringify({ stockCode, stockName, alertType, threshold, direction }),
  });
}
export function updateAlert(id, fields) {
  return request(`/alert/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
}
export function deleteAlert(id) { return request(`/alert/${id}`, { method: 'DELETE' }); }

// --- Config ---
export function fetchConfig() { return request('/config'); }
export function updateConfig(key, value) {
  return request(`/config/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
}


// --- Fund Management ---
export function fetchFunds() { return request('/fund/list'); }
export function addFund(data) {
  return request('/fund/add', { method: 'POST', body: JSON.stringify(data) });
}
export function updateFund(id, fields) {
  return request(`/fund/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
}
export function deleteFund(id) { return request(`/fund/${id}`, { method: 'DELETE' }); }

// Fund code resolution
export function resolveFund(code) { return request(`/fund/resolve/${code}`); }

export function fetchFundPlans() { return request('/fund/plans'); }
export function addFundPlan(data) {
  return request('/fund/plans', { method: 'POST', body: JSON.stringify(data) });
}
export function updateFundPlan(id, fields) {
  return request(`/fund/plans/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
}
export function deleteFundPlan(id) { return request(`/fund/plans/${id}`, { method: 'DELETE' }); }

// NAV Snapshots
export function fetchSnapshots(fundId) {
  const qs = fundId ? `?fundId=${fundId}` : '';
  return request(`/fund/snapshots${qs}`);
}
export function addSnapshot(data) {
  return request('/fund/snapshot', { method: 'POST', body: JSON.stringify(data) });
}
export function snapshotAll(updates) {
  return request('/fund/snapshot-all', { method: 'POST', body: JSON.stringify({ updates }) });
}

// --- Refresh NAV from East Money ---
export function refreshNav(fundId) {
  return request('/fund/refresh-nav', {
    method: 'POST', body: JSON.stringify({ fundId: fundId || null }),
  });
}

// Yesterday return
export function fetchYesterdayReturn() { return request('/fund/yesterday-return'); }
export function fetchFundHistory(code, days = 60) { return request(`/fund/history/${code}?days=${days}`); }
export function fetchPortfolioTrend(days = 60) { return request(`/fund/portfolio-trend?days=${days}`); }

// --- Strategy ---
export function analyzeStrategies(codes) {
  return request('/strategy/analyze', { method: 'POST', body: JSON.stringify({ codes }) });
}

// --- Long-term analysis ---
export function analyzeLongTermStocks(codes, period = 'day', limit = 360) {
  return request('/long-term/stocks', {
    method: 'POST',
    body: JSON.stringify({ codes, period, limit }),
  });
}
export function analyzeStockRadar(codes, period = 'day', limit = 360) {
  return request('/long-term/stock-radar', {
    method: 'POST',
    body: JSON.stringify({ codes, period, limit }),
  });
}
export function fetchLongTermFunds(days = 360) {
  return request(`/long-term/funds?days=${days}`);
}
export function fetchFundRadar(days = 360) {
 return request(`/long-term/fund-radar?days=${days}`);
}

export function fetchMarketFundScan(options = {}) {
  const scanDays = options.scanDays || 360;
  const maxPerCategory = options.maxPerCategory || 30;
  const minScore = options.minScore || 55;
  const categories = options.categories || "";
  const params = new URLSearchParams({ scanDays, maxPerCategory, minScore });
  if (categories) params.set("categories", categories);
  return request("/long-term/market-fund-scan?" + params.toString());
}

// --- Health ---
export function fetchHealth() { return request('/health'); }

// --- Top 10 Market Scan Results ---
export function fetchTop10Funds() { return request('/long-term/top10'); }


// --- K-line ---
export function fetchKline(code, period = 'day', limit = 120) {
  return request(`/market/kline/${code}?period=${period}&limit=${limit}`);
}

// --- Trade Journal ---
export function fetchJournal(limit = 100) {
  return request(`/journal?limit=${limit}`);
}
export function addJournalEntry(data) {
  return request('/journal', { method: 'POST', body: JSON.stringify(data) });
}
export function updateJournalEntry(id, fields) {
  return request(`/journal/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
}
export function deleteJournalEntry(id) {
  return fetch(`/api/journal/${id}`, { method: 'DELETE' }).then(r => r.json());
}

// --- Stop-Loss / Take-Profit ---
export function autoGenerateSLTP(slPct = -8, tpPct = 15) {
  return request('/alert/auto-sl-tp', { method: 'POST', body: JSON.stringify({ slPct, tpPct }) });
}
