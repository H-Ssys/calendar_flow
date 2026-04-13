import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'extracted_ui_details');
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

  // 1. Settings
  // Usually Settings is a button or accessible via User dropdown/avatar
  try {
    await page.click('button:has(.lucide-settings), button:has-text("Settings"), button[title="Settings"]', { timeout: 3000 });
    await dump(page, '12_settings_modal');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log("Could not find Settings via direct click");
  }

  // 2. Events & Tasks
  await page.click('nav button:has-text("Event / Task")');
  await page.waitForTimeout(2000);

  // Add Task
  try {
    await page.click('button:has-text("Add Task")', { timeout: 3000 });
    await dump(page, '13_add_task_modal');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  } catch (e) { console.log("Could not find Add Task"); }

  // Task / Event Details (assume we can click the first existing item block if any)
  try {
    // Click on the first element that looks like a task or event card
    await page.click('.task-card, .event-card, [role="button"]:not(nav button)', { timeout: 3000 });
    await dump(page, '14_detail_view');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  } catch (e) { console.log("Could not trigger detail view"); }

  // 3. Smart Contacts
  await page.click('nav button:has-text("Smart Contacts")');
  await page.waitForTimeout(2000);

  // Add Contact
  try {
    await page.click('button:has-text("Add Contact"), button:has-text("New Contact")', { timeout: 3000 });
    await dump(page, '15_add_contact_modal');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  } catch (e) { console.log("Could not find Add Contact"); }

  // Upload/Batch Upload
  try {
    // It could be a dropdown menu, check for generic upload text
    await page.click('button:has-text("Upload"), button:has-text("Import")', { timeout: 3000 });
    await dump(page, '16_upload_contact_modal');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  } catch (e) { console.log("Could not find Upload Contact"); }

  // Contact Detail
  try {
    // Click table row or contact card
    await page.click('tbody tr:first-child, .contact-card', { timeout: 3000 });
    await dump(page, '17_contact_details_modal');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  } catch (e) { console.log("Could not find Contact Details"); }

  await browser.close();
  console.log('Detail extractions complete.');
})();
