import { Injectable } from '@nestjs/common';
import { buildLine, computeHabitStats } from '../common/utils/habit-stats';
import { isScheduledOn, lastNDates, resolveTz, round2, todayInTz } from '../common/utils/dates';
import { HabitsService } from '../habits/habits.service';
import { User } from '../users/user.entity';

@Injectable()
export class StatsService {
  constructor(private readonly habitsService: HabitsService) {}

  async habitsStats(user: User) {
    const today = todayInTz(resolveTz());
    const dates = lastNDates(30, today);
    const habits = await this.habitsService.findByUser(user.id);

    const from = new Date(`${today}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - 40);
    const grouped = await this.habitsService.logsFor(
      habits.map(habit => habit.id),
      from.toISOString().slice(0, 10),
    );

    let overallExpected = 0;
    let overallDone = 0;
    const habitRows = habits.map(habit => {
      const stats = computeHabitStats(habit, grouped.get(habit.id) ?? [], today, 30);
      overallExpected += stats.expected;
      overallDone += stats.done;
      return {
        id: habit.id,
        title: habit.title,
        expected: stats.expected,
        done: stats.done,
        rate: stats.rate,
        streak: stats.streak,
      };
    });

    const lines = habits.map(habit => buildLine(habit, dates, new Map((grouped.get(habit.id) ?? []).map(log => [log.date, log]))));

    const calendar = dates.map((date, index) => {
      let expected = 0;
      let done = 0;
      habits.forEach((habit, habitIndex) => {
        if (!isScheduledOn(habit.schedule, date)) return;
        expected += 1;
        if (lines[habitIndex][index].status === 'done') done += 1;
      });
      return { date, done, expected, rate: expected > 0 ? round2(done / expected) : 0 };
    });

    return {
      periodDays: 30,
      overall: {
        expected: overallExpected,
        done: overallDone,
        rate: overallExpected > 0 ? round2(overallDone / overallExpected) : 0,
        activeHabits: habits.length,
      },
      habits: habitRows,
      calendar,
    };
  }
}
