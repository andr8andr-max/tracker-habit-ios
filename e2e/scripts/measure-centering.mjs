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

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`);
await page.getByPlaceholder('you@example.com').fill(OWNER.email);
await page.getByPlaceholder('••••••••').fill(OWNER.password);
await page.getByRole('button', { name: 'Войти', exact: true }).click();
await page.waitForURL(`${BASE}/`);

for (const [label, path] of PAGES) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');
  const data = await page.evaluate(() => {
    const main = document.querySelector('main');
    const root = main?.firstElementChild;
    const h1 = main?.querySelector('h1');
    const card = main?.querySelector('.card');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right) };
    };
    return {
      main: rect(main),
      root: rect(root),
      rootClass: root?.className ?? '',
      h1: rect(h1),
      card: rect(card),
      vw: window.innerWidth,
    };
  });
  const rightGap = data.main ? data.main.right - (data.root?.right ?? 0) : 0;
  const leftGap = data.main && data.root ? data.root.x - data.main.x : 0;
  console.log(
    `${label.padEnd(18)} main[${data.main?.x}..${data.main?.right}] root x=${data.root?.x} w=${data.root?.w} leftGap=${leftGap} rightGap=${rightGap} h1x=${data.h1?.x} cardx=${data.card?.x}`,
  );
}

await browser.close();
