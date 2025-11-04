const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Check viewport and body dimensions
  const dimensions = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      body: {
        scrollHeight: body.scrollHeight,
        clientHeight: body.clientHeight,
        offsetHeight: body.offsetHeight
      },
      html: {
        scrollHeight: html.scrollHeight,
        clientHeight: html.clientHeight
      },
      leftSidebarIconBar: document.querySelector('.flex.items-center.gap-1.px-3.py-2.border-b')?.getBoundingClientRect(),
      tabBar: document.querySelector('div.flex.items-center.gap-1.py-1.border-b')?.getBoundingClientRect()
    };
  });

  console.log(JSON.stringify(dimensions, null, 2));

  await browser.close();
})();
