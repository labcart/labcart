const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(`Page error: ${error.message}`);
  });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);

  console.log('Console errors:', errors);

  // Check if elements exist
  const tabBar = await page.$('div.flex.items-center.gap-1.py-1.border-b');
  const leftSidebarIcons = await page.$('div.flex.items-center.gap-1.px-3.py-2.border-b');

  console.log('Tab bar exists:', !!tabBar);
  console.log('Left sidebar icons exist:', !!leftSidebarIcons);

  await browser.close();
})();
