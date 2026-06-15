/**
 * Fund Management — Mock Data
 *
 * Real-data integration points (Tushare / East Money):
 *   - Fund detail list:   Tushare fund_basic() + fund_nav()
 *   - Auto-invest plans:   Local DB table `auto_invest_plans`
 *   - Return analysis:     Aggregate from holdings + daily NAV snapshots
 */

/* ================================================================
   Chart X-axis
   ================================================================ */
export const X_DATA = ['1月','1月','2月','4月','5月','6月','8月','10月','14月','9月','10月','10月','10月','10月'];

/* ================================================================
   Category cards (top 5)
   ================================================================ */
export const CATEGORY_CARDS = [
  { id: 0, label: '股票型基金', amount: '152.69.74', holding: '持仓总金额：200328959.18', bg: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))', border: 'rgba(139,92,246,0.4)', iconColor: '#a78bfa' },
  { id: 1, label: '股票型基金', amount: '152.28.75', holding: '持仓总金额：140328550.18', bg: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.2))', border: 'rgba(59,130,246,0.4)', iconColor: '#60a5fa' },
  { id: 2, label: '债券型基金', amount: '784.21.76', holding: '持仓总金额：12438559.08', bg: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.2))', border: 'rgba(6,182,212,0.4)', iconColor: '#22d3ee' },
  { id: 3, label: '混合基金',   amount: '29.69.78',  holding: '持仓总金额：10125258.08', bg: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(16,185,129,0.2))', border: 'rgba(16,185,129,0.4)', iconColor: '#60a5fa' },
  { id: 4, label: '混合基金',   amount: '210-89.78', holding: '持仓总金额：14038959.08', bg: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))', border: 'rgba(236,72,153,0.4)', iconColor: '#a78bfa' },
];

/* ================================================================
   Chart datasets per category
   ================================================================ */
export const FUND_DATASETS = {
  equity1: {
    accum: [0, 180, 350, 580, 420, 380, 520, 480, 620, 420, 580, 520, 680, 920],
    rate:  [0, 120, 220, 380, 320, 280, 480, 520, 480, 320, 620, 520, 580, 880],
    annotation: { coord: ['10月', 620], color: '#8b5cf6', text: '5843.95\n(11.89W/月)', lineTo: 780 },
    donut:  [{ v: 55, n: '股票占比', c: '#3b82f6' }, { v: 25, n: '债券占比', c: '#8b5cf6' }, { v: 20, n: '现金占比', c: '#f59e0b' }],
    donut2: [{ v: 50, n: '股票占比', c: '#3b82f6' }, { v: 40, n: '债券占比', c: '#8b5cf6' }, { v: 10, n: '现金占比', c: '#ec4899' }],
  },
  equity2: {
    accum: [0, 200, 320, 620, 480, 380, 580, 480, 720, 480, 620, 580, 680, 980],
    rate:  [0, 100, 200, 380, 320, 280, 520, 480, 680, 420, 720, 620, 680, 1020],
    annotation: { coord: ['14月', 720], color: '#3b82f6', text: '12043.17\n(13.89W/月)', lineTo: 860 },
    donut:  [{ v: 60, n: '股票占比', c: '#3b82f6' }, { v: 20, n: '债券占比', c: '#8b5cf6' }, { v: 20, n: '现金占比', c: '#f59e0b' }],
    donut2: [{ v: 45, n: '股票占比', c: '#3b82f6' }, { v: 35, n: '债券占比', c: '#8b5cf6' }, { v: 20, n: '现金占比', c: '#ec4899' }],
  },
  bond: {
    accum: [0, 50, 80, 120, 110, 130, 160, 140, 180, 160, 200, 190, 210, 240],
    rate:  [0, 30, 50, 80, 70, 90, 110, 100, 130, 110, 140, 130, 150, 170],
    annotation: { coord: ['10月', 200], color: '#22c55e', text: '2410.52\n(2.12W/月)', lineTo: 260 },
    donut:  [{ v: 20, n: '股票占比', c: '#3b82f6' }, { v: 65, n: '债券占比', c: '#22c55e' }, { v: 15, n: '现金占比', c: '#f59e0b' }],
    donut2: [{ v: 15, n: '股票占比', c: '#3b82f6' }, { v: 70, n: '债券占比', c: '#22c55e' }, { v: 15, n: '现金占比', c: '#ec4899' }],
  },
  mixed1: {
    accum: [0, 100, 180, 300, 260, 240, 350, 320, 420, 290, 400, 360, 440, 560],
    rate:  [0, 70, 130, 220, 190, 170, 260, 230, 310, 210, 290, 260, 320, 400],
    annotation: { coord: ['14月', 420], color: '#10b981', text: '3621.08\n(4.52W/月)', lineTo: 500 },
    donut:  [{ v: 35, n: '股票占比', c: '#3b82f6' }, { v: 40, n: '债券占比', c: '#8b5cf6' }, { v: 25, n: '现金占比', c: '#f59e0b' }],
    donut2: [{ v: 30, n: '股票占比', c: '#3b82f6' }, { v: 45, n: '债券占比', c: '#8b5cf6' }, { v: 25, n: '现金占比', c: '#ec4899' }],
  },
  mixed2: {
    accum: [0, 90, 160, 280, 240, 220, 330, 300, 400, 270, 380, 340, 420, 540],
    rate:  [0, 60, 120, 200, 180, 160, 250, 220, 300, 200, 280, 250, 310, 390],
    annotation: { coord: ['10月', 400], color: '#f59e0b', text: '3150.33\n(3.88W/月)', lineTo: 480 },
    donut:  [{ v: 40, n: '股票占比', c: '#3b82f6' }, { v: 35, n: '债券占比', c: '#8b5cf6' }, { v: 25, n: '现金占比', c: '#f59e0b' }],
    donut2: [{ v: 35, n: '股票占比', c: '#3b82f6' }, { v: 40, n: '债券占比', c: '#8b5cf6' }, { v: 25, n: '现金占比', c: '#ec4899' }],
  },
};

export const DATASET_KEYS = ['equity1', 'equity2', 'bond', 'mixed1', 'mixed2'];

/* ================================================================
   Fund detail table — per category
   TODO: GET /api/fund/details?category=equity1
   ================================================================ */
export const FUND_DETAILS = {
  equity1: [
    { code: '000001', name: '华夏成长混合',  shares: 12000, nav: 1.5234, cumNav: 2.8912, pl: '+12,350.00',  rate: '+15.2' },
    { code: '160505', name: '博时主题行业',  shares: 8500,  nav: 2.1080, cumNav: 4.3320, pl: '+8,920.00',  rate: '+11.8' },
    { code: '110011', name: '易方达中小盘',  shares: 6200,  nav: 3.4520, cumNav: 5.6780, pl: '+5,430.00',  rate: '+9.4' },
    { code: '519068', name: '汇添富成长焦点', shares: 9800,  nav: 1.8760, cumNav: 3.2140, pl: '+3,210.00',  rate: '+6.8' },
    { code: '166001', name: '中欧新趋势',    shares: 15000, nav: 0.9850, cumNav: 2.1520, pl: '-4,580.00',  rate: '-3.2' },
    { code: '040005', name: '华安宏利混合',  shares: 7200,  nav: 1.4320, cumNav: 2.8760, pl: '+2,100.00',  rate: '+4.1' },
    { code: '240010', name: '华宝兴业行业精选', shares: 5400, nav: 1.6540, cumNav: 2.9800, pl: '+6,780.00', rate: '+12.5' },
    { code: '590001', name: '中邮核心优选',  shares: 11000, nav: 0.7820, cumNav: 1.5420, pl: '-8,320.00',  rate: '-7.1' },
  ],
  equity2: [
    { code: '020011', name: '国泰金鹰增长',  shares: 9200,  nav: 1.2340, cumNav: 2.4560, pl: '+10,200.00', rate: '+13.8' },
    { code: '050002', name: '博时裕富沪深300', shares: 6800, nav: 1.8920, cumNav: 3.4500, pl: '+7,400.00', rate: '+9.8' },
    { code: '090001', name: '大成价值增长',  shares: 10400, nav: 1.3450, cumNav: 2.6780, pl: '+4,800.00', rate: '+8.2' },
    { code: '161601', name: '融通新蓝筹',    shares: 7600,  nav: 2.2100, cumNav: 4.1200, pl: '+11,500.00', rate: '+16.3' },
    { code: '180001', name: '银华优势企业',  shares: 13200, nav: 0.8560, cumNav: 1.8900, pl: '-2,450.00', rate: '-1.9' },
    { code: '202001', name: '南方稳健成长',  shares: 5800,  nav: 1.5670, cumNav: 3.0120, pl: '+3,320.00', rate: '+5.6' },
    { code: '288001', name: '华夏经典配置',  shares: 8800,  nav: 1.7230, cumNav: 2.9800, pl: '+9,100.00', rate: '+14.2' },
    { code: '398001', name: '中海优质成长',  shares: 6500,  nav: 0.9450, cumNav: 1.7800, pl: '-5,180.00', rate: '-4.8' },
  ],
  bond: [
    { code: '001001', name: '华夏债券A',      shares: 50000, nav: 1.0820, cumNav: 1.8520, pl: '+1,250.00',  rate: '+2.4' },
    { code: '100058', name: '富国天利增长债券', shares: 38000, nav: 1.1450, cumNav: 1.9200, pl: '+980.00',   rate: '+1.8' },
    { code: '050006', name: '博时稳定价值债券', shares: 42000, nav: 1.0630, cumNav: 1.7340, pl: '+1,420.00',  rate: '+2.9' },
    { code: '160608', name: '鹏华普天债券B',  shares: 35000, nav: 1.0950, cumNav: 1.6880, pl: '+760.00',   rate: '+1.5' },
    { code: '290003', name: '泰信双息双利',  shares: 28000, nav: 1.1280, cumNav: 1.5420, pl: '+540.00',   rate: '+1.1' },
  ],
  mixed1: [
    { code: '002001', name: '华夏回报混合',   shares: 18000, nav: 1.4340, cumNav: 3.2100, pl: '+5,820.00',  rate: '+8.4' },
    { code: '040004', name: '华安宝利配置',   shares: 14000, nav: 1.2560, cumNav: 2.8900, pl: '+3,450.00',  rate: '+5.2' },
    { code: '050007', name: '博时平衡配置',   shares: 22000, nav: 1.0870, cumNav: 1.9500, pl: '+2,180.00',  rate: '+3.8' },
    { code: '080001', name: '长盛成长价值',   shares: 9600,  nav: 1.5430, cumNav: 2.7400, pl: '+4,920.00',  rate: '+9.1' },
    { code: '121002', name: '国投瑞银景气行业', shares: 16000, nav: 0.9780, cumNav: 1.8600, pl: '-1,280.00', rate: '-1.2' },
    { code: '206001', name: '鹏华行业成长',   shares: 11200, nav: 1.3120, cumNav: 2.3400, pl: '+6,540.00',  rate: '+11.3' },
  ],
  mixed2: [
    { code: '217001', name: '招商安泰混合',   shares: 15200, nav: 1.2680, cumNav: 2.5600, pl: '+4,350.00',  rate: '+6.7' },
    { code: '233001', name: '大摩基础行业混合', shares: 9800, nav: 1.4560, cumNav: 2.3500, pl: '+6,120.00', rate: '+10.4' },
    { code: '260101', name: '景顺长城优选混合', shares: 13200, nav: 1.1340, cumNav: 2.0120, pl: '+2,480.00', rate: '+4.3' },
    { code: '310308', name: '申万菱信盛利精选', shares: 17800, nav: 0.8760, cumNav: 1.6800, pl: '-3,850.00', rate: '-3.8' },
    { code: '340001', name: '兴全可转债混合', shares: 20400, nav: 1.0450, cumNav: 1.8900, pl: '+1,150.00',  rate: '+2.1' },
    { code: '410001', name: '华富竞争力优选', shares: 8600,  nav: 1.3890, cumNav: 2.4700, pl: '+3,920.00',  rate: '+7.5' },
  ],
};

/* ================================================================
   Auto-invest plans
   TODO: GET /api/fund/auto-invest/plans
   ================================================================ */
export const AUTO_INVEST_PLANS = [
  { id: 1, fundName: '华夏成长混合', code: '000001', amount: 2000, frequency: '每周一', nextDate: '2026-06-08', status: 'active' },
  { id: 2, fundName: '博时主题行业', code: '160505', amount: 3000, frequency: '每月1日', nextDate: '2026-07-01', status: 'active' },
  { id: 3, fundName: '易方达中小盘', code: '110011', amount: 5000, frequency: '每月15日', nextDate: '2026-06-15', status: 'active' },
  { id: 4, fundName: '招商安泰混合', code: '217001', amount: 1500, frequency: '每周五',  nextDate: '2026-06-12', status: 'paused' },
  { id: 5, fundName: '景顺长城优选混合', code: '260101', amount: 1000, frequency: '每月10日', nextDate: '2026-06-10', status: 'paused' },
];

/* ================================================================
   Return analysis
   TODO: GET /api/fund/return-analysis
   ================================================================ */
export const RETURN_ANALYSIS = {
  daily:  { profit: '+878.50',  rate: '+0.32', pct: 12.5 },
  weekly: { profit: '+4,230.00', rate: '+1.58', pct: 35.2 },
  monthly:{ profit: '+18,650.00', rate: '+6.42', pct: 52.8 },
  yearly: { profit: '+85,200.00', rate: '+28.15', pct: 68.4 },
  // Mini bar chart data for the return overview
  bars: [
    { label: '日', profit: 878,  rate: 0.32 },
    { label: '周', profit: 4230, rate: 1.58 },
    { label: '月', profit: 18650,rate: 6.42 },
    { label: '季', profit: 45200,rate: 15.80 },
    { label: '半年', profit: 62800,rate: 22.30 },
    { label: '年', profit: 85200,rate: 28.15 },
  ],
};
