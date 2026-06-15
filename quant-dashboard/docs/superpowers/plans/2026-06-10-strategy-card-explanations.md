# Strategy Card Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Strategy Library card clickable and show a plain-language explanation for the selected strategy.

**Architecture:** Keep the feature inside `StrategyRecommendation.jsx` because the strategy library is already implemented there. Add a pure helper to derive plain-language copy from existing strategy data, track one expanded card id in component state, and render an inline explanation panel inside the selected card.

**Tech Stack:** React 18, Vite, existing FontAwesome icons, Playwright smoke script via the existing `client` dev dependencies.

---

### Task 1: Add A Browser Smoke Test

**Files:**
- Create: `client/smoke-strategy-explanations.cjs`
- Modify: `client/package.json`

- [ ] **Step 1: Write the failing smoke test**

Create `client/smoke-strategy-explanations.cjs` with:

```javascript
const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  try {
    await page.goto(`${baseUrl}/strategy`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /策略库/ }).click();

    const firstCard = page.locator('[data-testid="strategy-library-card"]').first();
    const secondCard = page.locator('[data-testid="strategy-library-card"]').nth(1);

    await firstCard.click();
    await page.getByText('一句话理解').waitFor({ state: 'visible' });
    await page.getByText('它在看什么').waitFor({ state: 'visible' });
    await page.getByText('适合什么时候').waitFor({ state: 'visible' });
    await page.getByText('要小心什么').waitFor({ state: 'visible' });

    await firstCard.click();
    await page.getByText('一句话理解').waitFor({ state: 'hidden' });

    await firstCard.focus();
    await page.keyboard.press('Enter');
    await page.getByText('一句话理解').waitFor({ state: 'visible' });

    await secondCard.click();
    const visibleExplanations = await page.getByText('一句话理解').count();
    if (visibleExplanations !== 1) {
      throw new Error(`Expected one visible explanation, saw ${visibleExplanations}`);
    }

    console.log('strategy explanation smoke test passed');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Add a package script in `client/package.json`:

```json
"smoke:strategy": "node smoke-strategy-explanations.cjs"
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `client` while the dev server is running:

```bash
npm run smoke:strategy
```

Expected: FAIL because `data-testid="strategy-library-card"` and the explanation labels do not exist yet.

### Task 2: Implement Clickable Strategy Explanations

**Files:**
- Modify: `client/src/pages/StrategyRecommendation.jsx`

- [ ] **Step 1: Add the explanation helper**

Add a pure helper near the category constants:

```javascript
function normalizeStrategyText(value = '') {
  return value;
}

function getStrategyExplanation(strategy) {
  const name = normalizeStrategyText(strategy.name);
  const category = normalizeStrategyText(strategy.category);
  const keywords = (strategy.keywords || []).map(normalizeStrategyText).filter(Boolean);
  const methods = (strategy.methods || []).map(normalizeStrategyText).filter(Boolean);

  const joined = `${name} ${keywords.join(' ')} ${methods.join(' ')}`;

  const categoryCopy = {
    '趋势跟踪': {
      fit: '适合走势已经比较清楚、价格沿着一个方向持续推进的时候。',
      caution: '最怕来回震荡，价格没有方向时容易连续小亏。',
    },
    '均值回归': {
      fit: '适合价格在一个区间里来回波动、涨多了会回落、跌多了会反弹的时候。',
      caution: '如果行情真的突破区间并开始单边走，不能一直硬扛。',
    },
    '动量策略': {
      fit: '适合市场情绪和价格速度都比较强，强者继续强的时候。',
      caution: '信号变慢或情绪反转时，追得太晚容易买在高位。',
    },
    '波动率策略': {
      fit: '适合行情波动明显放大，需要用波动幅度来控制仓位或止损的时候。',
      caution: '波动突然收缩或异常放大时，参数容易失真。',
    },
    '资金管理': {
      fit: '适合你更关心仓位节奏、分批买卖和风险控制的时候。',
      caution: '它管的是资金分配，不保证单个标的一定选得对。',
    },
    '订单管理': {
      fit: '适合已经有交易计划，需要用条件单帮助执行纪律的时候。',
      caution: '条件设置太近可能频繁触发，设置太远又可能保护不够。',
    },
  };

  let summary = '这个策略会把复杂的价格变化简化成几个规则，帮助你判断该观察、买入、卖出还是控制仓位。';
  let watches = methods[0] || keywords[0] || '价格、成交量和指标变化';

  if (/Dual|Thrust|通道/.test(joined)) {
    summary = '它像给价格画出上下警戒线，冲过上沿就认为买方占优，跌破下沿就认为风险变大。';
    watches = '最近一段时间的最高价、最低价和收盘价形成的价格通道。';
  } else if (/海龟|ATR|唐安奇/.test(joined)) {
    summary = '它像顺着大浪走，行情突破后先上车，再用分批和止损控制风险。';
    watches = '价格是否突破重要区间，以及 ATR 反映的市场波动大小。';
  } else if (/均线|EMA|DMA|TEMA|金叉|死叉/.test(joined)) {
    summary = '它把价格拉成几条平滑的线，用短线和长线的位置变化判断趋势有没有转强或转弱。';
    watches = '短期均线和长期均线的交叉、距离和方向。';
  } else if (/BOLL|布林|标准差/.test(joined)) {
    summary = '它像给价格套一个弹性区间，太靠上可能偏热，太靠下可能偏冷。';
    watches = '价格相对布林带上轨、中轨、下轨的位置。';
  } else if (/RSI|CCI|W&R|超买|超卖/.test(joined)) {
    summary = '它在看市场有没有短时间涨过头或跌过头，用来提醒别在情绪最热时追高。';
    watches = '指标是否进入超买或超卖区域。';
  } else if (/MACD|KDJ|MOM|ROC|CMO|动量/.test(joined)) {
    summary = '它关注价格变化的速度和力度，想抓住正在变强的方向。';
    watches = '动量指标的方向、交叉和强弱变化。';
  } else if (/网格/.test(joined)) {
    summary = '它把价格区间切成一格一格，低一点买一些，高一点卖一些，靠波动慢慢做差价。';
    watches = '预设价格网格和当前价格落在哪一格。';
  } else if (/定投|定买|价值平均/.test(joined)) {
    summary = '它把买入节奏规则化，价格低或目标差距大时多买，价格高时少买。';
    watches = '当前市值和目标市值之间的差距。';
  } else if (/止盈|止损|委托|下单|条件/.test(joined)) {
    summary = '它把事先想好的买卖条件交给系统执行，减少临场犹豫。';
    watches = '你预设的触发价、止盈价、止损价或跟踪条件。';
  }

  const fallback = categoryCopy[category] || categoryCopy['资金管理'];

  return {
    summary,
    watches,
    fit: fallback.fit,
    caution: fallback.caution,
  };
}
```

- [ ] **Step 2: Add expanded state and toggle handlers**

Inside `StrategyLibraryTab`, add:

```javascript
const [expandedStrategy, setExpandedStrategy] = useState(null);

const toggleStrategy = (strategyKey) => {
  setExpandedStrategy((current) => (current === strategyKey ? null : strategyKey));
};

const handleStrategyKeyDown = (event, strategyKey) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleStrategy(strategyKey);
  }
};
```

- [ ] **Step 3: Render clickable cards and explanation panel**

In the `filtered.map`, derive:

```javascript
const strategyKey = `${s.category}-${s.name}-${i}`;
const isExpanded = expandedStrategy === strategyKey;
const explanation = getStrategyExplanation(s);
```

Add to the card root:

```jsx
data-testid="strategy-library-card"
role="button"
tabIndex={0}
aria-expanded={isExpanded}
aria-controls={`strategy-explanation-${i}`}
onClick={() => toggleStrategy(strategyKey)}
onKeyDown={(event) => handleStrategyKeyDown(event, strategyKey)}
```

Set `cursor: 'pointer'`.

Render below methods:

```jsx
<div style={{fontSize:10,color:isExpanded?'#a78bfa':'#64748b',marginTop:'auto'}}>
  {isExpanded ? '收起解释' : '点击查看解释'}
</div>
{isExpanded && (
  <div id={`strategy-explanation-${i}`} style={{borderTop:'1px solid rgba(148,163,184,0.12)',paddingTop:10,display:'grid',gap:8}}>
    {[
      ['一句话理解', explanation.summary],
      ['它在看什么', explanation.watches],
      ['适合什么时候', explanation.fit],
      ['要小心什么', explanation.caution],
    ].map(([label, text]) => (
      <div key={label}>
        <div style={{fontSize:10,color:'#60a5fa',marginBottom:3}}>{label}</div>
        <div style={{fontSize:11,lineHeight:1.6,color:'#cbd5e1'}}>{text}</div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Run lint/build**

Run:

```bash
npm run build
```

Expected: Vite build exits 0.

### Task 3: Verify In Browser

**Files:**
- No source changes expected.

- [ ] **Step 1: Start dev server**

Run from `client`:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 2: Run smoke test**

Run from `client`:

```bash
$env:BASE_URL='http://127.0.0.1:5173'; npm run smoke:strategy
```

Expected: exit 0 and prints `strategy explanation smoke test passed`.

- [ ] **Step 3: Capture screenshot**

Use Playwright or the existing screenshot tooling to capture the Strategy Library with one card expanded, saving under `client/output/playwright/strategy-explanation.png`.

Expected: one expanded card shows the four plain-language explanation labels without obvious overlap.
