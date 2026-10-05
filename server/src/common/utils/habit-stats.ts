import { Habit } from '../../habits/habit.entity';
import { HabitLog } from '../../habits/habit-log.entity';
import { isScheduledOn, lastNDates, round2 } from './dates';

export type DayStatus = 'done' | 'skipped' | 'pending' | 'off';

export interface DayPoint {
  date: string;
  status: DayStatus;
}

export interface HabitStatsResult {
  line: DayPoint[];
  streak: number;
  rate: number;
  done: number;
  expected: number;
}

export function buildLine(
  habit: Habit,
  dates: string[],
  logsByDate: Map<string, HabitLog>,
): DayPoint[] {
  return dates.map(date => {
    const log = logsByDate.get(date);
    if (log) return { date, status: log.status as DayStatus };
    return { date, status: isScheduledOn(habit.schedule, date) ? 'pending' : 'off' };
  });
}

export function computeStreak(line: DayPoint[]): number {
  if (line.length === 0) return 0;
  let index = line.length - 1;
  const last = line[index];
  if (last.status === 'pending' || last.status === 'skipped') index -= 1;

  let streak = 0;
  for (; index >= 0; index--) {
    const status = line[index].status;
    if (status === 'off') continue;
    if (status === 'done') streak += 1;
    else break;
  }
  return streak;
}

export function computeHabitStats(
  habit: Habit,
  logs: HabitLog[],
  today: string,
  windowDays = 30,
): HabitStatsResult {
  const dates = lastNDates(windowDays, today);
  const logsByDate = new Map<string, HabitLog>();
  for (const log of logs) logsByDate.set(log.date, log);

  const line = buildLine(habit, dates, logsByDate);
  const streak = computeStreak(line);

  let expected = 0;
  let done = 0;
  for (const point of line) {
    if (!isScheduledOn(habit.schedule, point.date)) continue;
    expected += 1;
    if (point.status === 'done') done += 1;
  }

  return {
    line,
    streak,
    rate: expected > 0 ? round2(done / expected) : 0,
    done,
    expected,
  };
}
