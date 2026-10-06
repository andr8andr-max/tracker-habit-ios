import { chromium } from 'playwright';

const url = process.env.APP_URL || 'http://127.0.0.1:5173';
const expectBootstrap = process.env.BOOTSTRAP === '1';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle' });

const tabs = await page.locator('button', { hasText: 'Первый аккаунт' }).count();
const footer = await page.locator('button', { hasText: 'Создать первый аккаунт' }).count();
const loginTab = await page.locator('button', { hasText: 'Вход' }).count();

console.log(JSON.stringify({ tabs, footer, loginTab, expectBootstrap }, null, 2));

const ok =
  loginTab === 1 &&
  (expectBootstrap ? tabs === 1 && footer === 1 : tabs === 0 && footer === 0);

await browser.close();
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
