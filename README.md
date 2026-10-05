# Клуб предпринимателей — трекер привычек

SPA-приложение для клуба предпринимателей: трекер привычек с напоминаниями, база контактов с историей взаимодействий, ролевая модель «владелец / сотрудник» и браузерные push-уведомления.

Спецификация: [`Промпт для трекера привычек.txt`](./Промпт%20для%20трекера%20привычек.txt) · Контракт API: [`docs/API.md`](./docs/API.md)

## Стек

| Слой | Технологии |
| --- | --- |
| Клиент | React 18, Vite 6, TypeScript, React Router v6, Zustand, Tailwind CSS 3 |
| Сервер | Node.js 20, NestJS 11, TypeORM 0.3, PostgreSQL 16 |
| Уведомления | Web Push (`web-push` + VAPID), `node-cron` |
| Инфра | Docker Compose, GitHub Actions CI, Playwright (e2e) |

## Структура

```
├── client/           # SPA: 12 маршрутов, layout, компоненты habit/contact/ui
│   ├── public/       # manifest.json, sw.js, icon.svg
│   └── src/
│       ├── pages/    # Login, Dashboard, HabitList, HabitCreate, HabitDetail,
│       │             # ContactList, ContactCreate, ContactDetail, Profile,
│       │             # NotificationSettings, Employees, ClubSettings
│       ├── components/ layout, habit, contact, ui
│       ├── store/    # Zustand: auth, habits, contacts, profile, ui
│       └── api/      # fetch-клиент с авто-refresh токенов
├── server/           # NestJS API (префикс /api)
│   ├── src/          # auth, habits, contacts, profile, owner, stats, notifications
│   └── scripts/      # start-db (embedded PostgreSQL), seed, smoke, утилиты
├── e2e/              # Playwright: приёмка по критериям ТЗ
├── docs/API.md       # контракт API (единый для клиента и сервера)
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Быстрый старт (Docker)

```bash
docker compose up --build
docker compose exec server node dist/database/seed.js   # демо-данные
```

- Клиент: http://localhost:8080 (nginx проксирует `/api` на сервер)
- API: http://localhost:4000/api/health

## Локальный запуск (без Docker)

Нужен Node.js 20+.

```bash
# 1. PostgreSQL 16 (спиннится локально, без Docker)
cd server
npm install
npm run db:start        # оставить открытым: кластер на localhost:5433, база club

# 2. в отдельном терминале
cd server
npm run seed            # владелец + клуб + сотрудники + демо-данные
npm run start           # API на :4000

# 3. клиент
cd client
npm install
npm run dev             # http://localhost:5173 (проксирует /api на :4000)
```

### Учётные данные после `npm run seed`

| Роль | Email | Пароль |
| --- | --- | --- |
| Владелец | `owner@club.local` | `owner12345` |
| Сотрудник | `employee1@club.local` | `employee12345` |

Если база пуста (без seed), на странице входа есть вкладка **«Первый аккаунт»** — она создаёт владельца и клуб.

Переменные окружения — см. [`server/.env.example`](./server/.env.example).

## Возможности

- **Привычки**: цели на день, расписание по дням недели, отметки «выполнено / пропущено», серия (streak), график за 30 дней, доля выполнения.
- **Контакты**: поиск с debounce 200 мс, фильтр по тегам (vip/partner/client/inactive), сортировка по имени и по последнему действию, история взаимодействий с длительностью, привязка контакта к сотруднику (только владелец).
- **Роли**: владелец — сотрудники, настройки клуба, удаление контактов; сотрудник — только свои сущности и без `/owner/*`.
- **Профиль**: имя, телефон, аватар, смена пароля (отзывает остальные сессии), глобальные настройки уведомлений (переключатель + время).
- **Web Push**: напоминание о привычке в её время, дневной отчёт в 09:00 при пропусках, напоминание о пропуске в 12:00 (2+ дня). Кнопка подписки — в «Уведомлениях», service worker — `client/public/sw.js`.
- **PWA-адаптация**: `manifest.json`, тема, иконка (установка PWA вне scope по ТЗ).

## Маршруты (12)

| Путь | Страница | Доступ |
| --- | --- | --- |
| `/login` | Вход / первый аккаунт | публичный |
| `/` | Главная (сводка дня) | все |
| `/habits` | Список привычек | все |
| `/habits/new` | Создание привычки | все |
| `/habits/:id` | Привычка: график, streak, логи | все |
| `/contacts` | Контакты: поиск, фильтр, сортировка | все |
| `/contacts/new` | Новый контакт | все |
| `/contacts/:id` | Контакт: карточка + история | все |
| `/profile` | Профиль и смена пароля | все |
| `/profile/notifications` | Уведомления и push-подписка | все |
| `/owner/employees` | Сотрудники | владелец |
| `/owner/club` | Настройки клуба | владелец |

## Тесты и приёмка

```bash
# API: 60+ проверок (auth, роли, CRUD, права, смена пароля)
cd server && npm run smoke

# UI: Playwright (использует системный Edge, браузер не скачивается)
cd e2e && npm install && npx playwright test
```

Что покрыто e2e: все 12 страниц без перезагрузки (маркер `window` переживает клики по меню), отсутствие горизонтального скролла на 375 px и 1280 px, бургер-меню, скрытие owner-разделов у сотрудника и редирект с `/owner/*`, debounce поиска 200 мс, создание привычки и отметка «выполнено», смена пароля с отзывом остальных сессий.

CI (`.github/workflows/ci.yml`): typecheck + build + seed + smoke на сервере, lint + build на клиенте.

## Out of Scope (по ТЗ)

Восстановление пароля, автоматическая история (Twilio/календарь), файлы в контактах, email-дайджест, установка PWA (только манифест).
