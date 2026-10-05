import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Habit } from '../../api/types';
import type { HabitInput } from '../../store/habits';
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from '../../lib/format';
import { Button } from '../ui/Button';
import { Field, Input, Textarea, Toggle } from '../ui/Input';

interface HabitFormProps {
  initial?: Habit | null;
  submitLabel: string;
  onSubmit: (input: HabitInput) => Promise<void>;
  onCancel?: () => void;
}

export function HabitForm({ initial, submitLabel, onSubmit, onCancel }: HabitFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [targetCount, setTargetCount] = useState(initial?.targetCount ?? 1);
  const [days, setDays] = useState<number[]>(initial?.schedule?.days ?? []);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initial?.notificationsEnabled ?? true,
  );
  const [remindAt, setRemindAt] = useState(initial?.remindAt ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Введите название привычки');
      return;
    }
    if (trimmed.length > 120) {
      setError('Название не длиннее 120 символов');
      return;
    }
    const target = Number(targetCount);
    if (!Number.isFinite(target) || target < 1 || target > 10) {
      setError('Цель в день — от 1 до 10');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        title: trimmed,
        description: description.trim() ? description.trim() : null,
        targetCount: Math.round(target),
        schedule: { days: [...days].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)) },
        notificationsEnabled,
        remindAt: remindAt || null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Название" error={error && !title.trim() ? error : undefined}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например, Медитация"
          maxLength={120}
          invalid={Boolean(error) && !title.trim()}
          required
        />
      </Field>

      <Field label="Описание" hint="Необязательно — подскажет, зачем это нужно">
        <Textarea
          value={description ?? ''}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Зачем вы это делаете"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Выполнений в день" hint="От 1 до 10">
          <Input
            type="number"
            min={1}
            max={10}
            value={targetCount}
            onChange={(event) => setTargetCount(Number(event.target.value))}
          />
        </Field>
        <Field label="Время напоминания" hint="Локальное время, необязательно">
          <Input type="time" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} />
        </Field>
      </div>

      <Field
        label="Расписание"
        hint={
          days.length === 0
            ? 'Дни не выбраны — привычка ежедневная'
            : `Выбрано дней: ${days.length}`
        }
      >
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`chip ${days.includes(day) ? 'chip-active' : 'chip-idle'}`}
              aria-pressed={days.includes(day)}
            >
              {WEEKDAY_LABELS[day]}
            </button>
          ))}
        </div>
      </Field>

      <div className="card bg-slate-50 p-4">
        <Toggle
          checked={notificationsEnabled}
          onChange={setNotificationsEnabled}
          label="Напоминания о привычке"
          description="Браузерные push-уведомления в выбранное время"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
