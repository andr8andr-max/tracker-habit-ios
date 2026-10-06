import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { LogStatus, TodayStatus } from '../api/types';
import { HabitBarChart } from '../components/habit/HabitBarChart';
import { HabitForm } from '../components/habit/HabitForm';
import { HabitLineChart } from '../components/habit/HabitLineChart';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { Toggle } from '../components/ui/Input';
import { percent, formatDate } from '../lib/format';
import { useHabits } from '../store/habits';
import { useUI } from '../store/ui';

const STATUS_LABELS: Record<TodayStatus, string> = {
  done: 'Выполнено сегодня',
  pending: 'Ожидает выполнения',
  skipped: 'Пропущено сегодня',
  none: 'Сегодня не по расписанию',
  off: 'Сегодня не по расписанию',
};

const BAR_VALUES: Record<TodayStatus, number> = {
  done: 1,
  pending: 0.5,
  skipped: 0,
  none: 0,
  off: 0,
};

const BAR_TITLES: Record<TodayStatus, string> = {
  done: 'выполнено',
  pending: 'не выполнено',
  skipped: 'пропущено',
  none: 'вне расписания',
  off: 'вне расписания',
};

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const items = useHabits((state) => state.items);
  const loading = useHabits((state) => state.loading);
  const loaded = useHabits((state) => state.loaded);
  const fetchHabits = useHabits((state) => state.fetchHabits);
  const updateHabit = useHabits((state) => state.updateHabit);
  const deleteHabit = useHabits((state) => state.deleteHabit);
  const logHabit = useHabits((state) => state.logHabit);
  const incrementHabit = useHabits((state) => state.incrementHabit);
  const getStats = useHabits((state) => state.getStats);
  const openConfirm = useUI((state) => state.openConfirm);
  const toast = useUI((state) => state.toast);

  const [stats, setStats] = useState<Awaited<ReturnType<typeof getStats>> | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsVersion, setStatsVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [chartView, setChartView] = useState<'line' | 'bars'>('line');
  const [logBusy, setLogBusy] = useState(false);

  useEffect(() => {
    void fetchHabits();
  }, [fetchHabits]);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setStatsLoading(true);
    getStats(id)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getStats, statsVersion]);

  const habit = items.find((item) => item.id === id);

  async function handleLog(status: LogStatus) {
    if (!id) return;
    setLogBusy(true);
    try {
      await logHabit(id, status);
      setStatsVersion((version) => version + 1);
    } finally {
      setLogBusy(false);
    }
  }

  async function handleIncrement() {
    if (!id) return;
    setLogBusy(true);
    try {
      await incrementHabit(id);
      setStatsVersion((version) => version + 1);
    } finally {
      setLogBusy(false);
    }
  }

  async function handleToggleNotifications(enabled: boolean) {
    if (!id) return;
    await updateHabit(id, { notificationsEnabled: enabled });
    toast('success', enabled ? 'Напоминания включены' : 'Напоминания выключены');
  }

  function handleDelete() {
    if (!habit) return;
    openConfirm({
      title: 'Удалить привычку?',
      message: `Привычка «${habit.title}» и вся её история будут удалены навсегда.`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        await deleteHabit(habit.id);
        toast('success', 'Привычка удалена');
        navigate('/habits', { replace: true });
      },
    });
  }

  if (!habit && (loading || !loaded)) {
    return (
      <div>
        <PageHeader title="Привычка" backTo="/habits" />
        <InlineSpinner label="Загружаем привычку…" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div>
        <PageHeader title="Привычка" backTo="/habits" />
        <EmptyState
          title="Привычка не найдена"
          description="Возможно, она была удалена."
          icon={<Icon name="search" className="h-6 w-6" />}
        />
      </div>
    );
  }

  const today = habit.today;
  const done = today?.done ?? 0;
  const target = today?.target ?? habit.targetCount;
  const status = today?.status ?? 'none';
  const checked = status === 'done';
  const progress = target > 0 ? Math.min(1, done / target) : 0;

  return (
    <div>
      <PageHeader
        title={habit.title}
        subtitle={habit.description ?? undefined}
        backTo="/habits"
        backLabel="К списку привычек"
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing((value) => !value)}>
              <Icon name="pencil" className="h-4 w-4" />
              {editing ? 'Закрыть форму' : 'Изменить'}
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Icon name="trash" className="h-4 w-4" />
              Удалить
            </Button>
          </>
        }
      />

      {editing ? (
        <div className="card mb-5 max-w-2xl">
          <p className="section-title mb-4">Редактирование</p>
          <HabitForm
            initial={habit}
            submitLabel="Сохранить изменения"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              await updateHabit(habit.id, input);
              setEditing(false);
              toast('success', 'Изменения сохранены');
              setStatsVersion((version) => version + 1);
            }}
          />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-title">Сегодня</p>
                <p className="mt-1 text-sm text-slate-500">{STATUS_LABELS[status]}</p>
              </div>
              <span
                className={`chip text-xs ${
                  checked
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : status === 'skipped'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                {done} / {target}
              </span>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                checked={checked}
                disabled={logBusy || (target > 1 && !checked)}
                onChange={(event) => void handleLog(event.target.checked ? 'done' : 'pending')}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
              />
              <span className="min-w-0">
                <span className="block break-words text-sm font-medium text-slate-800">
                  Выполнено сегодня
                </span>
                <span className="block break-words text-xs text-slate-500">
                  Прогресс {done} из {target}
                </span>
              </span>
            </label>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  checked ? 'bg-emerald-500' : 'bg-brand-500'
                }`}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {target > 1 && !checked ? (
                <Button loading={logBusy} onClick={() => void handleIncrement()}>
                  <Icon name="plus" className="h-4 w-4" />
                  +1 повтор
                </Button>
              ) : null}
              <Button
                loading={logBusy}
                disabled={checked}
                onClick={() => void handleLog('done')}
              >
                <Icon name="check" className="h-4 w-4" />
                Отметить выполнено
              </Button>
              <Button
                variant="secondary"
                loading={logBusy}
                onClick={() => void handleLog('skipped')}
              >
                Отметить пропущено
              </Button>
              {checked || status === 'skipped' ? (
                <Button
                  variant="ghost"
                  loading={logBusy}
                  onClick={() => void handleLog('pending')}
                >
                  Сбросить отметку
                </Button>
              ) : null}
            </div>
          </section>

          <section className="card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="section-title">Статистика за 30 дней</p>
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setChartView('line')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    chartView === 'line' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Линия
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('bars')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    chartView === 'bars' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Столбцы
                </button>
              </div>
            </div>

            {statsLoading ? (
              <InlineSpinner label="Считаем статистику…" />
            ) : stats ? (
              chartView === 'line' ? (
                <HabitLineChart points={stats.line} />
              ) : (
                <HabitBarChart
                  data={stats.line.map((point) => ({
                    label: point.date,
                    value: BAR_VALUES[point.status],
                    title: `${point.date} — ${BAR_TITLES[point.status]}`,
                  }))}
                  ariaLabel="Столбчатая статистика за 30 дней"
                />
              )
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                Статистика недоступна. Попробуйте обновить страницу.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card">
            <p className="section-title">Достижения</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3">
                <span className="text-sm text-brand-800">Текущая серия</span>
                <span className="text-lg font-semibold text-brand-700">
                  {stats ? `${stats.streak} дн.` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
                <span className="text-sm text-slate-600">Выполнение</span>
                <span className="text-lg font-semibold text-slate-700">
                  {stats ? percent(stats.rate) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
                <span className="text-sm text-slate-600">Выполнено задач</span>
                <span className="text-lg font-semibold text-slate-700">
                  {stats ? `${stats.done}/${stats.expected}` : '—'}
                </span>
              </div>
            </div>
          </section>

          <section className="card">
            <p className="section-title">Настройки</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Расписание</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {(habit.schedule.days.length === 0
                    ? [1, 2, 3, 4, 5, 6, 0]
                    : habit.schedule.days
                  ).map((day) => (
                    <span
                      key={day}
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    >
                      {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][day]}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Напоминание
                </dt>
                <dd className="mt-1 break-words text-slate-700">
                  {habit.remindAt ? `Каждый день в ${habit.remindAt}` : 'Время не задано'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Цель в день</dt>
                <dd className="mt-1 text-slate-700">{habit.targetCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Создана</dt>
                <dd className="mt-1 text-slate-700">{formatDate(habit.createdAt)}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <Toggle
                checked={habit.notificationsEnabled}
                onChange={(value) => void handleToggleNotifications(value)}
                label="Напоминания о привычке"
                description="Push-уведомления в время напоминания"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
