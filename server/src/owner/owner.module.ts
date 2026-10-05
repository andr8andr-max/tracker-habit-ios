import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/contact.entity';
import { Habit } from '../habits/habit.entity';
import { OwnerController } from './owner.controller';
import { OwnerService } from './owner.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Habit])],
  controllers: [OwnerController],
  providers: [OwnerService],
})
export class OwnerModule {}
