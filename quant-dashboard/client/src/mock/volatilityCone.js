/**
 * Volatility Cone mock data generator.
 *
 * Used as a fallback when the API (`/api/risk/volatility-cone`) is unreachable.
 * Mirrors the server-side generator in server/services/mockData.js.
 *
 * Real data: Tushare pro_bar daily → compute rolling HV for each window.
 */

export function generateMockCone() {
  const windows = [20, 30, 60, 90, 126, 189, 252];
  const baseMedians = [28.5, 27.8, 26.2, 25.0, 24.1, 23.0, 22.2];
  const series = windows.map((w, i) => {
    const median = baseMedians[i] + (Math.random() - 0.5) * 2;
    const spread = 3 + w * 0.02;
    const p25 = +(median - spread * (0.6 + Math.random() * 0.4)).toFixed(2);
    const p75 = +(median + spread * (0.6 + Math.random() * 0.4)).toFixed(2);
    const min = +(p25 - spread * (0.8 + Math.random() * 1.2)).toFixed(2);
    const max = +(p75 + spread * (0.8 + Math.random() * 1.2)).toFixed(2);
    const current = +(median + (Math.random() - 0.2) * spread * 1.5).toFixed(2);
    return { window: w, min, p25, median, p75, max, current };
  });
  return { windows, series };
}
