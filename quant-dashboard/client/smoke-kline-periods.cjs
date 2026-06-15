const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5175';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const periodsSeen = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/market/kline/')) {
      const parsed = new URL(url);
      periodsSeen.push(parsed.searchParams.get('period'));
    }
  });

  try {
    await page.goto(`${baseUrl}/stock`, { waitUntil: 'networkidle' });
    const select = page.locator('select').first();
    await select.waitFor({ state: 'visible' });

    const options = await select.locator('option').evaluateAll((items) =>
      items.map((item) => item.value).filter(Boolean)
    );
    if (!options.length) {
      throw new Error('No holdings available for K-line period smoke test');
    }

    await select.selectOption(options[0]);
    await page.waitForResponse((res) => res.url().includes('/api/market/kline/') && res.url().includes('period=day'));

    await page.getByRole('button', { name: /周K/ }).click();
    await page.waitForResponse((res) => res.url().includes('/api/market/kline/') && res.url().includes('period=week'));

    await page.getByRole('button', { name: /月K/ }).click();
    await page.waitForResponse((res) => res.url().includes('/api/market/kline/') && res.url().includes('period=month'));

    for (const period of ['day', 'week', 'month']) {
      if (!periodsSeen.includes(period)) {
        throw new Error(`Expected ${period} request, saw ${periodsSeen.join(', ')}`);
      }
    }

    console.log(`kline period smoke test passed: ${periodsSeen.join(', ')}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
