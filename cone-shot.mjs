const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  await page.locator('text=量化分析').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'D:/Desktop/quantify/quant-dashboard/client/cone-verify-2.png', fullPage: true });
  console.log('Done - screenshot saved');
  await browser.close();
})();
