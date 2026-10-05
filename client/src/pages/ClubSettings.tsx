import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { useProfile } from '../store/profile';
import { useUI } from '../store/ui';

export default function ClubSettings() {
  const profile = useProfile((state) => state.profile);
  const loading = useProfile((state) => state.loading);
  const fetchProfile = useProfile((state) => state.fetchProfile);
  const updateClub = useProfile((state) => state.updateClub);
  const toast = useUI((state) => state.toast);

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile?.club) {
      setName(profile.club.name ?? '');
      setLogoUrl(profile.club.logoUrl ?? '');
      setAddress(profile.club.address ?? '');
    }
  }, [profile?.club]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast('error', 'Название клуба не может быть пустым');
      return;
    }
    setBusy(true);
    try {
      await updateClub({
        name: name.trim(),
        logoUrl: logoUrl.trim() || null,
        address: address.trim() || null,
      });
      toast('success', 'Настройки клуба сохранены');
    } finally {
      setBusy(false);
    }
  }

  if (!profile && loading) {
    return (
      <div>
        <PageHeader title="Настройки клуба" backTo="/" backLabel="На главную" />
        <InlineSpinner label="Загружаем клуб…" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <PageHeader title="Настройки клуба" backTo="/" backLabel="На главную" />
        <EmptyState
          title="Клуб недоступен"
          description="Не удалось загрузить данные клуба."
          icon={<Icon name="building" className="h-6 w-6" />}
        />
      </div>
    );
  }

  return (
      <div className="lg:max-w-[calc((200%_-_20px)/3)]">
      <PageHeader
        title="Настройки клуба"
        subtitle="Название, логотип и адрес — видны всем участникам"
        backTo="/"
        backLabel="На главную"
      />

      <form onSubmit={handleSubmit} className="card space-y-4">
        <Field label="Название клуба">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Мой клуб"
            required
          />
        </Field>
        <Field label="Ссылка на логотип" hint="Прямая ссылка на изображение, необязательно">
          <Input
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
            placeholder="https://example.com/logo.png"
          />
        </Field>
        <Field label="Адрес" hint="Необязательно">
          <Input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Москва, ул. Примерная, 1"
          />
        </Field>

        {logoUrl.trim() ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <img
              src={logoUrl}
              alt="Предпросмотр логотипа"
              className="h-12 w-12 rounded-lg object-cover"
              onError={(event) => {
                event.currentTarget.style.visibility = 'hidden';
              }}
            />
            <p className="break-words text-xs text-slate-500">Предпросмотр логотипа</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy}>
            Сохранить
          </Button>
        </div>
      </form>

      <p className="mt-4 break-words text-xs text-slate-400">
        ID клуба: {profile.club?.id ?? '—'}
      </p>
    </div>
  );
}
