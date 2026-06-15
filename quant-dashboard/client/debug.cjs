const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
  
  const menuItems = await page.$$('.menu-item');
  for (const item of menuItems) {
    const text = await item.textContent();
    if (text && text.includes('策略')) {
      await item.click();
      break;
    }
  }
  
  await page.waitForTimeout(3000);
  
  console.log('PAGE ERRORS:', JSON.stringify(errors, null, 2));
  
  await page.screenshot({ path: 'D:/Desktop/quantify/quant-dashboard/client/strategy-screenshot.png', fullPage: false });
  console.log('Screenshot saved.');
  
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 800));
  console.log('BODY TEXT:', bodyText);
  
  await browser.close();
})().catch(e => {
  console.error('SCRIPT ERROR:', e.message);
  process.exit(1);
});
