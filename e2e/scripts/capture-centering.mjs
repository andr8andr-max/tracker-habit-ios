import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:5173';
const OWNER = { email: 'owner@club.local', password: 'owner12345' };
const OUT = 'screenshots/centering';

const PAGES = [
  ['1-glavnaya', '/'],
  ['2-privychki', '/habits'],
  ['3-kontakty', '/contacts'],
  ['4-profil', '/profile'],
  ['5-yvedomleniya', '/profile/notifications'],
  ['6-sotrudniki', '/owner/employees'],
  ['7-nastroiki-kluba', '/owner/club'],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`);
await page.getByPlaceholder('you@example.com').fill(OWNER.email);
await page.getByPlaceholder('••••••••').fill(OWNER.password);
await page.getByRole('button', { name: 'Войти', exact: true }).click();
await page.waitForURL(`${BASE}/`);

for (const [name, path] of PAGES) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const marks = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return `x=${Math.round(r.x)} w=${Math.round(r.width)}`;
    };
    const main = document.querySelector('main');
    return {
      topbar: pick(document.querySelector('header')),
      h1: pick(main?.querySelector('h1')),
      subtitle: pick(main?.querySelector('h1')?.parentElement?.querySelector('p')),
      card: pick(main?.querySelector('.card')),
      footer: pick(document.querySelector('footer')),
    };
  });
  console.log(
    `${name.padEnd(20)} topbar[${marks.topbar}] h1[${marks.h1}] subtitle[${marks.subtitle}] card[${marks.card}] footer[${marks.footer}]`,
  );
}

await browser.close();
