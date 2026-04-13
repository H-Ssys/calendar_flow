import { chromium } from '@playwright/test';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://app.187.77.154.212.sslip.io/');
  await page.waitForLoadState('networkidle');
  
  const loginHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('login_dump.html', loginHtml);

  await page.fill('input[type="email"]', 'admin@flow.local');
  await page.fill('input[type="password"]', '123123Aa@');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000); 
  const dashboardHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('dashboard_dump.html', dashboardHtml);

  await browser.close();
})();
