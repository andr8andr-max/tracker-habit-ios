# Контракт API — «Клуб предпринимателей: трекер привычек»

Единственный источник истины для сервера и клиента. Базовый префикс: `/api`.
Все ответы — JSON (`Content-Type: application/json`). Даты — ISO 8601 в UTC, кроме `date` в логах привычек — это строка `YYYY-MM-DD` (локальная дата пользователя, timezone задаётся сервером `TZ`, по умолчанию `Europe/Moscow`).

## Ошибки

Любой не-2xx ответ:

```json
{ "statusCode": 400, "message": "Некорректные данные", "error": "Bad Request" }
```

`message` может быть массивом строк (class-validator). Клиент показывает `message` (объединённый) в тосте.

## Токены

- `accessToken` — JWT (HS256), TTL 15 минут, заголовок `Authorization: Bearer <accessToken>`.
- `refreshToken` — случайная строка, хранится в таблице `tokens` с `expires_at` (30 дней).
- Refresh у одного токена инвалидирует этот же токен (ротация).
- Смена пароля (`PATCH /profile/password`) удаляет **все** refresh-токены пользователя, кроме текущего переданного (если передан) — фактически разлогинивает все остальные сессии.

## Роли

- `owner` — доступ ко всему, включая `/owner/*`, удаление контактов; видит поле `linkedEmployeeId`.
- `employee` — только свои сущности; маршруты `/owner/*` → 403; поле `linkedEmployeeId` не возвращается (вырезается из ответа).

---

## 1. Auth

### POST `/api/auth/register`
Создание пользователя.
- **Без токена** — только если в БД ещё нет ни одного пользователя (bootstrap): создаётся пользователь с ролью `owner`, создаётся клуб `«Мой клуб»`, он же `owner_id`. Ответ 201.
- **С токеном owner** — создаёт сотрудника (`role: 'employee'` или `owner`). Ответ 201.
- С токеном employee → 403.

Request:
```json
{ "email": "a@b.c", "password": "secret123", "name": "Иван", "phone": "+7...", "role": "employee" }
```
Ответ 201:
```json
{ "id": "uuid", "email": "a@b.c", "name": "Иван", "phone": null, "role": "employee", "clubId": "uuid", "avatarUrl": null, "createdAt": "..." }
```

### POST `/api/auth/login`
Request: `{ "email": "...", "password": "..." }`
Ответ 201:
```json
{ "accessToken": "...", "refreshToken": "...", "user": { "id": "uuid", "email": "...", "name": "...", "role": "owner", "clubId": "uuid", "phone": null, "avatarUrl": null, "createdAt": "..." } }
```
401 при неверных данных.

### POST `/api/auth/refresh`
Request: `{ "refreshToken": "..." }` → ответ как login (новая пара токенов). 401 при отсутствующем/просроченном токене.

### POST `/api/auth/logout`
Request: `{ "refreshToken": "..." }` → `201 { "ok": true }`. Токен удаляется (не ошибка, если его не было).

---

## 2. Habits

Модель привычки:
```ts
{
  id: string; userId: string; title: string; description: string | null;
  targetCount: number;            // сколько выполнений в день (>=1)
  schedule: { days: number[] };   // 0=Вс … 6=Сб; пустой массив = ежедневно
  notificationsEnabled: boolean;
  remindAt: string | null;        // "HH:MM" (локальное время)
  createdAt: string;
}
```

### GET `/api/habits`
Массив с расчётом на **сегодня**:
```json
[{
  "id": "...", "title": "...", "description": null, "targetCount": 1,
  "schedule": { "days": [1,2,3,4,5] }, "notificationsEnabled": true,
  "remindAt": "09:00", "createdAt": "...",
  "lastLog": { "id": "...", "date": "2026-10-05", "status": "done", "note": null, "createdAt": "..." },
  "today": { "done": 1, "target": 1, "status": "done" }   // status: done|pending|skipped|none|off
}]
```
`today.status`: `done` — выполнено (`done >= target`), `skipped` — есть лог со статусом skipped, `pending` — есть день в расписании, но не выполнено, `none` — день не в расписании. `off` не используется.

### POST `/api/habits`
Request: `{ "title": "Медитация", "description": "...", "targetCount": 1, "schedule": {"days":[0,1,2,3,4,5,6]}, "notificationsEnabled": true, "remindAt": "08:00" }`
Ответ 201 — объект привычки. Валидация: title 1..120, targetCount 1..10, remindAt `^([01]\d|2[0-3]):[0-5]\d$`.

### PATCH `/api/habits/:id`
Частичное обновление тех же полей. 404 если не найдено или чужое.

### DELETE `/api/habits/:id`
201 `{ "ok": true }`. Удаляет привычку и её логи (cascade).

### POST `/api/habits/:id/log`
Request: `{ "date": "YYYY-MM-DD", "status": "done|skipped|pending", "note": "string?" }`
`date` опционален → сегодня. Повторный вызов с тем же habit+date **заменяет** существующий лог (upsert) и возвращает `{ "habit": {...как GET item...}, "log": {...} }`.
Ответ 201.

### GET `/api/habits/:id/stats`
```json
{ "line": [ { "date": "2026-09-06", "status": "done" }, ... ], "streak": 5, "rate": 0.82, "done": 23, "expected": 28 }
```
- `line` — 30 последних календарных дней (всегда 30 элементов, включая дни «вне расписания» со статусом `off`);
- `streak` — текущая серия дней, где статус `done` (сегодня в серию входит, если уже выполнено);
- `rate` — done / expected за 30 дней (expected — дни, входящие в расписание).

---

## 3. Contacts

```ts
{
  id, userId, name, phone, company, city,
  tag: "vip" | "partner" | "client" | "inactive",
  note, linkedEmployeeId: string | null,   // только для owner; employee получает поле, но всегда null
  createdAt, lastActionAt: string | null
}
```

### POST `/api/contacts`
Request: `{ "name", "phone"?, "company"?, "city"?, "tag"?, "note"?, "linkedEmployeeId"? }`
Ответ 201 — созданный контакт. `tag` по умолчанию `client`. `linkedEmployeeId` принимается **только от owner** (иначе 403); сотрудник должен быть из клуба.

### GET `/api/contacts?q=&tag=&sort=alpha|last`
- `q` — поиск по name/phone/company/city (ILIKE `%q%`);
- `tag` — фильтр по тегу;
- `sort=alpha` (по умолчанию) — по имени ASC; `sort=last` — по `lastActionAt` DESC, пустые в конце.
Возвращает массив контактов текущего пользователя (`user_id = me`). Для owner дополнительно возвращаются контакты сотрудников клуба? **Нет** — owner видит только свои контакты; сотрудники — только свои. `linkedEmployeeId` показывается owner'у (контакт может быть привязан к сотруднику при создании/редактировании).

### GET `/api/contacts/:id`
```json
{ "contact": { ... }, "logs": [ { "id", "action", "durationMin", "comment", "createdAt" } ] }
```
403 для чужого контакта (кроме owner — owner видит любые контакты клуба).

### PATCH `/api/contacts/:id`
Request: `{ "name"?, "phone"?, "company"?, "city"?, "tag"?, "note"?, "linkedEmployeeId"? }`
`linkedEmployeeId` принимает **только owner** (иначе 403). `null` снимает привязку.

### DELETE `/api/contacts/:id`
Только owner, иначе 403. 201 `{ "ok": true }`. Удаляет контакт и его логи.

### POST `/api/contacts/:id/logs`
Request: `{ "action": "звонок|встреча|письмо|видеозвонок|другое", "durationMin": 15, "comment": "..." }`
Ответ 201 — запись лога. `action` строка 1..40, `durationMin` 0..600 опционально.

---

## 4. Profile

### GET `/api/profile`
```json
{
  "id", "email", "name", "phone", "avatarUrl", "role", "clubId", "createdAt",
  "club": { "id", "name", "logoUrl", "address", "ownerId" },
  "globalNotifications": { "enabled": true, "time": "09:00" }
}
```

### PATCH `/api/profile`
Request: `{ "name"?, "phone"?, "avatarUrl"? }` → обновлённый профиль (как GET, без club/globalNotifications — вернуть полный объект GET для простоты).

### PATCH `/api/profile/password`
Request: `{ "currentPassword": "...", "newPassword": "..." }`
→ `201 { "ok": true, "revokedSessions": 3 }`. 400 при неверном текущем пароле, пароль ≥ 6 символов.

### GET `/api/profile/notifications`
```json
{
  "enabled": true, "time": "09:00",
  "vapidPublicKey": "B...",
  "subscription": { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } } | null,
  "pushSupported": true
}
```
`pushSupported` — всегда `true` (сервер не определяет браузер; клиент сам сравнивает с `'serviceWorker' in navigator && 'PushManager' in window`).

### PATCH `/api/profile/notifications`
Request: `{ "enabled": true, "time": "09:00" }` → обновлённые `{ enabled, time }`.
Хранится на user: колонки `notifications_enabled boolean default true`, `notifications_time varchar(5) default '09:00'`.

### POST `/api/profile/push/subscribe`
Request: PushSubscription JSON → `201 { "ok": true }`. Хранится в колонке `push_subscription jsonb` на user.

### DELETE `/api/profile/push/subscribe`
→ `201 { "ok": true }`.

---

## 5. Owner (только роль owner, иначе 403)

### GET `/api/owner/employees`
```json
[ { "id", "email", "name", "phone", "role", "createdAt", "contactsCount": 12, "habitsCount": 3 } ]
```
Без самого owner в списке.

### POST `/api/owner/employees`
Request: `{ "email", "password", "name", "phone"? }` → 201, пользователь с role `employee`.

### DELETE `/api/owner/employees/:id`
Удаляет сотрудника (и его контакты/привычки/логи/токены). 404 если не найден, 400 если это сам owner.

### PATCH `/api/owner/club`
Request: `{ "name"?, "logoUrl"?, "address"? }` → `201 { "id", "name", "logoUrl", "address", "ownerId" }`.

---

## 6. Stats

### GET `/api/stats/habits`
```json
{
  "periodDays": 30,
  "overall": { "expected": 120, "done": 96, "rate": 0.8, "activeHabits": 5 },
  "habits": [ { "id", "title", "expected": 28, "done": 23, "rate": 0.82, "streak": 5 } ],
  "calendar": [ { "date": "2026-09-06", "done": 3, "expected": 5, "rate": 0.6 } ]
}
```
`calendar` — 30 дней. Данные считаются по привычкам текущего пользователя.

---

## 7. Служебное

- `GET /api/health` → `200 { "status": "ok" }` (без авторизации).
- CORS: клиент (Vite origin `http://localhost:5173`, в проде — origin из env `CLIENT_ORIGIN`) с `credentials: false`.
- Прокси: клиент ходит по `/api` → dev-прокси Vite на `http://localhost:4000`; в Docker nginx проксирует `/api/` на `server:4000`.

## 8. Схема БД (дополнения к ТЗ)

Таблицы ТЗ плюс колонки, необходимые эндпоинтам:
- `users`: `notifications_enabled bool not null default true`, `notifications_time varchar(5) not null default '09:00'`, `push_subscription jsonb`.
- `clubs`: `owner_id uuid` (FK users, nullable до bootstrap).
- `habit_logs`: уникальный индекс `(habit_id, date)` (upsert).
- `contacts`: индекс по `user_id`, `tag`.
- `tokens`: индекс по `token`.
- `habit_logs.date` — `date` (тип DATE).

## 9. Уведомления (Web Push)

VAPID-ключи: env `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`; если не заданы — генерируются при старте и пишутся в лог (`WEB PUSH: VAPID keys ...`), а также доступны через `GET /api/profile/notifications` → `vapidPublicKey`.

Cron (node-cron, TZ сервера):
1. **Каждую минуту** — напоминание о привычке: у всех пользователей с `notifications_enabled = true`, у которых привычка `notifications_enabled = true`, `remind_at = HH:MM` = текущее время, сегодня день в `schedule` и привычка ещё не выполнена сегодня → push `{ title: "Напоминание", body: "<title> — время выполнить" }`.
2. **09:00** — дневной отчёт: если за вчера/сегодня есть невыполненные привычки → push со списком «Пропуски: …».
3. **12:00** — напоминание о пропуске: у привычек с 2+ днями без выполнения подряд → push «Не пропускайте: <title>».

Дедупликация внутри суток — in-memory `Set` ключей `type|userId|habitId|YYYY-MM-DD` (сбрасывается по дате).
Все push подписки валидируются; ошибочные (`404/410`) удаляются из `push_subscription`.
Клиент: `public/sw.js` обрабатывает `push` → `self.registration.showNotification`, `notificationclick` → фокус/открытие вкладки.
