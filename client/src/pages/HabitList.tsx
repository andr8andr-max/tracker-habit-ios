import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HabitWithToday } from '../api/types';
import { HabitCard } from '../components/habit/HabitCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { isScheduledToday } from '../lib/format';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useHabits } from '../store/habits';
import { useUI } from '../store/ui';

export default function HabitList() {
  const items = useHabits((state) => state.items);
  const loading = useHabits((state) => state.loading);
  const fetchHabits = useHabits((state) => state.fetchHabits);
  const logHabit = useHabits((state) => state.logHabit);
  const incrementHabit = useHabits((state) => state.incrementHabit);
  const deleteHabit = useHabits((state) => state.deleteHabit);
  const openConfirm = useUI((state) => state.openConfirm);
  const toast = useUI((state) => state.toast);
  const [logBusy, setLogBusy] = useState<string | null>(null);
  const isWide = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    void fetchHabits();
  }, [fetchHabits]);

  const dayOfWeek = new Date().getDay();
  const scheduled: HabitWithToday[] = items.filter((habit) =>
    isScheduledToday(habit.schedule.days, dayOfWeek),
  );
  const doneToday = scheduled.filter((habit) => habit.today?.status === 'done').length;
  const progress = scheduled.length > 0 ? doneToday / scheduled.length : 0;
  const columns: HabitWithToday[][] = isWide
    ? [
        items.filter((_, index) => index % 2 === 0),
        items.filter((_, index) => index % 2 === 1),
      ]
    : [items];

  async function handleToggle(habit: HabitWithToday, checked: boolean) {
    setLogBusy(habit.id);
    try {
      await logHabit(habit.id, checked ? 'done' : 'pending');
    } finally {
      setLogBusy(null);
    }
  }

  async function handleIncrement(habit: HabitWithToday) {
    setLogBusy(habit.id);
    try {
      await incrementHabit(habit.id);
    } finally {
      setLogBusy(null);
    }
  }

  function handleDelete(habit: HabitWithToday) {
    openConfirm({
      title: 'Удалить привычку?',
      message: `Привычка «${habit.title}» и вся её история будут удалены навсегда.`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        await deleteHabit(habit.id);
        toast('success', 'Привычка удалена');
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Привычки"
        subtitle="Ваш список привычек и прогресс за сегодня"
        actions={
          <Link
            to="/habits/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            <Icon name="plus" className="h-4 w-4" />
            Новая привычка
          </Link>
        }
      />

      <section className="card mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-title">Прогресс дня</p>
            <p className="mt-1 text-sm text-slate-500">
              Выполнено {doneToday} из {scheduled.length} запланированных на сегодня
            </p>
          </div>
          <span className="text-lg font-semibold text-brand-700">
            {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </section>

      {loading && items.length === 0 ? (
        <InlineSpinner label="Загружаем привычки…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Привычек пока нет"
          description="Создайте первую привычку: укажите цель, дни недели и время напоминания."
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
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-4">
              {column.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  busy={logBusy === habit.id}
                  onToggle={(checked) => void handleToggle(habit, checked)}
                  onIncrement={() => void handleIncrement(habit)}
                  onDelete={() => handleDelete(habit)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && scheduled.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">
          На сегодня по расписанию ничего нет — посмотрите план на неделю.
        </p>
      ) : null}

      <div className="mt-6">
        <Button variant="ghost" onClick={() => void fetchHabits()} loading={loading}>
          Обновить список
        </Button>
      </div>
    </div>
  );
}
