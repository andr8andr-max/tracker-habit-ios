import { create } from 'zustand';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api/client';
import type { Habit, HabitStats, HabitWithToday, LogStatus } from '../api/types';

export interface HabitInput {
  title: string;
  description: string | null;
  targetCount: number;
  schedule: { days: number[] };
  notificationsEnabled: boolean;
  remindAt: string | null;
}

interface HabitsState {
  items: HabitWithToday[];
  loading: boolean;
  loaded: boolean;
  fetchHabits: () => Promise<void>;
  createHabit: (input: HabitInput) => Promise<Habit>;
  updateHabit: (id: string, input: Partial<HabitInput>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  logHabit: (id: string, status: LogStatus, date?: string) => Promise<void>;
  incrementHabit: (id: string) => Promise<void>;
  getStats: (id: string) => Promise<HabitStats>;
}

export const useHabits = create<HabitsState>((set, get) => ({
  items: [],
  loading: false,
  loaded: false,
  fetchHabits: async () => {
    set({ loading: true });
    try {
      const items = await apiGet<HabitWithToday[]>('/habits');
      set({ items, loaded: true });
    } finally {
      set({ loading: false });
    }
  },
  createHabit: async (input) => {
    const habit = await apiPost<Habit>('/habits', input);
    set((state) => ({ items: [...state.items, { ...habit, today: { done: 0, target: habit.targetCount, status: 'none' } }] }));
    return habit;
  },
  updateHabit: async (id, input) => {
    const updated = await apiPatch<Habit>(`/habits/${id}`, input);
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updated } : item)),
    }));
  },
  deleteHabit: async (id) => {
    await apiDelete(`/habits/${id}`);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },
  logHabit: async (id, status, date) => {
    await apiPost(`/habits/${id}/log`, { status, ...(date ? { date } : {}) });
    await get().fetchHabits();
  },
  incrementHabit: async (id) => {
    const item = get().items.find((habit) => habit.id === id);
    if (!item) return;
    const target = item.today?.target ?? item.targetCount;
    const next = Math.min(target, (item.today?.done ?? 0) + 1);
    await apiPost(`/habits/${id}/log`, { status: 'pending', count: next });
    await get().fetchHabits();
  },
  getStats: async (id) => {
    return apiGet<HabitStats>(`/habits/${id}/stats`);
  },
}));
