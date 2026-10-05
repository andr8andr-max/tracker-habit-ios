const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || 'owner@club.local';
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD || 'owner12345';
const API = process.env.API_URL || 'http://127.0.0.1:4000/api';

function moscowTime(offsetMinutes = 0) {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour').value;
  const minute = parts.find((part) => part.type === 'minute').value;
  return `${hour}:${minute}`;
}

async function call(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${text}`);
  }
  return body;
}

(async () => {
  const login = await call('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
  });
  const headers = { Authorization: `Bearer ${login.accessToken}` };

  const remindAt = moscowTime(2);
  const habit = await call('/habits', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `Cron-проверка ${remindAt}`,
      targetCount: 1,
      schedule: { days: [0, 1, 2, 3, 4, 5, 6] },
      notificationsEnabled: true,
      remindAt,
    }),
  });
  console.log(`CREATED habit=${habit.id} remindAt=${remindAt} (Moscow, now=${moscowTime()})`);

  const subscription = await call('/profile/push/subscribe', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      endpoint: 'http://127.0.0.1:9/push/e2e-probe',
      keys: { p256dh: 'x', auth: 'y' },
    }),
  });
  console.log('SUBSCRIBED probe:', JSON.stringify(subscription));

  const waitMs = 165_000;
  console.log(`waiting ${Math.round(waitMs / 1000)}s for cron tick at ${remindAt}...`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const list = await call('/habits', { headers });
  const found = list.find((item) => item.id === habit.id);
  console.log('habit after wait:', JSON.stringify(found?.today ?? null));

  await call(`/habits/${habit.id}`, { method: 'DELETE', headers });
  await call('/profile/push/subscribe', { method: 'DELETE', headers });
  console.log('CLEANED UP');
})().catch((error) => {
  console.error('FAILED:', error.message);
  process.exit(1);
});
