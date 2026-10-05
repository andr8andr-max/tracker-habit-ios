import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as cron from 'node-cron';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { addDays, isScheduledOn, nowInTz, resolveTz } from '../common/utils/dates';
import { HabitLog } from '../habits/habit-log.entity';
import { Habit } from '../habits/habit.entity';
import { NotificationsService } from './notifications.service';
import { User } from '../users/user.entity';

@Injectable()
export class NotificationsCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Cron');
  private readonly dedup = new Set<string>();
  private dedupDate = '';
  private readonly tasks: cron.ScheduledTask[] = [];

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Habit)
    private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(HabitLog)
    private readonly logsRepo: Repository<HabitLog>,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.tasks.push(cron.schedule('* * * * *', () => void this.tick()));
    this.tasks.push(
      cron.schedule('0 9 * * *', () => {
        const now = nowInTz(resolveTz());
        if (now.hour === 9 && now.minute === 0) {
          this.resetDedup(now.date);
          void this.dailyReport(now.date);
        }
      }),
    );
    this.tasks.push(
      cron.schedule('0 12 * * *', () => {
        const now = nowInTz(resolveTz());
        if (now.hour === 12 && now.minute === 0) {
          this.resetDedup(now.date);
          void this.missedReminder(now.date);
        }
      }),
    );
  }

  onModuleDestroy(): void {
    for (const task of this.tasks) task.stop();
  }

  private resetDedup(date: string): void {
    if (this.dedupDate !== date) {
      this.dedup.clear();
      this.dedupDate = date;
    }
  }

  private mark(key: string): boolean {
    if (this.dedup.has(key)) return false;
    this.dedup.add(key);
    return true;
  }

  private async tick(): Promise<void> {
    try {
      const now = nowInTz(resolveTz());
      this.resetDedup(now.date);
      await this.sendReminders(now.date, now.time);
      if (now.hour === 9 && now.minute === 0) await this.dailyReport(now.date);
      if (now.hour === 12 && now.minute === 0) await this.missedReminder(now.date);
    } catch (error) {
      console.error('Cron tick error:', (error as Error)?.message);
    }
  }

  private async sendReminders(date: string, time: string): Promise<void> {
    const habits = await this.habitsRepo.find({ where: { notificationsEnabled: true, remindAt: time } });
    if (habits.length === 0) return;

    const users = await this.usersRepo.find({ where: { id: In([...new Set(habits.map(h => h.userId))]) } });
    const usersById = new Map(users.map(user => [user.id, user]));

    for (const habit of habits) {
      const user = usersById.get(habit.userId);
      if (!user || !user.notificationsEnabled) continue;
      if (!isScheduledOn(habit.schedule, date)) continue;

      const log = await this.logsRepo.findOne({ where: { habitId: habit.id, date } });
      if (log?.status === 'done') continue;

      if (!this.mark(`reminder|${user.id}|${habit.id}|${date}`)) continue;
      this.logger.log(`Напоминание «${habit.title}» для ${user.email}`);
      await this.notificationsService.sendToUser(user, {
        title: 'Напоминание',
        body: `${habit.title} — время выполнить`,
      });
    }
  }

  private async dailyReport(date: string): Promise<void> {
    const yesterday = addDays(date, -1);
    const users = await this.usersRepo.find({ where: { notificationsEnabled: true } });

    for (const user of users) {
      const habits = await this.habitsRepo.find({ where: { userId: user.id, notificationsEnabled: true } });
      if (habits.length === 0) continue;

      const logs = await this.logsRepo.find({
        where: { habitId: In(habits.map(habit => habit.id)), date: MoreThanOrEqual(yesterday) },
      });
      const logsByHabit = new Map<string, Map<string, HabitLog>>();
      for (const log of logs) {
        const byDate = logsByHabit.get(log.habitId) ?? new Map<string, HabitLog>();
        byDate.set(log.date, log);
        logsByHabit.set(log.habitId, byDate);
      }

      const missedTitles: string[] = [];
      for (const habit of habits) {
        const byDate = logsByHabit.get(habit.id) ?? new Map<string, HabitLog>();
        let missed = false;
        for (const day of [yesterday, date]) {
          if (!isScheduledOn(habit.schedule, day)) continue;
          if (byDate.get(day)?.status !== 'done') {
            missed = true;
            break;
          }
        }
        if (missed) missedTitles.push(habit.title);
      }

      if (missedTitles.length === 0) continue;
      if (!this.mark(`report|${user.id}||${date}`)) continue;

      this.logger.log(`Дневной отчёт для ${user.email}: ${missedTitles.length} пропусков`);
      await this.notificationsService.sendToUser(user, {
        title: 'Дневной отчёт',
        body: `Пропуски: ${missedTitles.join(', ')}`,
      });
    }
  }

  private async missedReminder(date: string): Promise<void> {
    const windowStart = addDays(date, -40);
    const users = await this.usersRepo.find({ where: { notificationsEnabled: true } });

    for (const user of users) {
      const habits = await this.habitsRepo.find({ where: { userId: user.id, notificationsEnabled: true } });
      if (habits.length === 0) continue;

      const logs = await this.logsRepo.find({
        where: { habitId: In(habits.map(habit => habit.id)), date: MoreThanOrEqual(windowStart) },
      });
      const logsByHabit = new Map<string, Map<string, HabitLog>>();
      for (const log of logs) {
        const byDate = logsByHabit.get(log.habitId) ?? new Map<string, HabitLog>();
        byDate.set(log.date, log);
        logsByHabit.set(log.habitId, byDate);
      }

      for (const habit of habits) {
        const byDate = logsByHabit.get(habit.id) ?? new Map<string, HabitLog>();
        let withoutDone = 0;
        for (let offset = 0; offset < 40; offset++) {
          const day = addDays(date, -offset);
          if (!isScheduledOn(habit.schedule, day)) continue;
          if (byDate.get(day)?.status === 'done') break;
          withoutDone += 1;
          if (withoutDone >= 2) break;
        }
        if (withoutDone < 2) continue;
        if (!this.mark(`missed|${user.id}|${habit.id}|${date}`)) continue;

        this.logger.log(`Напоминание о пропуске «${habit.title}» для ${user.email}`);
        await this.notificationsService.sendToUser(user, {
          title: 'Напоминание',
          body: `Не пропускайте: ${habit.title}`,
        });
      }
    }
  }
}
