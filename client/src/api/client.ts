import { useUI } from '../store/ui';
import type { LoginResponse } from './types';

const BASE = '/api';
const ACCESS_KEY = 'ht.accessToken';
const REFRESH_KEY = 'ht.refreshToken';

export const tokenStore = {
  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  sessionExpiredHandler = handler;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | null | undefined>;
  silent?: boolean;
  skipAuth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const search = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    }
  }
  const qs = search.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ''}`;
}

function readMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const raw = (data as { message?: unknown }).message;
    if (Array.isArray(raw)) {
      const joined = raw.filter((item): item is string => typeof item === 'string').join(', ');
      if (joined.trim()) return joined.trim();
    } else if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
  }
  return fallback;
}

let refreshPromise: Promise<LoginResponse | null> | null = null;

export function refreshTokens(): Promise<LoginResponse | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function performRefresh(): Promise<LoginResponse | null> {
  const refreshToken = tokenStore.refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as LoginResponse;
    if (!data || !data.accessToken || !data.refreshToken) return null;
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  } catch {
    return null;
  }
}

async function execute<T>(path: string, options: RequestOptions, retry: boolean): Promise<T> {
  const { method = 'GET', body, query, silent, skipAuth } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!skipAuth) {
    const access = tokenStore.accessToken;
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new ApiError(0, 'Нет связи с сервером');
    if (!silent) useUI.getState().toast('error', error.message);
    throw error;
  }

  if (res.status === 401 && !skipAuth && retry && !path.startsWith('/auth/')) {
    const refreshed = await refreshTokens();
    if (refreshed) return execute<T>(path, options, false);
    tokenStore.clear();
    sessionExpiredHandler?.();
    const error = new ApiError(401, 'Сессия истекла — войдите снова');
    if (!silent) useUI.getState().toast('error', error.message);
    throw error;
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const error = new ApiError(res.status, readMessage(data, `Ошибка запроса (${res.status})`));
    if (!silent) useUI.getState().toast('error', error.message);
    throw error;
  }

  return data as T;
}

type SimpleOptions = Omit<RequestOptions, 'method' | 'body'>;

export function apiGet<T>(path: string, options: SimpleOptions = {}): Promise<T> {
  return execute<T>(path, { ...options, method: 'GET' }, true);
}

export function apiPost<T>(path: string, body?: unknown, options: SimpleOptions = {}): Promise<T> {
  return execute<T>(path, { ...options, method: 'POST', body }, true);
}

export function apiPatch<T>(path: string, body?: unknown, options: SimpleOptions = {}): Promise<T> {
  return execute<T>(path, { ...options, method: 'PATCH', body }, true);
}

export function apiDelete<T>(path: string, options: SimpleOptions = {}): Promise<T> {
  return execute<T>(path, { ...options, method: 'DELETE' }, true);
}
