const BASE = process.env.BASE_URL || 'http://localhost:4000/api';
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || 'owner@club.local';
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD || 'owner12345';

let failures = 0;
const log = (...args) => console.log(...args);

async function req(method, path, options = {}) {
  const { token, body } = options;
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function check(name, res, expected, extra) {
  const list = Array.isArray(expected) ? expected : [expected];
  const ok = list.includes(res.status) && (extra ? Boolean(extra(res.data)) : true);
  if (ok) {
    log(`  ok: ${name} -> ${res.status}`);
  } else {
    failures += 1;
    log(`  FAIL: ${name} -> expected ${list.join('|')}, got ${res.status}`);
    log(`        body: ${JSON.stringify(res.data)}`);
    if (extra) log('        extra check failed');
  }
  return ok;
}

function fail(name, message) {
  failures += 1;
  log(`  FAIL: ${name} -> ${message}`);
}

const EMPLOYEE_EMAIL = 'smoke.employee@club.local';
const EMPLOYEE_PASSWORD = 'employee12345';
const THROWAWAY_EMAIL = 'smoke.throwaway@club.local';

async function login(email, password) {
  const res = await req('POST', '/auth/login', { body: { email, password } });
  if (res.status !== 201) {
    throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

async function main() {
  log(`SMOKE base: ${BASE}`);

  const health = await req('GET', '/health');
  check('GET /health', health, 200, d => d?.status === 'ok');

  let ownerTokens = null;
  let bootstrapUsed = false;
  let ownerPassword = OWNER_PASSWORD;
  const register = await req('POST', '/auth/register', {
    body: {
      email: 'smoke.bootstrap@club.local',
      password: 'bootstrap12345',
      name: 'Smoke Bootstrap',
    },
  });
  if (register.status === 201) {
    bootstrapUsed = true;
    ownerPassword = 'bootstrap12345';
    check('POST /auth/register (bootstrap)', register, 201, d => d?.role === 'owner');
    ownerTokens = await login('smoke.bootstrap@club.local', ownerPassword);
    log('  bootstrap: registered fresh owner');
  } else if (register.status === 401) {
    log('  bootstrap: skipped (users already exist, logging in as seeded owner)');
    check('POST /auth/register (no token, users exist -> 401)', register, 401);
    ownerTokens = await login(OWNER_EMAIL, OWNER_PASSWORD);
  } else {
    check('POST /auth/register (bootstrap)', register, [201, 401]);
    ownerTokens = await login(OWNER_EMAIL, OWNER_PASSWORD);
  }

  let owner = ownerTokens.user;
  let accessToken = ownerTokens.accessToken;
  let refreshToken = ownerTokens.refreshToken;
  log(`  owner: ${owner.email} (${owner.role})`);

  const refreshed = await req('POST', '/auth/refresh', { body: { refreshToken } });
  check('POST /auth/refresh', refreshed, 201, d => Boolean(d?.accessToken && d?.refreshToken && d?.user));
  if (refreshed.status === 201) {
    const reused = await req('POST', '/auth/refresh', { body: { refreshToken } });
    check('POST /auth/refresh with rotated (old) token -> 401', reused, 401);
    accessToken = refreshed.data.accessToken;
    refreshToken = refreshed.data.refreshToken;
    owner = refreshed.data.user;
  }

  const wrongLogin = await req('POST', '/auth/login', { body: { email: owner.email, password: 'definitely-wrong' } });
  check('POST /auth/login (bad password -> 401)', wrongLogin, 401);

  const ownerProfile = await req('GET', '/profile', { token: accessToken });
  check('GET /profile (owner)', ownerProfile, 200, d => d?.id === owner.id && Boolean(d?.globalNotifications));
  const originalProfileName = ownerProfile.data?.name;

  log('owner creates employee');
  let employeeTokens = null;
  const createdEmployee = await req('POST', '/owner/employees', {
    token: accessToken,
    body: { email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD, name: 'Smoke Employee', phone: '+79990001122' },
  });
  if (createdEmployee.status === 201) {
    check('POST /owner/employees', createdEmployee, 201, d => d?.role === 'employee');
  } else if (createdEmployee.status === 409) {
    check('POST /owner/employees (exists -> 409)', createdEmployee, 409);
  } else {
    check('POST /owner/employees', createdEmployee, [201, 409]);
  }
  employeeTokens = await login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);
  const employee = employeeTokens.user;
  const employeeAccess = employeeTokens.accessToken;
  const employeeRefresh = employeeTokens.refreshToken;
  log(`  employee: ${employee.email} (${employee.role})`);

  log('employee is blocked from /owner/*');
  const empEmployees = await req('GET', '/owner/employees', { token: employeeAccess });
  check('GET /owner/employees as employee -> 403', empEmployees, 403);
  const empClubPatch = await req('PATCH', '/owner/club', { token: employeeAccess, body: { name: 'Hack' } });
  check('PATCH /owner/club as employee -> 403', empClubPatch, 403);
  const empCreate = await req('POST', '/owner/employees', {
    token: employeeAccess,
    body: { email: 'x@y.z', password: '123456', name: 'X' },
  });
  check('POST /owner/employees as employee -> 403', empCreate, 403);

  log('habits CRUD');
  const habitDefs = [
    { title: 'Smoke: Медитация', targetCount: 1, schedule: { days: [] }, notificationsEnabled: true, remindAt: '08:00' },
    { title: 'Smoke: Спорт', targetCount: 1, schedule: { days: [0, 1, 2, 3, 4, 5, 6] }, notificationsEnabled: false, remindAt: null },
    { title: 'Smoke: Чтение', targetCount: 1, schedule: { days: [1, 2, 3, 4, 5] }, notificationsEnabled: true, remindAt: '22:00' },
    { title: 'Smoke: Вода', targetCount: 8, schedule: { days: [] }, notificationsEnabled: true, remindAt: '12:00' },
  ];
  const habits = [];
  for (const def of habitDefs) {
    const res = await req('POST', '/habits', { token: accessToken, body: def });
    check(`POST /habits "${def.title}"`, res, 201, d => d?.title === def.title && d?.targetCount === def.targetCount);
    if (res.status === 201) habits.push(res.data);
  }

  if (habits.length >= 1) {
    const habit1 = habits[0];
    const patch = await req('PATCH', `/habits/${habit1.id}`, {
      token: accessToken,
      body: { title: 'Smoke: Медитация v2', remindAt: '08:30', description: 'после обновления' },
    });
    check('PATCH /habits/:id', patch, 200, d => d?.title === 'Smoke: Медитация v2' && d?.remindAt === '08:30');

    const listAfterPatch = await req('GET', '/habits', { token: accessToken });
    check('GET /habits', listAfterPatch, 200, d =>
      Array.isArray(d) && d.some(h => h.id === habit1.id && h.title === 'Smoke: Медитация v2' && 'today' in h && 'lastLog' in h));

    const log1 = await req('POST', `/habits/${habit1.id}/log`, {
      token: accessToken,
      body: { status: 'done', note: 'первый раз' },
    });
    check('POST /habits/:id/log (done)', log1, 201, d => d?.log?.status === 'done' && d?.habit?.today?.status === 'done');

    const log2 = await req('POST', `/habits/${habit1.id}/log`, {
      token: accessToken,
      body: { status: 'done', note: 'замена' },
    });
    check('POST /habits/:id/log (upsert same day)', log2, 201, d =>
      d?.log?.id === log1.data?.log?.id && d?.log?.note === 'замена');

    const stats = await req('GET', `/habits/${habit1.id}/stats`, { token: accessToken });
    check('GET /habits/:id/stats', stats, 200, d =>
      Array.isArray(d?.line) && d.line.length === 30 &&
      typeof d.streak === 'number' && d.streak >= 1 &&
      typeof d.rate === 'number' && d.done >= 1 && d.expected === 30);

    if (habits.length >= 4) {
      const habit4 = habits[3];
      const del = await req('DELETE', `/habits/${habit4.id}`, { token: accessToken });
      check('DELETE /habits/:id', del, 201, d => d?.ok === true);
      const listAfterDelete = await req('GET', '/habits', { token: accessToken });
      check('GET /habits after delete', listAfterDelete, 200, d =>
        Array.isArray(d) && !d.some(h => h.id === habit4.id));
      habits.pop();
    }

    if (habits.length >= 2) {
      const skipped = await req('POST', `/habits/${habits[1].id}/log`, {
        token: accessToken,
        body: { status: 'skipped' },
      });
      check('POST /habits/:id/log (skipped)', skipped, 201, d => d?.habit?.today?.status === 'skipped');
    }
  }

  const employeeHabits = await req('GET', '/habits', { token: employeeAccess });
  check('GET /habits (employee, own only)', employeeHabits, 200, d =>
    Array.isArray(d) && d.every(h => !h.title.startsWith('Smoke:')));

  const foreignHabit = await req('GET', `/habits/${habits[0]?.id || '00000000-0000-4000-8000-000000000000'}/stats`, {
    token: employeeAccess,
  });
  check('GET /habits/:id/stats (чужая привычка -> 404)', foreignHabit, 404);

  log('contacts');
  const ownerContacts = await req('GET', '/contacts?sort=alpha', { token: accessToken });
  check('GET /contacts?sort=alpha', ownerContacts, 200, d => Array.isArray(d));
  const contacts = Array.isArray(ownerContacts.data) ? ownerContacts.data : [];

  if (contacts.length === 0) {
    log('  contacts: SKIPPED (нет данных — выполните npm run seed)');
  } else {
    const alphaSorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (contacts.map(c => c.name).join('|') !== alphaSorted.map(c => c.name).join('|')) {
      fail('contacts alpha sort', `порядок не по имени: ${contacts.map(c => c.name).join(', ')}`);
    } else {
      log('  ok: contacts sorted alpha');
    }

    const lastRes = await req('GET', '/contacts?sort=last', { token: accessToken });
    check('GET /contacts?sort=last', lastRes, 200, d => Array.isArray(d) && d.length === contacts.length);

    const probe = contacts[0].name.slice(0, 4);
    const searchRes = await req('GET', `/contacts?q=${encodeURIComponent(probe)}`, { token: accessToken });
    check(`GET /contacts?q=${probe}`, searchRes, 200, d =>
      Array.isArray(d) && d.length >= 1 && d.some(c => c.id === contacts[0].id));

    const vipRes = await req('GET', '/contacts?tag=vip', { token: accessToken });
    check('GET /contacts?tag=vip', vipRes, 200, d => Array.isArray(d) && d.every(c => c.tag === 'vip'));

    const contact = contacts[0];
    const originalNote = contact.note;
    const originalCompany = contact.company;
    const detail = await req('GET', `/contacts/${contact.id}`, { token: accessToken });
    check('GET /contacts/:id', detail, 200, d => d?.contact?.id === contact.id && Array.isArray(d?.logs));

    const patched = await req('PATCH', `/contacts/${contact.id}`, {
      token: accessToken,
      body: { note: 'smoke-note', company: contact.company || 'Smoke Company' },
    });
    check('PATCH /contacts/:id', patched, 200, d => d?.note === 'smoke-note');

    const contactLog = await req('POST', `/contacts/${contact.id}/logs`, {
      token: accessToken,
      body: { action: 'звонок', durationMin: 10, comment: 'smoke log' },
    });
    check('POST /contacts/:id/logs', contactLog, 201, d => d?.action === 'звонок' && d?.durationMin === 10);

    const detailAfterLog = await req('GET', `/contacts/${contact.id}`, { token: accessToken });
    check('GET /contacts/:id after log', detailAfterLog, 200, d => d.logs.length >= 1);

    const empDetail = await req('GET', `/contacts/${contact.id}`, { token: employeeAccess });
    check('GET /contacts/:id (чужой, employee) -> 403', empDetail, 403);
    const empPatchLink = await req('PATCH', `/contacts/${contact.id}`, {
      token: employeeAccess,
      body: { linkedEmployeeId: employee.id },
    });
    check('PATCH /contacts/:id linkedEmployeeId as employee -> 403', empPatchLink, 403);
    const empDelete = await req('DELETE', `/contacts/${contact.id}`, { token: employeeAccess });
    check('DELETE /contacts/:id as employee -> 403', empDelete, 403);

    const link = await req('PATCH', `/contacts/${contact.id}`, {
      token: accessToken,
      body: { linkedEmployeeId: employee.id },
    });
    check('PATCH /contacts/:id (owner links employee)', link, 200, d => d?.linkedEmployeeId === employee.id);
    const unlink = await req('PATCH', `/contacts/${contact.id}`, {
      token: accessToken,
      body: { linkedEmployeeId: null },
    });
    check('PATCH /contacts/:id (owner unlinks)', unlink, 200, d => d?.linkedEmployeeId === null);

    await req('PATCH', `/contacts/${contact.id}`, {
      token: accessToken,
      body: { note: originalNote, company: originalCompany },
    });

    const empList = await req('GET', '/contacts', { token: employeeAccess });
    check('GET /contacts (employee own)', empList, 200, d =>
      Array.isArray(d) && d.every(c => c.userId === employee.id) && d.every(c => c.linkedEmployeeId === null));

    if (contacts.length >= 2) {
      const toDelete = contacts[contacts.length - 1];
      const del = await req('DELETE', `/contacts/${toDelete.id}`, { token: accessToken });
      check('DELETE /contacts/:id (owner)', del, 201, d => d?.ok === true);
      const after = await req('GET', `/contacts/${toDelete.id}`, { token: accessToken });
      check('GET /contacts/:id after delete -> 404', after, 404);
    }
  }

  log('contacts create');
  const createdOwner = await req('POST', '/contacts', {
    token: accessToken,
    body: { name: 'Smoke Созданный', phone: '+7 900 111-22-33', company: 'Smoke LLC', city: 'Казань', tag: 'partner', note: 'создан smoke' },
  });
  check('POST /contacts', createdOwner, 201, d =>
    d?.name === 'Smoke Созданный' && d?.tag === 'partner' && d?.lastActionAt === null);

  const createdEmp = await req('POST', '/contacts', {
    token: employeeAccess,
    body: { name: 'Smoke Контакт Сотрудника' },
  });
  check('POST /contacts (employee own)', createdEmp, 201, d =>
    d?.userId === employee.id && d?.linkedEmployeeId === null && d?.tag === 'client');

  const empLinkForbidden = await req('POST', '/contacts', {
    token: employeeAccess,
    body: { name: 'Smoke Link', linkedEmployeeId: employee.id },
  });
  check('POST /contacts linkedEmployeeId as employee -> 403', empLinkForbidden, 403);

  const createdLink = await req('POST', '/contacts', {
    token: accessToken,
    body: { name: 'Smoke Привязанный', linkedEmployeeId: employee.id },
  });
  check('POST /contacts (owner links employee)', createdLink, 201, d =>
    d?.linkedEmployeeId === employee.id);

  const createdList = await req('GET', '/contacts?q=Smoke', { token: accessToken });
  check('GET /contacts?q=Smoke (созданные видны)', createdList, 200, d =>
    Array.isArray(d) && d.length >= 2 && d.every(c => c.name.startsWith('Smoke')) &&
    d.every(c => c.userId === ownerProfile.data?.id));

  for (const created of [createdOwner, createdLink, createdEmp]) {
    const id = created.data?.id;
    if (id) {
      const removed = await req('DELETE', `/contacts/${id}`, { token: accessToken });
      check(`DELETE /contacts/:id (created ${id.slice(0, 8)})`, removed, 201, d => d?.ok === true);
    }
  }

  log('profile');
  const patchedProfile = await req('PATCH', '/profile', { token: accessToken, body: { name: 'Smoke Profile' } });
  check('PATCH /profile', patchedProfile, 200, d => d?.name === 'Smoke Profile' && 'globalNotifications' in d);
  if (originalProfileName) {
    await req('PATCH', '/profile', { token: accessToken, body: { name: originalProfileName } });
  }

  const notifications = await req('GET', '/profile/notifications', { token: accessToken });
  check('GET /profile/notifications', notifications, 200, d =>
    typeof d?.vapidPublicKey === 'string' && d.vapidPublicKey.length > 10 &&
    d.pushSupported === true && 'subscription' in d && 'enabled' in d);

  const notifPatch = await req('PATCH', '/profile/notifications', {
    token: accessToken,
    body: { enabled: false, time: '10:15' },
  });
  check('PATCH /profile/notifications', notifPatch, 200, d => d?.enabled === false && d?.time === '10:15');
  await req('PATCH', '/profile/notifications', { token: accessToken, body: { enabled: true, time: '09:00' } });

  log('owner employees & club');
  const employeesList = await req('GET', '/owner/employees', { token: accessToken });
  check('GET /owner/employees', employeesList, 200, d =>
    Array.isArray(d) && d.some(e => e.email === EMPLOYEE_EMAIL) &&
    d.every(e => e.email !== owner.email) &&
    d.every(e => typeof e.contactsCount === 'number' && typeof e.habitsCount === 'number'));

  let throwaway = null;
  const createThrowaway = await req('POST', '/owner/employees', {
    token: accessToken,
    body: { email: THROWAWAY_EMAIL, password: EMPLOYEE_PASSWORD, name: 'Throwaway' },
  });
  if (createThrowaway.status === 409) {
    const list = await req('GET', '/owner/employees', { token: accessToken });
    throwaway = (list.data || []).find(e => e.email === THROWAWAY_EMAIL) || null;
    if (throwaway) {
      await req('DELETE', `/owner/employees/${throwaway.id}`, { token: accessToken });
    }
    const recreate = await req('POST', '/owner/employees', {
      token: accessToken,
      body: { email: THROWAWAY_EMAIL, password: EMPLOYEE_PASSWORD, name: 'Throwaway' },
    });
    check('POST /owner/employees (recreate after cleanup)', recreate, 201);
    throwaway = recreate.status === 201 ? recreate.data : throwaway;
  } else {
    check('POST /owner/employees (throwaway)', createThrowaway, 201);
    throwaway = createThrowaway.status === 201 ? createThrowaway.data : null;
  }

  if (throwaway) {
    const delThrowaway = await req('DELETE', `/owner/employees/${throwaway.id}`, { token: accessToken });
    check('DELETE /owner/employees/:id', delThrowaway, 201, d => d?.ok === true);
  }

  const deleteSelf = await req('DELETE', `/owner/employees/${owner.id}`, { token: accessToken });
  check('DELETE /owner/employees/:id (self) -> 400', deleteSelf, 400);
  const deleteMissing = await req('DELETE', '/owner/employees/00000000-0000-4000-8000-000000000000', {
    token: accessToken,
  });
  check('DELETE /owner/employees/:id (missing) -> 404', deleteMissing, 404);

  const originalAddress = ownerProfile.data?.club?.address ?? null;
  const clubPatch = await req('PATCH', '/owner/club', {
    token: accessToken,
    body: { address: 'ул. Тестовая, 1' },
  });
  check('PATCH /owner/club', clubPatch, 201, d => d?.address === 'ул. Тестовая, 1' && Boolean(d?.id) && 'ownerId' in d);
  await req('PATCH', '/owner/club', { token: accessToken, body: { address: originalAddress } });

  const ownerStats = await req('GET', '/stats/habits', { token: accessToken });
  check('GET /stats/habits', ownerStats, 200, d =>
    d?.periodDays === 30 && Array.isArray(d?.habits) && Array.isArray(d?.calendar) &&
    d.calendar.length === 30 && Boolean(d?.overall) && typeof d.overall.rate === 'number' &&
    d.habits.every(h => typeof h.rate === 'number' && typeof h.streak === 'number'));

  log('password change revokes sessions');
  const staleRefresh = refreshToken;
  const beforePw = await login(owner.email, ownerPassword);
  const pwChange = await req('PATCH', '/profile/password', {
    token: beforePw.accessToken,
    body: { currentPassword: ownerPassword, newPassword: 'NewPass123!', refreshToken: beforePw.refreshToken },
  });
  check('PATCH /profile/password', pwChange, 201, d =>
    d?.ok === true && typeof d?.revokedSessions === 'number' && d.revokedSessions >= 1);

  const revokedRefresh = await req('POST', '/auth/refresh', { body: { refreshToken: staleRefresh } });
  check('POST /auth/refresh with revoked (other) token -> 401', revokedRefresh, 401);

  const keptRefresh = await req('POST', '/auth/refresh', { body: { refreshToken: beforePw.refreshToken } });
  check('POST /auth/refresh with current (kept) token -> 201', keptRefresh, 201);

  const oldPasswordLogin = await req('POST', '/auth/login', { body: { email: owner.email, password: ownerPassword } });
  check('POST /auth/login with old password -> 401', oldPasswordLogin, 401);

  const newLogin = await login(owner.email, 'NewPass123!');
  const restore = await req('PATCH', '/profile/password', {
    token: newLogin.accessToken,
    body: { currentPassword: 'NewPass123!', newPassword: ownerPassword, refreshToken: newLogin.refreshToken },
  });
  check('PATCH /profile/password (restore)', restore, 201, d => d?.ok === true);
  const restoredLogin = await login(owner.email, ownerPassword);
  accessToken = restoredLogin.accessToken;
  refreshToken = restoredLogin.refreshToken;

  log('logout');
  const ownerLogout = await req('POST', '/auth/logout', { body: { refreshToken } });
  check('POST /auth/logout', ownerLogout, 201, d => d?.ok === true);
  const afterLogout = await req('POST', '/auth/refresh', { body: { refreshToken } });
  check('POST /auth/refresh after logout -> 401', afterLogout, 401);

  const employeeLogout = await req('POST', '/auth/logout', { body: { refreshToken: employeeRefresh } });
  check('POST /auth/logout (employee)', employeeLogout, 201, d => d?.ok === true);
  const employeeAfterLogout = await req('POST', '/auth/refresh', { body: { refreshToken: employeeRefresh } });
  check('POST /auth/refresh after logout (employee) -> 401', employeeAfterLogout, 401);

  const finalProfile = await req('GET', '/profile', { token: accessToken });
  check('GET /profile (final)', finalProfile, 200, d => d?.id === owner.id);

  log('cleanup');
  const finalHabits = await req('GET', '/habits', { token: accessToken });
  const smokeHabits = (Array.isArray(finalHabits.data) ? finalHabits.data : []).filter(h =>
    String(h.title).startsWith('Smoke:'),
  );
  for (const habit of smokeHabits) {
    await req('DELETE', `/habits/${habit.id}`, { token: accessToken });
  }
  log(`  removed ${smokeHabits.length} smoke habits`);

  const finalEmployees = await req('GET', '/owner/employees', { token: accessToken });
  const smokeEmployee = (Array.isArray(finalEmployees.data) ? finalEmployees.data : []).find(
    e => e.email === EMPLOYEE_EMAIL,
  );
  if (smokeEmployee) {
    const delEmployee = await req('DELETE', `/owner/employees/${smokeEmployee.id}`, { token: accessToken });
    check('cleanup: DELETE smoke employee', delEmployee, 201, d => d?.ok === true);
  }

  log(`bootstrap path: ${bootstrapUsed ? 'fresh bootstrap' : 'pre-seeded database'}`);
}

main()
  .then(async () => {
    log(failures === 0 ? 'SMOKE OK' : `SMOKE FAILED (${failures} failures)`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('SMOKE EXCEPTION:', error);
    process.exit(1);
  });
