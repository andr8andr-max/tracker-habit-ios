import { CreateDateColumn, Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export type UserRole = 'owner' | 'employee';

export interface StoredPushSubscription {
  endpoint: string;
  expirationTime?: string | null;
  keys?: { p256dh?: string; auth?: string };
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;

  @Column({ name: 'club_id', type: 'uuid', nullable: true })
  clubId: string | null;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'notifications_enabled', type: 'boolean', default: true })
  notificationsEnabled: boolean;

  @Column({ name: 'notifications_time', type: 'varchar', length: 5, default: '09:00' })
  notificationsTime: string;

  @Column({ name: 'push_subscription', type: 'jsonb', nullable: true })
  pushSubscription: StoredPushSubscription | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
