import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/auth';
import { useUI } from '../store/ui';

type Mode = 'login' | 'bootstrap';

function errorMessage(error: unknown, fallback401?: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401 && fallback401) return fallback401;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Что-то пошло не так';
}

export default function Login() {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const toast = useUI((state) => state.toast);
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (initialized && user) return <Navigate to="/" replace />;

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Заполните email и пароль');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Неверный email или пароль'));
    } finally {
      setBusy(false);
    }
  }

  async function handleBootstrap(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Введите имя владельца');
      return;
    }
    if (!email.trim()) {
      setError('Введите email');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await register({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || null,
      });
      await login(email.trim(), password);
      toast('success', 'Владелец клуба создан — добро пожаловать!');
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-soft">
            Т
          </span>
          <h1 className="mt-4 break-words text-2xl font-semibold text-slate-900">
            Клуб предпринимателей
          </h1>
          <p className="mt-1 break-words text-sm text-slate-500">
            Трекер привычек и контактов клуба
          </p>
        </div>

        <div className="card">
          <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('bootstrap');
                setError('');
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'bootstrap' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Первый аккаунт
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Пароль">
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </Field>
              {error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
              <Button type="submit" loading={busy} className="w-full">
                Войти
              </Button>
            </form>
          ) : (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
                Форма создания первого аккаунта работает, когда на сервере ещё нет пользователей:
                создаётся владелец клуба. Сотрудников затем добавляйте в разделе «Сотрудники».
              </p>
              <Field label="Имя владельца">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Иван Иванов"
                  required
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@example.com"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Пароль" hint="Минимум 6 символов">
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label="Телефон" hint="Необязательно">
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+7 900 000-00-00"
                  inputMode="tel"
                />
              </Field>
              {error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
              <Button type="submit" loading={busy} className="w-full">
                Создать аккаунт владельца
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {initialized ? (
            <>
              Нет аккаунта?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('bootstrap');
                  setError('');
                }}
                className="font-medium text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline"
              >
                Создать первый аккаунт
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              Восстанавливаем сессию…
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
