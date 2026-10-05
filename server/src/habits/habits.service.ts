import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { isScheduledOn, resolveTz, todayInTz } from '../common/utils/dates';
import { computeHabitStats, HabitStatsResult } from '../common/utils/habit-stats';
import { CreateHabitDto, LogHabitDto, UpdateHabitDto } from './dto/habit.dto';
import { HabitLog, HabitLogStatus } from './habit-log.entity';
import { Habit } from './habit.entity';

export interface HabitLogView {
  id: string;
  date: string;
  status: HabitLogStatus;
  note: string | null;
  createdAt: Date;
}

export interface HabitItemView {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  targetCount: number;
  schedule: { days: number[] };
  notificationsEnabled: boolean;
  remindAt: string | null;
  createdAt: Date;
  lastLog: HabitLogView | null;
  today: { done: number; target: number; status: 'done' | 'pending' | 'skipped' | 'none' | 'off' };
}

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(Habit)
    private readonly habitsRepo: Repository<Habit>,
    @InjectRepository(HabitLog)
    private readonly logsRepo: Repository<HabitLog>,
  ) {}

  private tz(): string {
    return resolveTz();
  }

  async findByUser(userId: string): Promise<Habit[]> {
    return this.habitsRepo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  findOwned(id: string, userId: string): Promise<Habit | null> {
    return this.habitsRepo.findOne({ where: { id, userId } });
  }

  async requireOwned(id: string, userId: string): Promise<Habit> {
    const habit = await this.findOwned(id, userId);
    if (!habit) throw new NotFoundException('Привычка не найдена');
    return habit;
  }

  async logsFor(habitIds: string[], from?: string): Promise<Map<string, HabitLog[]>> {
    const grouped = new Map<string, HabitLog[]>();
    if (habitIds.length === 0) return grouped;
    const logs = await this.logsRepo.find({
      where: from
        ? { habitId: In(habitIds), date: MoreThanOrEqual(from) }
        : { habitId: In(habitIds) },
      order: { date: 'ASC' },
    });
    for (const log of logs) {
      const list = grouped.get(log.habitId) ?? [];
      list.push(log);
      grouped.set(log.habitId, list);
    }
    return grouped;
  }

  toLogView(log: HabitLog): HabitLogView {
    return {
      id: log.id,
      date: log.date,
      status: log.status,
      note: log.note,
      createdAt: log.createdAt,
    };
  }

  buildItem(habit: Habit, logs: HabitLog[], today: string): HabitItemView {
    const byDate = new Map<string, HabitLog>();
    let lastLog: HabitLog | null = null;
    for (const log of logs) {
      byDate.set(log.date, log);
      if (!lastLog || log.date > lastLog.date || (log.date === lastLog.date && log.createdAt > lastLog.createdAt)) {
        lastLog = log;
      }
    }

    const todayLog = byDate.get(today);
    const scheduled = isScheduledOn(habit.schedule, today);
    const done = todayLog?.status === 'done' ? habit.targetCount : 0;

    let status: HabitItemView['today']['status'];
    if (todayLog && done >= habit.targetCount) status = 'done';
    else if (todayLog?.status === 'skipped') status = 'skipped';
    else if (scheduled) status = 'pending';
    else status = 'none';

    return {
      id: habit.id,
      userId: habit.userId,
      title: habit.title,
      description: habit.description,
      targetCount: habit.targetCount,
      schedule: habit.schedule,
      notificationsEnabled: habit.notificationsEnabled,
      remindAt: habit.remindAt,
      createdAt: habit.createdAt,
      lastLog: lastLog ? this.toLogView(lastLog) : null,
      today: { done, target: habit.targetCount, status },
    };
  }

  async list(userId: string): Promise<HabitItemView[]> {
    const habits = await this.findByUser(userId);
    const today = todayInTz(this.tz());
    const grouped = await this.logsFor(habits.map(habit => habit.id));
    return habits.map(habit => this.buildItem(habit, grouped.get(habit.id) ?? [], today));
  }

  async create(userId: string, dto: CreateHabitDto): Promise<Habit> {
    const habit = this.habitsRepo.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      targetCount: dto.targetCount ?? 1,
      schedule: dto.schedule ?? { days: [] },
      notificationsEnabled: dto.notificationsEnabled ?? true,
      remindAt: dto.remindAt ?? null,
    });
    return this.habitsRepo.save(habit);
  }

  async update(habit: Habit, dto: UpdateHabitDto): Promise<Habit> {
    if (dto.title !== undefined) habit.title = dto.title;
    if (dto.description !== undefined) habit.description = dto.description ?? null;
    if (dto.targetCount !== undefined) habit.targetCount = dto.targetCount;
    if (dto.schedule !== undefined) habit.schedule = dto.schedule;
    if (dto.notificationsEnabled !== undefined) habit.notificationsEnabled = dto.notificationsEnabled;
    if (dto.remindAt !== undefined) habit.remindAt = dto.remindAt ?? null;
    return this.habitsRepo.save(habit);
  }

  async remove(habit: Habit): Promise<void> {
    await this.habitsRepo.remove(habit);
  }

  async upsertLog(habit: Habit, dto: LogHabitDto): Promise<{ habit: HabitItemView; log: HabitLogView }> {
    const tz = this.tz();
    const date = dto.date ?? todayInTz(tz);
    let log = await this.logsRepo.findOne({ where: { habitId: habit.id, date } });

    if (log) {
      log.status = dto.status;
      log.note = dto.note ?? null;
      log = await this.logsRepo.save(log);
    } else {
      log = await this.logsRepo.save(
        this.logsRepo.create({
          habitId: habit.id,
          date,
          status: dto.status,
          note: dto.note ?? null,
        }),
      );
    }

    const today = todayInTz(tz);
    const logs = await this.logsRepo.find({ where: { habitId: habit.id } });
    return { habit: this.buildItem(habit, logs, today), log: this.toLogView(log) };
  }

  async stats(habit: Habit): Promise<HabitStatsResult> {
    const today = todayInTz(this.tz());
    const from = new Date(`${today}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - 40);
    const logs = await this.logsRepo.find({
      where: { habitId: habit.id, date: MoreThanOrEqual(from.toISOString().slice(0, 10)) },
      order: { date: 'ASC' },
    });
    return computeHabitStats(habit, logs, today, 30);
  }
}
