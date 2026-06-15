const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5173';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  try {
    await page.goto(`${baseUrl}/stock`, { waitUntil: 'networkidle' });
    const select = page.locator('select').first();
    await select.waitFor({ state: 'visible' });

    const firstValue = await select.locator('option').evaluateAll((items) =>
      items.map((item) => item.value).find(Boolean)
    );
    if (!firstValue) throw new Error('No holding option found');

    await select.selectOption(firstValue);
    await page.waitForResponse((res) => res.url().includes('/api/market/kline/') && res.url().includes('period=day'));
    await page.getByRole('button', { name: /周K/ }).click();
    await page.waitForResponse((res) => res.url().includes('/api/market/kline/') && res.url().includes('period=week'));
    await page.screenshot({ path: 'output/playwright/kline-week.png', fullPage: true });
    await page.getByRole('button', { name: /月K/ }).click();
    await page.waitForResponse((res) => res.url().includes('/api/market/kline/') && res.url().includes('period=month'));
    await page.screenshot({ path: 'output/playwright/kline-month.png', fullPage: true });

    console.log('saved output/playwright/kline-week.png and output/playwright/kline-month.png');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
