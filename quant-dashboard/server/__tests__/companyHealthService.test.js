import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeCompanyHealthFromSnapshot,
  parseEastMoneyCompanySnapshot,
  parseTencentCompanySnapshot,
} from '../services/companyHealthService.js';

describe('company health analysis', () => {
  it('parses scaled East Money company fields into usable fundamentals', () => {
    const snapshot = parseEastMoneyCompanySnapshot('601991', {
      f43: 776,
      f57: '601991',
      f58: '\u5927\u5510\u53d1\u7535',
      f116: 143_612_073_511.04,
      f117: 96_193_651_462.56,
      f162: 1241,
      f164: 1786,
      f167: 390,
      f168: 599,
      f170: 65,
      f50: 89,
    });

    assert.equal(snapshot.name, '\u5927\u5510\u53d1\u7535');
    assert.equal(snapshot.price, 7.76);
    assert.equal(snapshot.changePct, 0.65);
    assert.equal(snapshot.peDynamic, 12.41);
    assert.equal(snapshot.peTtm, 17.86);
    assert.equal(snapshot.pb, 3.9);
    assert.equal(snapshot.turnoverRate, 5.99);
    assert.equal(snapshot.volumeRatio, 0.89);
    assert.equal(snapshot.source, 'eastmoney-company');
  });

  it('parses Tencent quote fields as a company snapshot fallback', () => {
    const fields = [];
    fields[1] = '\u5927\u5510\u53d1\u7535';
    fields[2] = '601991';
    fields[3] = '7.76';
    fields[32] = '0.65';
    fields[38] = '5.99';
    fields[39] = '17.86';
    fields[44] = '961.94';
    fields[45] = '1436.12';
    fields[46] = '3.90';
    fields[49] = '0.89';
    fields[52] = '12.41';

    const snapshot = parseTencentCompanySnapshot('601991', fields);

    assert.equal(snapshot.name, '\u5927\u5510\u53d1\u7535');
    assert.equal(snapshot.price, 7.76);
    assert.equal(snapshot.changePct, 0.65);
    assert.equal(snapshot.marketCap, 143_612_000_000);
    assert.equal(snapshot.floatMarketCap, 96_194_000_000);
    assert.equal(snapshot.peTtm, 17.86);
    assert.equal(snapshot.peDynamic, 12.41);
    assert.equal(snapshot.pb, 3.9);
    assert.equal(snapshot.turnoverRate, 5.99);
    assert.equal(snapshot.volumeRatio, 0.89);
    assert.equal(snapshot.source, 'tencent-quote');
  });

  it('rates a liquid company with moderate valuation as stable', () => {
    const result = analyzeCompanyHealthFromSnapshot({
      code: '600000',
      name: 'Stable Co',
      marketCap: 80_000_000_000,
      floatMarketCap: 55_000_000_000,
      peDynamic: 18,
      pb: 1.8,
      turnoverRate: 3.2,
      volumeRatio: 1.1,
      changePct: 0.8,
      source: 'eastmoney-company',
    });

    assert.ok(result.score >= 60);
    assert.match(result.level, /稳健|正常/);
    assert.equal(result.confidence.level, '中');
    assert.ok(result.reasons.length >= 2);
    assert.equal(result.dataQuality.reliable, true);
  });

  it('flags loss-making or speculative snapshots as risky', () => {
    const result = analyzeCompanyHealthFromSnapshot({
      code: '300000',
      name: 'Risky Co',
      marketCap: 2_000_000_000,
      peDynamic: -3,
      pb: 9,
      turnoverRate: 18,
      volumeRatio: 4.5,
      changePct: -6,
      source: 'eastmoney-company',
    });

    assert.ok(result.score <= 40);
    assert.match(result.level, /偏弱|高风险/);
    assert.ok(result.risks.length >= 3);
  });

  it('keeps confidence low when fundamentals are missing', () => {
    const result = analyzeCompanyHealthFromSnapshot({
      code: '002000',
      name: 'Missing Co',
      price: 12.3,
      changePct: 1.2,
      source: 'fallback',
    });

    assert.equal(result.dataQuality.reliable, false);
    assert.equal(result.confidence.level, '低');
    assert.ok(result.score <= 55);
    assert.ok(result.risks.some(r => r.includes('估值')));
  });
});
