const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Get detailed info about toggle buttons
  const buttonInfo = await page.evaluate(() => {
    const tabBar = document.querySelector('.flex.items-center.gap-1.py-1.border-b');
    const toggleContainer = tabBar?.querySelector('.flex.items-center.gap-1.pr-2');
    const buttons = toggleContainer?.querySelectorAll('button');

    const getComputedInfo = (el) => {
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        },
        styles: {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          position: styles.position,
          zIndex: styles.zIndex,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          width: styles.width,
          height: styles.height
        },
        html: el.outerHTML,
        hasIcon: el.querySelector('svg') !== null,
        iconInfo: el.querySelector('svg') ? {
          width: el.querySelector('svg').getAttribute('width'),
          height: el.querySelector('svg').getAttribute('height'),
          size: el.querySelector('svg').getAttribute('size'),
          viewBox: el.querySelector('svg').getAttribute('viewBox')
        } : null
      };
    };

    return {
      tabBar: getComputedInfo(tabBar),
      toggleContainer: getComputedInfo(toggleContainer),
      button1: buttons?.[0] ? getComputedInfo(buttons[0]) : null,
      button2: buttons?.[1] ? getComputedInfo(buttons[1]) : null,
      buttonCount: buttons?.length || 0
    };
  });

  console.log('=== TOGGLE BUTTONS DIAGNOSTIC ===\n');
  console.log(JSON.stringify(buttonInfo, null, 2));

  // Take a full screenshot
  await page.screenshot({ path: '/opt/lab/labcart/full-page.png', fullPage: false });

  // Take a zoomed screenshot of just the tab bar area
  const tabBarRect = buttonInfo.tabBar?.rect;
  if (tabBarRect) {
    await page.screenshot({
      path: '/opt/lab/labcart/tab-bar-zoomed.png',
      clip: {
        x: Math.max(0, tabBarRect.x),
        y: Math.max(0, tabBarRect.y),
        width: Math.min(tabBarRect.width, 1280),
        height: tabBarRect.height
      }
    });
  }

  await browser.close();
})();
