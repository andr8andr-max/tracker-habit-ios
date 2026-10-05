import { Module } from '@nestjs/common';
import { HabitsModule } from '../habits/habits.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [HabitsModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
