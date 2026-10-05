import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost } from '../api/client';
import type { NotificationSettings as NotificationSettingsData } from '../api/types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Input, Toggle } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { scheduleLabel } from '../lib/format';
import { useHabits } from '../store/habits';
import { useProfile } from '../store/profile';
import { useUI } from '../store/ui';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export default function NotificationSettings() {
  const notifications = useProfile((state) => state.notifications);
  const fetchNotifications = useProfile((state) => state.fetchNotifications);
  const updateNotifications = useProfile((state) => state.updateNotifications);
  const habits = useHabits((state) => state.items);
  const fetchHabits = useHabits((state) => state.fetchHabits);
  const updateHabit = useHabits((state) => state.updateHabit);
  const toast = useUI((state) => state.toast);

  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState('09:00');
  const [dirty, setDirty] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const supported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  const subscribed = Boolean(notifications?.subscription);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchNotifications(), fetchHabits()]);
      } catch {
        if (!cancelled) toast('error', 'Не удалось загрузить настройки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchNotifications, fetchHabits, toast]);

  useEffect(() => {
    if (notifications) {
      setEnabled(notifications.enabled);
      setTime(notifications.time);
      setDirty(false);
    }
  }, [notifications]);

  async function handleSave() {
    setSaveBusy(true);
    try {
      await updateNotifications({ enabled, time });
      setDirty(false);
      toast('success', 'Настройки уведомлений сохранены');
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleSubscribe() {
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast('info', 'Браузер не разрешил уведомления — измените разрешение в настройках сайта');
        return;
      }
      let data = notifications;
      if (!data?.vapidPublicKey) {
        data = await apiGet<NotificationSettingsData>('/profile/notifications');
      }
      if (!data?.vapidPublicKey) {
        toast('error', 'Сервер не передал VAPID-ключ');
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey),
      });
      await apiPost('/profile/push/subscribe', subscription.toJSON());
      await fetchNotifications();
      toast('success', 'Уведомления браузера включены');
    } catch {
      toast('error', 'Не удалось подписаться на уведомления');
    } finally {
      setPushBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      await apiDelete('/profile/push/subscribe');
      await fetchNotifications();
      toast('success', 'Уведомления браузера отключены');
    } catch {
      toast('error', 'Не удалось отключить уведомления');
    } finally {
      setPushBusy(false);
    }
  }

  async function handleHabitToggle(habitId: string, title: string, value: boolean) {
    await updateHabit(habitId, { notificationsEnabled: value });
    toast(
      'success',
      value ? `Напоминания «${title}» включены` : `Напоминания «${title}» выключены`,
    );
  }

  if (loading && !notifications) {
    return (
      <div>
        <PageHeader title="Уведомления" />
        <InlineSpinner label="Загружаем настройки…" />
      </div>
    );
  }

  return (
        <div className="lg:max-w-[calc((200%_-_20px)/3)]">
      <PageHeader
        title="Уведомления"
        subtitle="Глобальные настройки, push в браузере и напоминания по привычкам"
      />

      <div className="space-y-5">
        <section className="card">
          <p className="section-title">Глобальные уведомления</p>
          <p className="mt-1 text-sm text-slate-500">
            Дневной отчёт и сводка о пропусках приходят ежедневно в указанное время.
          </p>
          <div className="mt-4 space-y-4">
            <Toggle
              checked={enabled}
              onChange={(value) => {
                setEnabled(value);
                setDirty(true);
              }}
              label="Получать уведомления"
              description="Общие отчёты по привычкам клуба"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Время отчёта" hint="Формат ЧЧ:ММ, локальное время">
                <Input
                  type="time"
                  value={time}
                  onChange={(event) => {
                    setTime(event.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
            <Button
              loading={saveBusy}
              disabled={!dirty}
              onClick={() => void handleSave()}
            >
              Сохранить настройки
            </Button>
          </div>
        </section>

        <section className="card">
          <p className="section-title">Уведомления браузера</p>
          {supported ? (
            <>
              <p className="mt-1 break-words text-sm text-slate-500">
                Разрешите браузеру показывать push-уведомления — напоминания будут приходить,
                даже когда вкладка закрыта.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {subscribed ? (
                  <Button
                    variant="secondary"
                    loading={pushBusy}
                    onClick={() => void handleUnsubscribe()}
                  >
                    Отключить уведомления браузера
                  </Button>
                ) : (
                  <Button loading={pushBusy} onClick={() => void handleSubscribe()}>
                    <Icon name="bell" className="h-4 w-4" />
                    Включить уведомления браузера
                  </Button>
                )}
              </div>
              <p className="mt-3 break-words text-xs text-slate-400">
                Статус подписки:{' '}
                {subscribed ? 'активна' : 'не активна (разрешение браузера)'}.
              </p>
            </>
          ) : (
            <p className="mt-2 break-words rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Этот браузер не поддерживает push-уведомления (нет Service Worker или PushManager).
              Используйте актуальную версию Chrome, Edge, Firefox или Safari.
            </p>
          )}
        </section>

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="section-title">Напоминания по привычкам</p>
            <Link
              to="/habits"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Все привычки →
            </Link>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Переключатели ниже включают и выключают напоминание для конкретной привычки.
          </p>

          {habits.length === 0 ? (
            <EmptyState
              title="Привычек пока нет"
              description="Добавьте привычку, чтобы настроить для неё напоминания."
              icon={<Icon name="bell" className="h-6 w-6" />}
            />
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {habits.map((habit) => (
                <li key={habit.id} className="py-3">
                  <Toggle
                    checked={habit.notificationsEnabled}
                    onChange={(value) =>
                      void handleHabitToggle(habit.id, habit.title, value)
                    }
                    label={habit.title}
                    description={[
                      habit.remindAt ? `в ${habit.remindAt}` : 'время не задано',
                      scheduleLabel(habit.schedule.days),
                    ].join(' · ')}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
