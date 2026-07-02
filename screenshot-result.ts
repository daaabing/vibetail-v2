import { chromium, devices } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/drinks/12345');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '/mnt/documents/result-card-v2.png', fullPage: true });
  await browser.close();
})();
