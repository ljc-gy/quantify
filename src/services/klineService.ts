// K-line data service — Workers-compatible (uses fetch)

const PERIOD_FIELDS: Record<string, string> = {
  day: 'qfqday', week: 'qfqweek', month: 'qfqmonth',
};

export async function fetchKline(code: string, period: number | string = 'day', limit: number = 120): Promise<any[]> {
  if (typeof period === 'number') { limit = period; period = 'day'; }
  const normalizedPeriod = PERIOD_FIELDS[period as string] ? (period as string) : 'day';
  const preferredField = PERIOD_FIELDS[normalizedPeriod];
  const market = code.startsWith('6') ? 'sh' : 'sz';
  const fullCode = `${market}${code}`;
  const url = `http://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${fullCode},${normalizedPeriod},,,${limit},qfq`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: any = await res.json();
  if (json.code !== 0 || !json.data) throw new Error('No data');

  const rawData = json.data[fullCode]?.[preferredField] || json.data[fullCode]?.[normalizedPeriod] || [];
  if (!rawData.length) throw new Error('Empty kline data');

  return rawData.map((row: any[]) => ({
    date: row[0],
    open: parseFloat(row[1]),
    close: parseFloat(row[2]),
    high: parseFloat(row[3]),
    low: parseFloat(row[4]),
    volume: parseFloat(row[5]) || 0,
  }));
}
