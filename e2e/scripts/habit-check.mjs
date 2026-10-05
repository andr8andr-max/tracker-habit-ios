import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

await page.goto('http://127.0.0.1:5173/login');
await page.getByPlaceholder('you@example.com').fill('owner@club.local');
await page.getByPlaceholder('••••••••').fill('owner12345');
await page.getByRole('button', { name: 'Войти', exact: true }).click();
await page.waitForURL('http://127.0.0.1:5173/');
await page.goto('http://127.0.0.1:5173/habits');
await page.waitForLoadState('networkidle');

const cards = await page.$$eval('main .grid .card', (els) =>
  els.map((e) => {
    const r = e.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      title: (e.querySelector('a')?.textContent ?? '').slice(0, 25),
    };
  }),
);
console.log(JSON.stringify(cards, null, 1));

await page.screenshot({ path: 'screenshots/habits-check.png', fullPage: true });
await browser.close();
