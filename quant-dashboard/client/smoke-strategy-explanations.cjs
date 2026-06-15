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
