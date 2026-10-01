const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const filePath = 'file://' + path.resolve('ir-deck-2.html');
  await page.goto(filePath, { waitUntil: 'networkidle' });
  
  const slidesCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log('Total slides:', slidesCount);

  let anyOverflow = false;

  for (let i = 0; i < slidesCount; i++) {
    await page.evaluate((idx) => {
      const slides = document.querySelectorAll('.slide');
      slides.forEach((s, idx2) => {
        const active = idx === idx2;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
    }, i);
    await page.waitForTimeout(200);

    const metrics = await page.evaluate((idx) => {
      const s = document.querySelectorAll('.slide')[idx];
      return {
        id: s.id,
        scrollHeight: s.scrollHeight,
        clientHeight: s.clientHeight,
        hasOverflow: s.scrollHeight > s.clientHeight
      };
    }, i);

    if (metrics.hasOverflow) {
      anyOverflow = true;
      console.warn(`[OVERFLOW WARNING] Slide ${i+1} (${metrics.id}): scrollHeight=${metrics.scrollHeight} > clientHeight=${metrics.clientHeight}`);
    } else {
      console.log(`[PASS] Slide ${i+1} (${metrics.id}): scrollHeight=${metrics.scrollHeight}, clientHeight=${metrics.clientHeight}`);
    }

    const slideNum = String(i + 1).padStart(2, '0');
    const outPath = path.resolve(`public/images/landing/slide-v2-${slideNum}.png`);
    await page.screenshot({ path: outPath });
  }

  await browser.close();
  if (anyOverflow) {
    console.error('FAILED: Some slides have vertical overflow!');
    process.exit(1);
  } else {
    console.log('SUCCESS: All 8 slides passed with 0 overflow and screenshots saved.');
    process.exit(0);
  }
})();
