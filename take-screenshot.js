const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to the app
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Click the right sidebar toggle button to hide it
  await page.click('button[title*="Hide Right Sidebar"]');
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: '/opt/lab/labcart/sidebar-hidden.png', fullPage: false });

  console.log('Screenshot saved to /opt/lab/labcart/sidebar-hidden.png');

  await browser.close();
})();
