import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173';
const OWNER = { email: 'owner@club.local', password: 'owner12345' };

const PAGES = [
  ['Главная', '/'],
  ['Привычки', '/habits'],
  ['Контакты', '/contacts'],
  ['Профиль', '/profile'],
  ['Уведомления', '/profile/notifications'],
  ['Сотрудники', '/owner/employees'],
  ['Настройки клуба', '/owner/club'],
];

const width = Number(process.argv[2] ?? 1440);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 } });

await page.goto(`${BASE}/login`);
await page.getByPlaceholder('you@example.com').fill(OWNER.email);
await page.getByPlaceholder('••••••••').fill(OWNER.password);
await page.getByRole('button', { name: 'Войти', exact: true }).click();
await page.waitForURL(`${BASE}/`);

console.log(`viewport ${width}  innerWidth=${await page.evaluate(() => window.innerWidth)} clientWidth=${await page.evaluate(() => document.documentElement.clientWidth)}`);
console.log('tab'.padEnd(18), 'scrollY?', 'docH', 'topbar', 'h1', 'card', 'footer');

for (const [name, path] of PAGES) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');
  const m = await page.evaluate(() => {
    const x = (el) => (el ? Math.round(el.getBoundingClientRect().x) : null);
    const main = document.querySelector('main');
    return {
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
      overflowY: document.documentElement.scrollHeight > window.innerHeight,
      topbar: x(document.querySelector('header p')),
      h1: x(main?.querySelector('h1')),
      card: x(main?.querySelector('.card')),
      footer: x(document.querySelector('footer')),
      sidebarRight: Math.round(
        (document.querySelector('aside') ?? { getBoundingClientRect: () => ({ right: 256 }) })
          .getBoundingClientRect().right,
      ),
    };
  });
  console.log(
    name.padEnd(18),
    `topbar=${m.topbar} h1=${m.h1} card=${m.card} footer=${m.footer} sidebarRight=${m.sidebarRight} docH=${m.docH} overflowY=${m.overflowY}`,
  );
}

await browser.close();
