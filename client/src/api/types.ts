export type Role = 'owner' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  clubId: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Club {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  ownerId: string | null;
}

export type TodayStatus = 'done' | 'pending' | 'skipped' | 'none' | 'off';

export type LogStatus = 'done' | 'skipped' | 'pending';

export interface HabitLog {
  id: string;
  date: string;
  status: LogStatus;
  note: string | null;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId?: string;
  title: string;
  description: string | null;
  targetCount: number;
  schedule: { days: number[] };
  notificationsEnabled: boolean;
  remindAt: string | null;
  createdAt: string;
}

export interface HabitWithToday extends Habit {
  lastLog?: HabitLog | null;
  today?: { done: number; target: number; status: TodayStatus };
}

export interface HabitStats {
  line: { date: string; status: TodayStatus }[];
  streak: number;
  rate: number;
  done: number;
  expected: number;
}

export type ContactTag = 'vip' | 'partner' | 'client' | 'inactive';

export interface Contact {
  id: string;
  userId?: string;
  name: string;
  phone: string | null;
  company: string | null;
  city: string | null;
  tag: ContactTag;
  note: string | null;
  linkedEmployeeId: string | null;
  createdAt: string;
  lastActionAt: string | null;
}

export interface ContactLog {
  id: string;
  action: string;
  durationMin: number | null;
  comment: string | null;
  createdAt: string;
}

export interface ContactDetailPayload {
  contact: Contact;
  logs: ContactLog[];
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  clubId: string | null;
  createdAt: string;
  club: Club;
  globalNotifications: { enabled: boolean; time: string };
}

export interface NotificationSettings {
  enabled: boolean;
  time: string;
  vapidPublicKey: string | null;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } } | null;
  pushSupported: boolean;
}

export interface Employee {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  createdAt: string;
  contactsCount: number;
  habitsCount: number;
}

export interface StatsResponse {
  periodDays: number;
  overall: { expected: number; done: number; rate: number; activeHabits: number };
  habits: { id: string; title: string; expected: number; done: number; rate: number; streak: number }[];
  calendar: { date: string; done: number; expected: number; rate: number }[];
}
