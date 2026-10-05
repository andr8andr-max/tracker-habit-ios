import { chromium } from '@playwright/test';

const HABIT_ID = process.argv[2] ?? '7c4d2837-f7fb-491d-a289-fee7a8509102';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto('http://127.0.0.1:5173/login');
await page.getByPlaceholder('you@example.com').fill('owner@club.local');
await page.getByPlaceholder('••••••••').fill('owner12345');
await page.getByRole('button', { name: 'Войти', exact: true }).click();
await page.waitForURL('http://127.0.0.1:5173/');
await page.goto(`http://127.0.0.1:5173/habits/${HABIT_ID}`);
await page.waitForLoadState('networkidle');

const polylines = await page.$$eval('svg polyline', (els) =>
  els.map((e) => (e.getAttribute('points') ?? '').split(' ').filter(Boolean).length),
);
const dots = await page.$$eval('svg circle', (els) =>
  els.filter((e) => e.getAttribute('r') !== '0').length,
);
console.log(`polylines: ${JSON.stringify(polylines)}  visible dots: ${dots}`);

await page
  .locator('svg[aria-label*="График"]')
  .first()
  .screenshot({ path: 'screenshots/gym-chart.png' });
await browser.close();
