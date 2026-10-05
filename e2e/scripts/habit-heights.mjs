import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function login(page) {
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByPlaceholder('you@example.com').fill('owner@club.local');
  await page.getByPlaceholder('••••••••').fill('owner12345');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.waitForURL('http://127.0.0.1:5173/');
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await login(desktop);
await desktop.goto('http://127.0.0.1:5173/habits');
await desktop.waitForLoadState('networkidle');

const cards = await desktop.$$eval('main .grid .card', (els) =>
  els.map((e) => {
    const r = e.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      h: Math.round(r.height),
      title: (e.querySelector('a')?.textContent ?? '').slice(0, 30),
    };
  }),
);

const byColumn = { left: [], right: [] };
for (const c of cards) (c.x < 720 ? byColumn.left : byColumn.right).push(c);
console.log('DESKTOP 1440');
for (const [name, col] of Object.entries(byColumn)) {
  const gaps = col.slice(1).map((c, i) => c.y - (col[i].y + col[i].h));
  console.log(
    ` ${name}: ${col.map((c) => `${c.title}(${c.h}px)`).join(' | ')}`,
    ` gaps: ${gaps.length ? gaps.join(', ') : '—'}`,
  );
}
await desktop.screenshot({ path: 'screenshots/habits-columns.png', fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 375, height: 800 } });
await login(mobile);
await mobile.goto('http://127.0.0.1:5173/habits');
await mobile.waitForLoadState('networkidle');
const order = await mobile.$$eval('main .grid .card a', (els) =>
  els.map((e) => (e.textContent ?? '').slice(0, 30)),
);
console.log('MOBILE 375 order:', order.join(' | '));

await browser.close();
