/**
 * Holdings Price Updater
 * Background service that periodically fetches real-time stock prices
 * from East Money API and updates the holdings table in the database.
 *
 * Runs every 30s during A-share trading hours (Mon-Fri 9:30-11:30, 13:00-15:00 CST).
 * On weekends/holidays/non-trading hours, it skips.
 *
 * Why: frontend price polling is in-memory only. Without this, DB values
 * go stale and a page refresh loads old (potentially zero) data.
 */

import * as models from '../models/index.js';
import { fetchQuote } from './marketDataService.js';

/** Check if now is within A-share trading hours (China time). */
function isTradingTime() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const h = now.getHours();
  const m = now.getMinutes();
  const t = h * 60 + m;
  // 9:30-11:30 CST = 570-690 min, 13:00-15:00 CST = 780-900 min
  return (t >= 570 && t <= 690) || (t >= 780 && t <= 900);
}

/** Update a single holding with fresh market price. */
async function updateHoldingPrice(holding) {
  try {
    const quote = await fetchQuote(holding.stock_code);
    if (!quote || !quote.price || quote.price <= 0) return;

    const curPrice = quote.price;
    const marketVal = holding.quantity * curPrice;
    const profitLoss = marketVal - holding.quantity * holding.cost_price;
    const pctChange = holding.cost_price > 0
      ? ((curPrice - holding.cost_price) / holding.cost_price) * 100
      : 0;

    // Only update if price actually changed (avoid unnecessary DB writes)
    const priceDiff = Math.abs(curPrice - (holding.cur_price || 0));
    if (priceDiff < 0.001) return;

    models.upsertHolding({
      userId: holding.user_id,
      stockCode: holding.stock_code,
      stockName: quote.name || holding.stock_name,
      quantity: holding.quantity,
      costPrice: holding.cost_price,
      curPrice: Math.round(curPrice * 1000) / 1000,
      marketVal: Math.round(marketVal * 100) / 100,
      profitLoss: Math.round(profitLoss * 100) / 100,
      pctChange: Math.round(pctChange * 100) / 100,
    });
  } catch (err) {
    // Silently skip individual failures — one bad quote shouldn't block all
  }
}

/** Main update loop: fetch all holdings, update each with fresh prices. */
async function updateAllHoldings() {
  if (!isTradingTime()) return;

  try {
    const holdings = models.getHoldings(1);
    if (!holdings || holdings.length === 0) return;

    // Process in batches of 3 to avoid hammering East Money
    for (let i = 0; i < holdings.length; i += 3) {
      const batch = holdings.slice(i, i + 3);
      await Promise.all(batch.map(h => updateHoldingPrice(h)));
      // Small delay between batches
      if (i + 3 < holdings.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch (err) {
    console.error('[holdings-updater] Batch update failed:', err.message);
  }
}

/** Start the background updater. Called from app.js boot sequence. */
export function startHoldingsUpdater() {
  console.log('[holdings-updater] Started — polling every 30s during trading hours');

  // Run immediately on start
  updateAllHoldings();

  // Then every 30 seconds
  setInterval(updateAllHoldings, 30000);
}
