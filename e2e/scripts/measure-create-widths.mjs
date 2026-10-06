import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173';
const OWNER = { email: 'owner@club.local', password: 'owner12345' };

const PAGES = [
  ['Профиль', '/profile'],
  ['Новая привычка', '/habits/new'],
  ['Новый контакт', '/contacts/new'],
  ['Уведомления', '/profile/notifications'],
  ['Контакты', '/contacts'],
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
    const wrapper = main?.firstElementChild;
    const wr = wrapper?.getBoundingClientRect();
    const cards = [...(main?.querySelectorAll('.card') ?? [])].slice(0, 3).map((e) => {
      const r = e.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.x)}`;
    });
    return `wrapper=${wr ? Math.round(wr.width) : 'n/a'}@${wr ? Math.round(wr.x) : 'n/a'}  cards: ${cards.join('  ')}`;
  });
  console.log(`${name.padEnd(18)} ${m}`);
}

await browser.close();
