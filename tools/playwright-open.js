const path = require('path');
const fs = require('fs');

async function main() {
  const { chromium } = require('playwright');

  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node tools/playwright-open.js <url>');
    process.exit(2);
  }

  const userDataDir = path.resolve(process.cwd(), '.playwright-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
  });

  const pages = context.pages();
  const page = pages.length ? pages[0] : await context.newPage();

  page.on('pageerror', (err) => {
    console.error('PAGEERROR', err && err.message ? err.message : String(err));
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log('PLAYWRIGHT_OPENED', url);

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('PLAYWRIGHT_FAILED', err && err.message ? err.message : String(err));
  process.exit(1);
});
