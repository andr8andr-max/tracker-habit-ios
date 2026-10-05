import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import type { Contact, HabitWithToday, StatsResponse } from '../api/types';
import { HabitBarChart } from '../components/habit/HabitBarChart';
import { HabitCard } from '../components/habit/HabitCard';
import { ContactRow } from '../components/contact/ContactRow';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { isScheduledToday, percent, todayISO } from '../lib/format';
import { useAuthStore } from '../store/auth';
import { useContacts } from '../store/contacts';
import { useHabits } from '../store/habits';

const QUICK_LINKS = [
  { to: '/habits', label: 'Мои привычки', icon: 'checkCircle' as const },
  { to: '/contacts', label: 'Контакты', icon: 'phone' as const },
  { to: '/profile/notifications', label: 'Уведомления', icon: 'bell' as const },
  { to: '/profile', label: 'Профиль', icon: 'user' as const },
];

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const habits = useHabits((state) => state.items);
  const fetchHabits = useHabits((state) => state.fetchHabits);
  const logHabit = useHabits((state) => state.logHabit);
  const fetchContacts = useContacts((state) => state.fetchContacts);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recent, setRecent] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [logBusy, setLogBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const statsPromise = apiGet<StatsResponse>('/stats/habits');
        const contactsPromise = apiGet<Contact[]>('/contacts', { query: { sort: 'last' } });
        await fetchHabits();
        void fetchContacts({ sort: 'last' });
        const [statsData, contactsData] = await Promise.all([statsPromise, contactsPromise]);
        if (!cancelled) {
          setStats(statsData);
          setRecent(contactsData.slice(0, 5));
        }
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchHabits, fetchContacts]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const [statsData, contactsData] = await Promise.all([
        apiGet<StatsResponse>('/stats/habits'),
        apiGet<Contact[]>('/contacts', { query: { sort: 'last' } }),
      ]);
      await fetchHabits();
      setStats(statsData);
      setRecent(contactsData.slice(0, 5));
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  const dayOfWeek = new Date().getDay();
  const scheduled: HabitWithToday[] = habits.filter((habit) =>
    isScheduledToday(habit.schedule.days, dayOfWeek),
  );
  const doneToday = scheduled.filter((habit) => habit.today?.status === 'done').length;

  async function handleToggle(habit: HabitWithToday, checked: boolean) {
    setLogBusy(habit.id);
    try {
      await logHabit(habit.id, checked ? 'done' : 'pending');
    } finally {
      setLogBusy(null);
    }
  }

  const todayLabel = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div>
      <PageHeader
        title={`Привет, ${user?.name ?? 'друг'}!`}
        subtitle={todayLabel}
        actions={
          <Button variant="secondary" loading={loading} onClick={() => void handleRefresh()}>
            Обновить
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-title">Статистика за 30 дней</p>
                <p className="mt-1 text-sm text-slate-500">
                  {stats ? `Период: ${stats.periodDays} дней` : 'Загрузка данных…'}
                </p>
              </div>
              {stats ? (
                <div className="flex flex-wrap gap-4 text-center">
                  <div className="rounded-lg bg-brand-50 px-4 py-2">
                    <p className="text-2xl font-semibold text-brand-700">
                      {percent(stats.overall.rate)}
                    </p>
                    <p className="text-xs text-slate-500">выполнено</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-4 py-2">
                    <p className="text-2xl font-semibold text-slate-700">
                      {stats.overall.done}/{stats.overall.expected}
                    </p>
                    <p className="text-xs text-slate-500">задач</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-4 py-2">
                    <p className="text-2xl font-semibold text-slate-700">
                      {stats.overall.activeHabits}
                    </p>
                    <p className="text-xs text-slate-500">активных привычек</p>
                  </div>
                </div>
              ) : null}
            </div>

            {loading ? (
              <InlineSpinner label="Загружаем статистику…" />
            ) : stats && stats.calendar.length > 0 ? (
              <div className="mt-4">
                <HabitBarChart
                  data={stats.calendar.map((day) => ({
                    label: day.date,
                    value: day.rate,
                    title: `${day.date}: ${day.done} из ${day.expected} (${Math.round(day.rate * 100)}%)`,
                  }))}
                  ariaLabel="Ежедневная статистика выполнения за 30 дней"
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Статистика пока не накоплена.</p>
            )}

            {stats && stats.habits.length > 0 ? (
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-700">По привычкам</p>
                {stats.habits.map((habit) => (
                  <div key={habit.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <Link
                        to={`/habits/${habit.id}`}
                        className="break-words font-medium text-slate-700 hover:text-brand-700"
                      >
                        {habit.title}
                      </Link>
                      <span className="text-xs text-slate-500">
                        серия {habit.streak} дн. · {habit.done}/{habit.expected} ·{' '}
                        {percent(habit.rate)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.round(habit.rate * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Сегодня</p>
                <p className="mt-1 text-sm text-slate-500">
                  {scheduled.length > 0
                    ? `Выполнено ${doneToday} из ${scheduled.length}`
                    : 'На сегодня привычек нет'}
                </p>
              </div>
              <Link
                to="/habits"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Все привычки →
              </Link>
            </div>

            {habits.length === 0 ? (
              <EmptyState
                title="Привычек пока нет"
                description="Добавьте первую привычку, чтобы начать отслеживать прогресс."
                icon={<Icon name="checkCircle" className="h-6 w-6" />}
                action={
                  <Link
                    to="/habits/new"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Создать привычку
                  </Link>
                }
              />
            ) : scheduled.length === 0 ? (
              <EmptyState
                title="Сегодня отдыхаем"
                description="По расписанию на сегодня привычек нет."
                icon={<Icon name="check" className="h-6 w-6" />}
              />
            ) : (
              <div className="space-y-4">
                {scheduled.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    busy={logBusy === habit.id}
                    onToggle={(checked) => void handleToggle(habit, checked)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="section-title">Последние контакты</p>
              <Link
                to="/contacts"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Все →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">Контактов пока нет.</p>
            ) : (
              <div className="space-y-3">
                {recent.map((contact) => (
                  <ContactRow key={contact.id} contact={contact} />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <p className="section-title mb-4">Быстрые ссылки</p>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Icon name={link.icon} className="h-5 w-5 text-brand-600" />
                  <span className="break-words">{link.label}</span>
                </Link>
              ))}
              {user?.role === 'owner' ? (
                <>
                  <Link
                    to="/owner/employees"
                    className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Icon name="users" className="h-5 w-5 text-brand-600" />
                    <span className="break-words">Сотрудники</span>
                  </Link>
                  <Link
                    to="/owner/club"
                    className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Icon name="building" className="h-5 w-5 text-brand-600" />
                    <span className="break-words">Настройки клуба</span>
                  </Link>
                </>
              ) : null}
            </div>
          </section>

          <section className="card">
            <p className="section-title">День</p>
            <p className="mt-2 break-words text-sm text-slate-500">
              Сегодня {todayISO()}. Отмечайте привычки вовремя — серия не прервётся.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
