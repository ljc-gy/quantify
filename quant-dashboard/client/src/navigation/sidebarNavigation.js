import {
  faBell,
  faBook,
  faBriefcase,
  faCakeCandles,
  faChartLine,
  faChartPie,
  faFire,
  faLightbulb,
  faMicrochip,
  faSackDollar,
  faSatelliteDish,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

export const SIDEBAR_SECTIONS = [
  {
    id: 'fund',
    label: '基金分析',
    defaultOpen: true,
    collapsedHeight: 'max-h-24',
    items: [
      { id: 'fund', label: '基金分析', icon: faSackDollar, path: '/fund' },
    ],
  },
  {
    id: 'longTerm',
    label: '长期预测',
    defaultOpen: true,
    collapsedHeight: 'max-h-[360px]',
    items: [
      { id: 'dashboard', label: '总览', icon: faSatelliteDish, path: '/' },
      { id: 'stock', label: 'A股分析', icon: faCakeCandles, path: '/stock' },
      { id: 'position', label: '持仓观察', icon: faBriefcase, path: '/position' },
      { id: 'strategy', label: '强势雷达', icon: faLightbulb, path: '/strategy' },
      { id: 'risk', label: '风险复盘', icon: faShieldHalved, path: '/risk' },
    ],
  },
];

export const HIDDEN_SIDEBAR_ITEMS = [
  { id: 'asset', label: '资产配置', icon: faChartPie, path: '/asset', reason: '已有总览和持仓观察承载主要结构信息' },
  { id: 'quant', label: '量化分析', icon: faMicrochip, path: '/quant', reason: '与K线分析和长期策略重叠，先降级为直达页' },
  { id: 'alert', label: '涨跌提醒', icon: faBell, path: '/alert', reason: '偏短线盯盘，不放在长期预测主路径' },
  { id: 'journal', label: '交易日志', icon: faBook, path: '/journal', reason: '项目目标转向长期预测，不再作为主路径' },
  { id: 'portfolio', label: '持仓明细', icon: faBriefcase, path: '/portfolio', reason: '与持仓观察重复，保留路由但隐藏入口' },
  { id: 'sentiment', label: '情绪追踪', icon: faFire, path: '/sentiment', reason: '数据源稳定前容易形成噪音' },
];

export const BRAND_ICON = faChartLine;
