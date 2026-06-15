const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5173';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  try {
    await page.goto(`${baseUrl}/strategy`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /策略库/ }).click();
    await page.locator('[data-testid="strategy-library-card"]').first().click();
    await page.getByText('一句话理解').waitFor({ state: 'visible' });
    await page.screenshot({ path: 'output/playwright/strategy-explanation.png', fullPage: true });
    console.log('saved output/playwright/strategy-explanation.png');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
