import { create } from 'zustand';
import { apiPost, refreshTokens, setSessionExpiredHandler, tokenStore } from '../api/client';
import type { LoginResponse, User } from '../api/types';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    void 0;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: tokenStore.accessToken,
  refreshToken: tokenStore.refreshToken,
  initialized: false,
  init: async () => {
    if (!tokenStore.refreshToken) {
      set({ initialized: true, user: null, accessToken: null, refreshToken: null });
      return;
    }
    const data = await refreshTokens();
    if (data) {
      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        initialized: true,
      });
      await registerServiceWorker();
    } else {
      tokenStore.clear();
      set({ user: null, accessToken: null, refreshToken: null, initialized: true });
    }
  },
  login: async (email, password) => {
    const data = await apiPost<LoginResponse>(
      '/auth/login',
      { email, password },
      { skipAuth: true, silent: true },
    );
    tokenStore.set(data.accessToken, data.refreshToken);
    set({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      initialized: true,
    });
    await registerServiceWorker();
  },
  register: async (input) => {
    await apiPost('/auth/register', input, { skipAuth: true, silent: true });
  },
  logout: async () => {
    const refreshToken = tokenStore.refreshToken;
    if (refreshToken) {
      try {
        await apiPost('/auth/logout', { refreshToken }, { silent: true });
      } catch {
        void 0;
      }
    }
    tokenStore.clear();
    set({ user: null, accessToken: null, refreshToken: null });
  },
  setUser: (user) => set({ user }),
}));

setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
});
