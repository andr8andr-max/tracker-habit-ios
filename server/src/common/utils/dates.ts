export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveTz(): string {
  return process.env.TZ || 'Europe/Moscow';
}

export interface CurrentParts {
  date: string;
  time: string;
  hour: number;
  minute: number;
}

export function nowInTz(tz: string): CurrentParts {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type: string): string => parts.find(part => part.type === type)?.value ?? '00';
    const hour = Number(get('hour'));
    const minute = Number(get('minute'));
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      hour,
      minute,
    };
  } catch {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    return { date, time, hour: now.getUTCHours(), minute: now.getUTCMinutes() };
  }
}

export function todayInTz(tz: string): string {
  return nowInTz(tz).date;
}

export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

export function addDays(dateStr: string, delta: number): string {
  const base = new Date(`${dateStr}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + delta);
  return base.toISOString().slice(0, 10);
}

export function lastNDates(count: number, endDate: string): string[] {
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    dates.push(addDays(endDate, -i));
  }
  return dates;
}

export interface ScheduleLike {
  days?: number[] | null;
}

export function isScheduledOn(schedule: ScheduleLike | null | undefined, dateStr: string): boolean {
  const days = schedule?.days ?? [];
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.includes(weekdayOf(dateStr));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
