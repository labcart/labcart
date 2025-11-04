const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to the app
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);

  // Take screenshot of current state
  await page.screenshot({ path: '/opt/lab/labcart/current-state.png', fullPage: true });

  console.log('Screenshot saved to /opt/lab/labcart/current-state.png');

  await browser.close();
})();
