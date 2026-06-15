import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_SIDEBAR_ITEMS, SIDEBAR_SECTIONS } from './sidebarNavigation.js';

describe('sidebar navigation for long-term prediction workflow', () => {
  it('keeps only prediction and research entries visible', () => {
    assert.deepEqual(
      SIDEBAR_SECTIONS.map(section => ({
        label: section.label,
        items: section.items.map(item => [item.id, item.label, item.path]),
      })),
      [
        {
          label: '基金分析',
          items: [['fund', '基金分析', '/fund']],
        },
        {
          label: '长期预测',
          items: [
            ['dashboard', '总览', '/'],
            ['stock', 'A股分析', '/stock'],
            ['position', '持仓观察', '/position'],
            ['strategy', '强势雷达', '/strategy'],
            ['risk', '风险复盘', '/risk'],
          ],
        },
      ],
    );
  });

  it('documents lower-priority pages that remain available by direct route', () => {
    assert.deepEqual(
      HIDDEN_SIDEBAR_ITEMS.map(item => item.id),
      ['asset', 'quant', 'alert', 'journal', 'portfolio', 'sentiment'],
    );
  });

  it('does not expose duplicate sidebar paths', () => {
    const paths = SIDEBAR_SECTIONS.flatMap(section => section.items.map(item => item.path));
    assert.equal(new Set(paths).size, paths.length);
  });
});
