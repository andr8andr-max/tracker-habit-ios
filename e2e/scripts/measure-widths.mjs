import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173';
const OWNER = { email: 'owner@club.local', password: 'owner12345' };

const PAGES = [
  ['Главная', '/'],
  ['Контакты', '/contacts'],
  ['Профиль', '/profile'],
  ['Уведомления', '/profile/notifications'],
  ['Настройки клуба', '/owner/club'],
  ['Сотрудники', '/owner/employees'],
];

const width = Number(process.argv[2] ?? 1440);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width, height: 1000 } });

await page.goto(`${BASE}/login`);
await page.getByPlaceholder('you@example.com').fill(OWNER.email);
await page.getByPlaceholder('••••••••').fill(OWNER.password);
await page.getByRole('button', { name: 'Войти', exact: true }).click();
await page.waitForURL(`${BASE}/`);

console.log(`--- viewport ${width}`);
for (const [name, path] of PAGES) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('networkidle');
  const m = await page.evaluate(() => {
    const main = document.querySelector('main');
    const cards = [...(main?.querySelectorAll('.card') ?? [])].slice(0, 4).map((e) => {
      const r = e.getBoundingClientRect();
      return `${Math.round(r.w ?? r.width)}x${Math.round(r.height)}@${Math.round(r.x)},${Math.round(r.y)}`;
    });
    return cards;
  });
  console.log(`${name.padEnd(18)} ${m.join('  ')}`);
}

await browser.close();
