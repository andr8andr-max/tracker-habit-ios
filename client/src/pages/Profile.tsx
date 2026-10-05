import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { formatDateTime, initials } from '../lib/format';
import { useAuthStore } from '../store/auth';
import { useProfile } from '../store/profile';
import { useUI } from '../store/ui';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец клуба',
  employee: 'Сотрудник',
};

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const profile = useProfile((state) => state.profile);
  const loading = useProfile((state) => state.loading);
  const fetchProfile = useProfile((state) => state.fetchProfile);
  const updateProfile = useProfile((state) => state.updateProfile);
  const changePassword = useProfile((state) => state.changePassword);
  const toast = useUI((state) => state.toast);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
      setAvatarUrl(profile.avatarUrl ?? '');
    }
  }, [profile]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast('error', 'Имя не может быть пустым');
      return;
    }
    setSaveBusy(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      if (user) {
        setUser({
          ...user,
          name: name.trim(),
          phone: phone.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        });
      }
      toast('success', 'Профиль сохранён');
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('Новый пароль — минимум 6 символов');
      return;
    }
    if (newPassword !== repeatPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    setPasswordError('');
    setPasswordBusy(true);
    try {
      const revoked = await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      toast('success', `Пароль изменён. Закрыто других сессий: ${revoked}`);
    } catch {
      setPasswordError('Не удалось сменить пароль — проверьте текущий пароль');
    } finally {
      setPasswordBusy(false);
    }
  }

  if (!profile && loading) {
    return (
      <div>
        <PageHeader title="Профиль" />
        <InlineSpinner label="Загружаем профиль…" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <PageHeader title="Профиль" />
        <EmptyState
          title="Профиль недоступен"
          description="Не удалось загрузить данные. Попробуйте обновить страницу."
          icon={<Icon name="user" className="h-6 w-6" />}
        />
      </div>
    );
  }

  return (
        <div className="lg:max-w-[calc((200%_-_20px)/3)]">
      <PageHeader title="Профиль" subtitle="Личные данные, пароль и уведомления" />

      <div className="space-y-5">
        <section className="card">
          <div className="mb-5 flex items-center gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-100"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
                {initials(profile.name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="break-words text-base font-semibold text-slate-900">
                {profile.name}
              </p>
              <p className="break-words text-sm text-slate-500">{profile.email}</p>
              <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Имя">
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
              <Field label="Телефон">
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+7 900 000-00-00"
                  inputMode="tel"
                />
              </Field>
            </div>
            <Field label="Ссылка на аватар" hint="Прямая ссылка на изображение, необязательно">
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </Field>
            <Button type="submit" loading={saveBusy}>
              Сохранить профиль
            </Button>
          </form>
        </section>

        <section className="card">
          <p className="section-title">Смена пароля</p>
          <p className="mt-1 text-sm text-slate-500">
            После смены пароля остальные сессии будут завершены.
          </p>
          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Текущий пароль">
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Field label="Новый пароль" hint="Минимум 6 символов">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
            </div>
            <Field label="Повторите новый пароль" error={passwordError || undefined}>
              <Input
                type="password"
                value={repeatPassword}
                onChange={(event) => setRepeatPassword(event.target.value)}
                autoComplete="new-password"
                invalid={Boolean(passwordError)}
                required
              />
            </Field>
            <Button type="submit" variant="secondary" loading={passwordBusy}>
              Сменить пароль
            </Button>
          </form>
        </section>

        <section className="card">
          <p className="section-title">Аккаунт</p>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt>
              <dd className="mt-1 break-words text-sm text-slate-700">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Клуб</dt>
              <dd className="mt-1 break-words text-sm text-slate-700">
                {profile.club?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Роль</dt>
              <dd className="mt-1 text-sm text-slate-700">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Дата регистрации
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{formatDateTime(profile.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Глобальные уведомления:{' '}
            <strong>{profile.globalNotifications?.enabled ? 'включены' : 'выключены'}</strong>,
            время <strong>{profile.globalNotifications?.time ?? '—'}</strong>.{' '}
            <Link
              to="/profile/notifications"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Настроить
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
