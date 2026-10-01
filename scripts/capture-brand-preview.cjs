const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  const filePath = 'file://' + path.resolve('assets/brand/brand-preview.html');
  await page.goto(filePath, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'assets/brand/brand-preview.png', fullPage: true });
  await browser.close();
  console.log('Saved assets/brand/brand-preview.png');
})();
