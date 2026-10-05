import { Link } from 'react-router-dom';
import type { HabitWithToday } from '../../api/types';
import { scheduleLabel } from '../../lib/format';
import { Icon } from '../ui/Icon';

const STATUS_STYLES: Record<string, string> = {
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  skipped: 'bg-rose-50 text-rose-700 border-rose-200',
  none: 'bg-slate-100 text-slate-500 border-slate-200',
  off: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  done: 'Выполнено',
  pending: 'В ожидании',
  skipped: 'Пропущено',
  none: 'Вне расписания',
  off: 'Вне расписания',
};

interface HabitCardProps {
  habit: HabitWithToday;
  onToggle: (checked: boolean) => void;
  busy?: boolean;
  onDelete?: () => void;
}

export function HabitCard({ habit, onToggle, busy = false, onDelete }: HabitCardProps) {
  const today = habit.today;
  const done = today?.done ?? 0;
  const target = today?.target ?? habit.targetCount;
  const status = today?.status ?? 'none';
  const checked = status === 'done';
  const progress = target > 0 ? Math.min(1, done / target) : 0;

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={busy}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={`Отметить «${habit.title}» выполненной`}
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link
              to={`/habits/${habit.id}`}
              className="break-words text-sm font-semibold text-slate-900 transition hover:text-brand-700"
            >
              {habit.title}
            </Link>
            <span
              className={`chip shrink-0 text-xs ${STATUS_STYLES[status] ?? STATUS_STYLES.none}`}
            >
              {STATUS_LABELS[status] ?? STATUS_LABELS.none}
            </span>
          </div>
          {habit.description ? (
            <p className="mt-1 break-words text-sm text-slate-500">{habit.description}</p>
          ) : null}
        </div>
        <Link
          to={`/habits/${habit.id}`}
          aria-label="Открыть привычку"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
        >
          <Icon name="chevronRight" className="h-5 w-5" />
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Прогресс: <span className="font-semibold text-slate-700">{done}</span> из{' '}
            <span className="font-semibold text-slate-700">{target}</span>
          </span>
          <span>{scheduleLabel(habit.schedule.days)}</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              checked ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {habit.remindAt ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="h-4 w-4" />
              {habit.remindAt}
            </span>
          ) : null}
          <span className={`inline-flex items-center gap-1 ${habit.notificationsEnabled ? 'text-brand-600' : ''}`}>
            <Icon name="bell" className="h-4 w-4" />
            {habit.notificationsEnabled ? 'Напоминания вкл.' : 'Напоминания выкл.'}
          </span>
        </div>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <Icon name="trash" className="h-4 w-4" />
            Удалить
          </button>
        ) : null}
      </div>
    </div>
  );
}
