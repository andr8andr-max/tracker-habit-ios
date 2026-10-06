import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Habit } from './habit.entity';

export type HabitLogStatus = 'done' | 'skipped' | 'pending';

@Entity('habit_logs')
@Index(['habitId', 'date'], { unique: true })
export class HabitLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'habit_id', type: 'uuid' })
  habitId: string;

  @ManyToOne(() => Habit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'habit_id' })
  habit: Habit;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 20 })
  status: HabitLogStatus;

  @Column({ type: 'int', nullable: true })
  count: number | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
