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

const browser = await chromium.launch({ channel: 'msedge', headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`);
await page.getByPlaceholder('you@example.com').fill(OWNER.email);
await page.getByPlaceholder('••••••••').fill(OWNER.password);
await page.getByRole('button', { name: 'Войти', exact: true }).click();
await page.waitForURL(`${BASE}/`);

for (const [name, path] of PAGES) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');
  const m = await page.evaluate(() => {
    const main = document.querySelector('main');
    const x = (el) => (el ? Math.round(el.getBoundingClientRect().x) : null);
    return {
      inner: window.innerWidth,
      client: document.documentElement.clientWidth,
      topbar: x(document.querySelector('header p')),
      h1: x(main?.querySelector('h1')),
      card: x(main?.querySelector('.card')),
      overflow: document.documentElement.scrollHeight > window.innerHeight,
    };
  });
  console.log(
    `${name.padEnd(18)} inner=${m.inner} client=${m.client} sb=${m.inner - m.client} topbar=${m.topbar} h1=${m.h1} card=${m.card} overflow=${m.overflow}`,
  );
}

await browser.close();
