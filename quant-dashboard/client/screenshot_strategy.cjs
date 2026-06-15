const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // Click the strategy link in the sidebar
  const strategyLink = page.locator('text=策略推荐').first();
  await strategyLink.click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'D:\\Desktop\\quantify\\strategy_page.png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved');
})();
