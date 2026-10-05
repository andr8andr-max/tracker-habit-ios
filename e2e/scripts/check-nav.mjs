import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://127.0.0.1:5173/login');
await page.getByPlaceholder('you@example.com').fill('owner@club.local');
await page.getByPlaceholder('••••••••').fill('owner12345');
await page.getByRole('button', { name: 'Войти', exact: true }).click();
await page.waitForURL('http://127.0.0.1:5173/');

for (const url of ['/profile', '/profile/notifications']) {
  await page.goto(`http://127.0.0.1:5173${url}`);
  await page.waitForLoadState('networkidle');
  const active = await page.$$eval('aside nav a', (as) =>
    as
      .filter((a) => a.getAttribute('aria-current') === 'page' || a.className.includes('bg-brand-600'))
      .map((a) => a.textContent.trim()),
  );
  const toNotif = await page.locator('main a[href="/profile/notifications"]').count();
  const toProfile = await page.locator('main a[href="/profile"]').count();
  console.log(
    `${url} | active: [${active.join(', ')}] | linksToNotifInMain: ${toNotif} | linksToProfileInMain: ${toProfile}`,
  );
}

await browser.close();
