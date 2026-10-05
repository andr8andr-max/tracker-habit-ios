import { create } from 'zustand';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api/client';
import type { Employee, NotificationSettings, Profile } from '../api/types';

export interface ProfileInput {
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface EmployeeInput {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
}

export interface ClubInput {
  name?: string;
  logoUrl?: string | null;
  address?: string | null;
}

interface ProfileState {
  profile: Profile | null;
  notifications: NotificationSettings | null;
  employees: Employee[];
  loading: boolean;
  employeesLoading: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<number>;
  fetchNotifications: () => Promise<void>;
  updateNotifications: (input: { enabled: boolean; time: string }) => Promise<void>;
  fetchEmployees: () => Promise<void>;
  createEmployee: (input: EmployeeInput) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  updateClub: (input: ClubInput) => Promise<void>;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  notifications: null,
  employees: [],
  loading: false,
  employeesLoading: false,
  fetchProfile: async () => {
    set({ loading: true });
    try {
      const profile = await apiGet<Profile>('/profile');
      set({ profile });
    } finally {
      set({ loading: false });
    }
  },
  updateProfile: async (input) => {
    const profile = await apiPatch<Profile>('/profile', input);
    set({ profile });
  },
  changePassword: async (currentPassword, newPassword) => {
    const result = await apiPatch<{ ok: boolean; revokedSessions: number }>(
      '/profile/password',
      { currentPassword, newPassword },
    );
    return result.revokedSessions ?? 0;
  },
  fetchNotifications: async () => {
    const notifications = await apiGet<NotificationSettings>('/profile/notifications');
    set({ notifications });
  },
  updateNotifications: async (input) => {
    const notifications = await apiPatch<{ enabled: boolean; time: string }>(
      '/profile/notifications',
      input,
    );
    set((state) => ({
      notifications: state.notifications ? { ...state.notifications, ...notifications } : state.notifications,
    }));
  },
  fetchEmployees: async () => {
    set({ employeesLoading: true });
    try {
      const employees = await apiGet<Employee[]>('/owner/employees');
      set({ employees });
    } finally {
      set({ employeesLoading: false });
    }
  },
  createEmployee: async (input) => {
    await apiPost('/owner/employees', input);
    await get().fetchEmployees();
  },
  deleteEmployee: async (id) => {
    await apiDelete(`/owner/employees/${id}`);
    set((state) => ({ employees: state.employees.filter((item) => item.id !== id) }));
  },
  updateClub: async (input) => {
    await apiPatch('/owner/club', input);
    await get().fetchProfile();
  },
}));
