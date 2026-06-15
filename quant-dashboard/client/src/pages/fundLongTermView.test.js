import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankLongTermFundResults } from './fundLongTermView.js';

describe('rankLongTermFundResults', () => {
  it('returns every successful fund result ordered by score', () => {
    const results = [
      { code: '001', score: 40 },
      { code: '002', score: 90 },
      { code: '003', score: 55 },
      { code: '004', error: 'missing history' },
      { code: '005', score: 70 },
      { code: '006', score: 10 },
    ];

    const ranked = rankLongTermFundResults(results);

    assert.deepEqual(ranked.map(item => item.code), ['002', '005', '003', '001', '006']);
  });
});
