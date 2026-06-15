/**
 * Macro overlay analysis for fund selection.
 * Adds geopolitical risk assessment, supply-demand signals,
 * fund holdings data, and 3-month outlook.
 */

const SECTOR_PATTERNS = [
  { sector: "半导体/芯片", keys: ["半导体","芯片","集成电路","电子"], geoRisk: 7, geoNote: "中美科技制裁持续升级，芯片出口管制收紧" },
  { sector: "新能源/光伏", keys: ["新能源","光伏","锂电","电池","储能","碳中和","绿色"], geoRisk: 5, geoNote: "全球能源转型加速，但欧美对中国光伏/锂电加征关税风险上升" },
  { sector: "消费/白酒", keys: ["消费","白酒","食品","饮料","家电","零售"], geoRisk: 4, geoNote: "内需复苏节奏不确定，人口结构变化影响长期消费增速" },
  { sector: "医药/医疗", keys: ["医药","医疗","生物","制药","健康","中药","创新药"], geoRisk: 5, geoNote: "集采政策持续压价，但创新药出海和老龄化提供结构性机会" },
  { sector: "军工/国防", keys: ["军工","国防","军民融合","航天","航空"], geoRisk: 6, geoNote: "台海及南海局势持续紧张，国防支出保持高增长" },
  { sector: "AI/科技", keys: ["科技","AI","人工智能","大数据","云计算","软件","互联网","信息"], geoRisk: 6, geoNote: "中美AI竞赛白热化，技术封锁加剧，但国内替代和自主可控推动产业升级" },
  { sector: "资源/能源", keys: ["资源","能源","石油","原油","天然气","煤炭","有色","黄金","矿产"], geoRisk: 8, geoNote: "中东及俄乌地缘冲突推高能源价格波动，全球资源博弈加剧" },
  { sector: "金融/银行", keys: ["金融","银行","保险","证券","券商"], geoRisk: 3, geoNote: "货币政策宽松预期，但银行净息差收窄和地产风险敞口需关注" },
  { sector: "基建/地产", keys: ["基建","地产","房地产","建筑","建材","工程"], geoRisk: 4, geoNote: "地产行业仍在筑底，基建投资受地方债务约束" },
  { sector: "QDII/海外", keys: ["QDII","海外","全球","新兴市场","纳斯达克","标普","港股"], geoRisk: 7, geoNote: "人民币汇率波动、中美关系变化、海外市场监管风险叠加" },
  { sector: "农业/养殖", keys: ["农业","养殖","畜牧","种业","粮食"], geoRisk: 5, geoNote: "全球粮食安全风险上升，极端天气频发影响供给" },
  { sector: "红利/高股息", keys: ["红利","高股息","价值","蓝筹","国企"], geoRisk: 3, geoNote: "低利率环境下红利策略吸引力上升" },
  { sector: "债券/固收", keys: ["债券","债","固收","纯债","信用","利率债","可转债","短债"], geoRisk: 2, geoNote: "利率下行周期利好债市" },
  { sector: "指数/宽基", keys: ["沪深300","中证500","创业板","科创板","指数增强","上证"], geoRisk: 5, geoNote: "宽基指数反映整体经济预期，系统性风险相对分散" },
];

function detectSector(fundName) {
  if (!fundName) return { sector: "综合/其他", geoRisk: 5, geoNote: "跨行业配置，单一领域地缘风险影响有限" };
  for (const pat of SECTOR_PATTERNS) {
    for (const key of pat.keys) { if (fundName.includes(key)) return pat; }
  }
  return { sector: "综合/其他", geoRisk: 5, geoNote: "跨行业配置" };
}

function computeSupplyDemand(metrics) {
  const m = metrics || {};
  const momentum = (m.oneYearReturn||0)*0.4 + (m.halfYearReturn||0)*0.35 + ((m.rankReturns?.month3||m.month3)||0)*0.25;
  const stability = Math.max(0, 100-Math.abs(m.volatilityPct||30))/100;
  const drawdownPenalty = Math.max(0, 1+(m.drawdownPct||0)/50);
  let ds = 50;
  if (momentum>40) ds += 25; else if (momentum>20) ds += 15; else if (momentum>5) ds += 8; else if (momentum<-10) ds -= 15;
  ds += (stability-0.5)*20; ds += (drawdownPenalty-1)*15;
  ds = Math.max(0, Math.min(100, Math.round(ds)));
  return { score: ds, level: ds>=70?"需求旺盛":ds>=55?"需求偏强":ds<35?"需求偏弱":"中性", momentum, stability: Math.round(stability*100), detail: "资金动量 "+momentum.toFixed(1)+"%，波动稳定性 "+(stability*100).toFixed(0)+"%" };
}

function buildMacroNarrative(fund, sector, sd, compScore) {
  const m = fund.metrics||{};
  const parts = [];
  parts.push("【行业背景】该基金属于"+sector.sector+"领域。"+sector.geoNote);
  parts.push("【供需判断】当前"+sd.level+"（得分"+sd.score+"），"+sd.detail);
  if (m.oneYearReturn>30) parts.push("【技术面】近一年涨幅显著，趋势质量优秀。");
  else if (m.oneYearReturn>10) parts.push("【技术面】中期趋势稳健向上。");
  else parts.push("【技术面】趋势需进一步确认。");
  if (sector.geoRisk>=7) parts.push("【地缘风险】地缘敏感度较高，建议分批建仓。");
  else if (sector.geoRisk>=5) parts.push("【地缘风险】存在一定地缘关联。");
  else parts.push("【地缘风险】地缘风险可控。");
  parts.push("【综合结论】"+(compScore>=80?"综合评分优异，适合核心配置。":compScore>=65?"综合评分良好，关注行业宏观风险。":"建议等待更好时机。"));
  return parts.join("\n\n");
}

function buildThreeMonthOutlook(fund, sd) {
  const m = fund.metrics||{};
  const val = fund.validation||{};
  const ret = fund.rankReturns||{};
  let emin=0, emax=0, conf='低';
  if (val.samples>=4 && val.avgForwardReturnPct!==undefined) {
    const base = val.avgForwardReturnPct*3/20;
    const vol = Math.abs(m.volatilityPct||20);
    emin = Math.round(base - vol*0.15);
    emax = Math.round(base + vol*0.25);
    conf = val.hitRatePct>=75&&val.samples>=6?'高':val.hitRatePct>=55?'中':'低';
  } else {
    const r3m = ret.month3||0;
    emin = Math.round(r3m*0.4);
    emax = Math.round(r3m*0.8);
  }
  return {
    rangeMin: emin, rangeMax: emax, confidence: conf,
    basis: val.samples>=4?('基于 '+val.samples+' 次历史类似趋势信号滚动验证，平均20日收益 '+(val.avgForwardReturnPct||0)+'%'):('基于近3月动量推算，样本不足仅供参考'),
    note: conf==='高'?'当前趋势信号与历史强势样本高度匹配，3个月内大概率延续上升':conf==='中'?'趋势信号有一定参考价值，需关注市场变化':'历史样本不足，仅供参考',
  };
}

export async function fetchFundHoldings(code) {
  try {
    const url = 'https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code='+code+'&topline=10';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://fundf10.eastmoney.com/' } });
    if (!res.ok) return [];
    const html = await res.text();
    const holdings = [];
    const re = /<tr><td>(\d+)<\/td><td>.*?>(\d{6})<\/a><\/td><td class='tol'><a href='[^']+'>([^<]+)<\/a><\/td>/g;
    const pctRe = /class='tor'>([\d.]+)%<\/td>/g;
    let m;
    const pcts = [];
    let pm;
    while ((pm = pctRe.exec(html)) !== null) pcts.push(parseFloat(pm[1]));
    let pi = 3; // skip first 3 % columns (nav pct columns)
    while ((m = re.exec(html)) !== null && holdings.length < 10) {
      holdings.push({ seq: parseInt(m[1]), stockCode: m[2], stockName: m[3].replace(/<[^>]+>/g, '').trim(), weight: pcts[pi] || 0 });
      pi += 2;
    }
    return holdings;
  } catch (e) { return []; }
}

export async function fetchHoldingsForTop(funds) {
  await Promise.allSettled(funds.map(async function(f) {
    f.macro.holdings = await fetchFundHoldings(f.code);
  }));
}

export function applyMacroOverlay(fund) {
  const sector = detectSector(fund.name);
  const sd = computeSupplyDemand(fund.metrics);
  const technicalScore = fund.radar?.strengthScore||fund.strengthScore||fund.score||50;
  const geoPenalty = (sector.geoRisk/10)*15;
  const compositeScore = Math.round(technicalScore*0.55 + (100-geoPenalty*4)*0.20 + sd.score*0.25);
  return {
    sector: sector.sector, geoRisk: sector.geoRisk, geoRiskNote: sector.geoNote,
    supplyDemand: sd, compositeScore, technicalScore,
    narrative: buildMacroNarrative(fund, sector, sd, compositeScore),
    threeMonthOutlook: buildThreeMonthOutlook(fund, sd),
    holdings: [],
  };
}

export function rerankWithMacro(funds, topN) {
  topN = topN || 10;
  const analyzed = funds.map(function(f) { return { ...f, macro: applyMacroOverlay(f) }; });
  analyzed.sort(function(a,b) { return (b.macro.compositeScore||0)-(a.macro.compositeScore||0); });
  return { top10: analyzed.slice(0, topN), allRanked: analyzed.slice(0, 20) };
}
