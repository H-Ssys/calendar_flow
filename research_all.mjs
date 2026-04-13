import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'extracted_ui');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR);
}

const dump = async (page, name) => {
  await page.waitForTimeout(2000);
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.html`), html);
  console.log(`Saved ${name}.html`);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://app.187.77.154.212.sslip.io/');
  await page.waitForLoadState('networkidle');
  
  // Login
  await page.fill('input[type="email"]', 'admin@flow.local');
  await page.fill('input[type="password"]', '123123Aa@');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000); 
  
  // Modals can get stuck, so we refresh between major actions if needed
  await page.click('button:has-text("Availability")', { force: true });
  await dump(page, '07_availability_modal');

  // Reload to clear modals
  await page.reload();
  await page.waitForTimeout(3000);

  // Navigations
  await page.click('nav button:has-text("Event / Task")');
  await dump(page, '08_event_task_page');

  await page.click('nav button:has-text("Notes")');
  await dump(page, '09_notes_page');

  await page.click('nav button:has-text("Smart Contacts")');
  await dump(page, '10_smart_contacts_page');

  await page.click('nav button:has-text("Team")');
  await dump(page, '11_team_page');

  await browser.close();
  console.log('All extractions complete.');
})();
