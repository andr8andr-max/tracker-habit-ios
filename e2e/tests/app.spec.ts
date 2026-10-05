import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173';
const OWNER = { email: 'owner@club.local', password: 'owner12345' };

type Habit = { id: string; title: string };
type Contact = { id: string; name: string };

async function apiLogin(request: APIRequestContext, user: { email: string; password: string }) {
  const res = await request.post('/api/auth/login', { data: user });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  return body.accessToken as string;
}

async function apiGet<T>(request: APIRequestContext, path: string, accessToken: string): Promise<T> {
  const res = await request.get(path, { headers: { Authorization: `Bearer ${accessToken}` } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as T;
}

async function uiLogin(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(user.email);
  await page.getByPlaceholder('••••••••').fill(user.password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(`${BASE}/`);
}

async function expectNoHorizontalScroll(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    win: window.innerWidth,
  }));
  expect(metrics.doc, `горизонтальный скролл: ${label}`).toBeLessThanOrEqual(metrics.win + 1);
  expect(metrics.body, `горизонтальный скролл body: ${label}`).toBeLessThanOrEqual(metrics.win + 1);
}

test.describe('владелец', () => {
  test('вход и все 12 страниц открываются', async ({ page, request }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
    await expectNoHorizontalScroll(page, '/login');
    await page.screenshot({ path: 'screenshots/00-login.png', fullPage: true });

    const access = await apiLogin(request, OWNER);
    const habits = await apiGet<Habit[]>(request, '/api/habits', access);
    const contacts = await apiGet<Contact[]>(request, '/api/contacts', access);
    expect(habits.length).toBeGreaterThan(0);
    expect(contacts.length).toBeGreaterThan(0);

    await uiLogin(page, OWNER);

    const routes: Array<{ path: string; expect: string }> = [
      { path: '/', expect: 'Привет,' },
      { path: '/habits', expect: 'Привычки' },
      { path: '/habits/new', expect: 'Новая привычка' },
      { path: `/habits/${habits[0].id}`, expect: habits[0].title },
      { path: '/contacts', expect: 'Контакты' },
      { path: '/contacts/new', expect: 'Новый контакт' },
      { path: `/contacts/${contacts[0].id}`, expect: contacts[0].name },
      { path: '/profile', expect: 'Профиль' },
      { path: '/profile/notifications', expect: 'Уведомления' },
      { path: '/owner/employees', expect: 'Сотрудники' },
      { path: '/owner/club', expect: 'Настройки клуба' },
    ];

    for (const [index, route] of routes.entries()) {
      await page.goto(route.path);
      await expect(page.getByText(route.expect).first()).toBeVisible();
      await expectNoHorizontalScroll(page, route.path);
      await page.screenshot({
        path: `screenshots/${String(index + 1).padStart(2, '0')}-${route.path.replace(/\//g, '_') || 'root'}.png`,
        fullPage: true,
      });
    }

    await page.goto('/login');
    await expect(page).toHaveURL(`${BASE}/`);
  });

  test('навигация по меню — SPA без перезагрузки', async ({ page }) => {
    await uiLogin(page, OWNER);
    await page.evaluate(() => {
      (window as unknown as { __SPA_MARKER__?: string }).__SPA_MARKER__ = 'alive';
    });

    const sidebar = page.locator('aside');
    const items = ['Привычки', 'Контакты', 'Профиль', 'Уведомления', 'Сотрудники', 'Настройки клуба', 'Главная'];
    for (const label of items) {
      await sidebar.getByRole('link', { name: label, exact: true }).click();
      const marker = await page.evaluate(
        () => (window as unknown as { __SPA_MARKER__?: string }).__SPA_MARKER__,
      );
      expect(marker, `страница ${label} перезагрузилась`).toBe('alive');
    }
    await expect(page).toHaveURL(`${BASE}/`);
  });

  test('создание привычки и отметка «выполнено»', async ({ page, request }) => {
    const access = await apiLogin(request, OWNER);
    const title = `E2E привычка ${Date.now()}`;

    await uiLogin(page, OWNER);
    await page.goto('/habits/new');
    await page.getByPlaceholder('Например, Медитация').fill(title);
    await page.getByRole('button', { name: 'Создать привычку' }).click();
    await expect(page).toHaveURL(/\/habits\/[0-9a-f-]{36}$/);
    const habitId = page.url().split('/').pop() as string;

    await page.goto('/habits');
    const checkbox = page.getByRole('checkbox', { name: `Отметить «${title}» выполненной` });
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await expect(page.getByText(/Выполнено \d+ из \d+/)).toBeVisible();

    const del = await request.delete(`/api/habits/${habitId}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    expect(del.status()).toBe(201);
  });

  test('поиск контактов фильтруется с задержкой 200 мс', async ({ page }) => {
    await uiLogin(page, OWNER);
    await page.goto('/contacts');
    await expect(page.getByLabel('Поиск контактов')).toBeVisible();
    await page.waitForTimeout(300);

    const hits: number[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/contacts?') && req.url().includes('q=')) hits.push(Date.now());
    });

    const input = page.getByLabel('Поиск контактов');
    await input.type('Анна', { delay: 30 });
    await page.waitForTimeout(900);

    expect(hits.length, 'поиск должен дебаунситься в один запрос').toBeLessThanOrEqual(2);
    for (let i = 1; i < hits.length; i += 1) {
      expect(hits[i] - hits[i - 1]).toBeGreaterThanOrEqual(190);
    }
    await expect(page.getByText(/Анна/).first()).toBeVisible();
  });

  test('смена пароля открывает новую сессию, старые отозваны', async ({ page, request }) => {
    const ownerToken = await apiLogin(request, OWNER);
    const otherSession = await request.post('/api/auth/login', { data: OWNER });
    expect(otherSession.ok()).toBeTruthy();
    const otherRefresh = (await otherSession.json()).refreshToken as string;

    const temporaryPassword = `Temp-${Date.now()}`;
    await uiLogin(page, OWNER);
    await page.goto('/profile');
    try {
      await page.getByLabel('Текущий пароль').fill(OWNER.password);
      await page.getByLabel('Новый пароль', { exact: true }).fill(temporaryPassword);
      await page.getByLabel('Повторите новый пароль').fill(temporaryPassword);
      await page.getByRole('button', { name: 'Сменить пароль' }).click();
      await expect(page.getByText(/Пароль изменён/).first()).toBeVisible();
      await expect(page.getByText(/Не удалось сменить пароль/)).toHaveCount(0);

      const revoked = await request.post('/api/auth/refresh', { data: { refreshToken: otherRefresh } });
      expect(revoked.status()).toBe(401);
    } finally {
      let restore = await request.patch('/api/profile/password', {
        headers: { Authorization: `Bearer ${ownerToken}` },
        data: { currentPassword: temporaryPassword, newPassword: OWNER.password },
      });
      if (![200, 201].includes(restore.status())) {
        restore = await request.patch('/api/profile/password', {
          headers: { Authorization: `Bearer ${ownerToken}` },
          data: { currentPassword: OWNER.password, newPassword: OWNER.password },
        });
      }
      expect([200, 201]).toContain(restore.status());
    }
  });
});

test.describe('сотрудник', () => {
  test('не видит owner-разделы и не может в них войти', async ({ page, request }) => {
    const ownerToken = await apiLogin(request, OWNER);
    const email = `e2e.employee.${Date.now()}@club.local`;
    const created = await request.post('/api/owner/employees', {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { email, password: 'employee12345', name: 'E2E Сотрудник' },
    });
    expect(created.status()).toBe(201);
    const employee = (await created.json()) as { id: string; email: string };

    try {
      await uiLogin(page, { email: employee.email, password: 'employee12345' });

      const sidebar = page.locator('aside');
      await expect(sidebar.getByRole('link', { name: 'Сотрудники' })).toHaveCount(0);
      await expect(sidebar.getByRole('link', { name: 'Настройки клуба' })).toHaveCount(0);
      await expect(sidebar.getByRole('link', { name: 'Привычки' })).toHaveCount(1);

      await page.goto('/owner/employees');
      await expect(page).toHaveURL(`${BASE}/`);
      await page.goto('/owner/club');
      await expect(page).toHaveURL(`${BASE}/`);

      await expectNoHorizontalScroll(page, 'employee /');
    } finally {
      await request.delete(`/api/owner/employees/${employee.id}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
    }
  });
});

test.describe('мобильная версия 375px', () => {
  test('без горизонтального скролла + бургер-меню', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await uiLogin(page, OWNER);

    const access = await apiLogin(page.request, OWNER);
    const habits = await apiGet<Habit[]>(page.request, '/api/habits', access);
    const contacts = await apiGet<Contact[]>(page.request, '/api/contacts', access);

    const routes = [
      '/',
      '/habits',
      '/habits/new',
      `/habits/${habits[0].id}`,
      '/contacts',
      '/contacts/new',
      `/contacts/${contacts[0].id}`,
      '/profile',
      '/profile/notifications',
      '/owner/employees',
      '/owner/club',
    ];

    for (const path of routes) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalScroll(page, `mobile ${path}`);
    }
    await page.screenshot({ path: 'screenshots/mobile-owner-club.png', fullPage: true });

    await page.goto('/');
    const burger = page.getByRole('button', { name: /открыть меню/i });
    await burger.click();
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expectNoHorizontalScroll(page, 'mobile sidebar open');
    await sidebar.getByRole('link', { name: 'Привычки', exact: true }).click();
    await expect(page).toHaveURL(`${BASE}/habits`);
    await expect
      .poll(async () => {
        const box = await sidebar.boundingBox();
        return box ? box.x + box.width <= 0 : true;
      }, 'боковое меню должно уехать за левый край')
      .toBe(true);
    await expectNoHorizontalScroll(page, 'mobile after nav');
  });
});
