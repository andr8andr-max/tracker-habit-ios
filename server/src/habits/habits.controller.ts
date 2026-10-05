import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { CreateHabitDto, LogHabitDto, UpdateHabitDto } from './dto/habit.dto';
import { HabitsService } from './habits.service';

@Controller('habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.habitsService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateHabitDto) {
    return this.habitsService.create(user.id, dto);
  }

  @Get(':id/stats')
  async stats(@CurrentUser() user: User, @Param('id') id: string) {
    const habit = await this.habitsService.requireOwned(id, user.id);
    return this.habitsService.stats(habit);
  }

  @Patch(':id')
  async update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateHabitDto) {
    const habit = await this.habitsService.requireOwned(id, user.id);
    return this.habitsService.update(habit, dto);
  }

  @Delete(':id')
  @HttpCode(201)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    const habit = await this.habitsService.requireOwned(id, user.id);
    await this.habitsService.remove(habit);
    return { ok: true };
  }

  @Post(':id/log')
  async log(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: LogHabitDto) {
    const habit = await this.habitsService.requireOwned(id, user.id);
    return this.habitsService.upsertLog(habit, dto);
  }
}
