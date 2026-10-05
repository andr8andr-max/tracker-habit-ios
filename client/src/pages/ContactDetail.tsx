import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ContactLogInput } from '../store/contacts';
import { ContactForm } from '../components/contact/ContactForm';
import { TagBadge } from '../components/contact/TagBadge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { CONTACT_ACTIONS, formatDateTime, initials } from '../lib/format';
import { useAuthStore } from '../store/auth';
import { useContacts } from '../store/contacts';
import { useProfile } from '../store/profile';
import { useUI } from '../store/ui';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const detail = useContacts((state) => state.detail);
  const logs = useContacts((state) => state.logs);
  const detailLoading = useContacts((state) => state.detailLoading);
  const fetchContact = useContacts((state) => state.fetchContact);
  const clearDetail = useContacts((state) => state.clearDetail);
  const updateContact = useContacts((state) => state.updateContact);
  const deleteContact = useContacts((state) => state.deleteContact);
  const addContactLog = useContacts((state) => state.addContactLog);
  const employees = useProfile((state) => state.employees);
  const fetchEmployees = useProfile((state) => state.fetchEmployees);
  const openConfirm = useUI((state) => state.openConfirm);
  const toast = useUI((state) => state.toast);

  const [editing, setEditing] = useState(false);
  const [linkedEmployeeId, setLinkedEmployeeId] = useState('');
  const [action, setAction] = useState(CONTACT_ACTIONS[0]);
  const [durationMin, setDurationMin] = useState('15');
  const [comment, setComment] = useState('');
  const [logBusy, setLogBusy] = useState(false);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (id) void fetchContact(id);
    return () => {
      clearDetail();
    };
  }, [id, fetchContact, clearDetail]);

  useEffect(() => {
    if (isOwner) void fetchEmployees();
  }, [isOwner, fetchEmployees]);

  useEffect(() => {
    setLinkedEmployeeId(detail?.linkedEmployeeId ?? '');
  }, [detail?.linkedEmployeeId]);

  async function handleSaveLink() {
    if (!id) return;
    await updateContact(id, { linkedEmployeeId: linkedEmployeeId || null });
    toast('success', linkedEmployeeId ? 'Контакт привязан к сотруднику' : 'Привязка снята');
  }

  async function handleAddLog() {
    if (!id) return;
    const input: ContactLogInput = {
      action: action.trim() || 'другое',
      durationMin: durationMin ? Number(durationMin) : null,
      comment: comment.trim() || null,
    };
    setLogBusy(true);
    try {
      await addContactLog(id, input);
      setComment('');
      toast('success', 'Запись добавлена в историю');
    } finally {
      setLogBusy(false);
    }
  }

  function handleDelete() {
    if (!detail) return;
    openConfirm({
      title: 'Удалить контакт?',
      message: `Контакт «${detail.name}» и вся история общения будут удалены навсегда.`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        await deleteContact(detail.id);
        toast('success', 'Контакт удалён');
        navigate('/contacts', { replace: true });
      },
    });
  }

  if (detailLoading && !detail) {
    return (
      <div>
        <PageHeader title="Контакт" backTo="/contacts" />
        <InlineSpinner label="Загружаем контакт…" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <PageHeader title="Контакт" backTo="/contacts" />
        <EmptyState
          title="Контакт не найден"
          description="Возможно, он был удалён."
          icon={<Icon name="search" className="h-6 w-6" />}
        />
      </div>
    );
  }

  const saved = {
    name: detail.name,
    phone: detail.phone,
    company: detail.company,
    city: detail.city,
    tag: detail.tag,
    note: detail.note,
    linkedEmployeeId: detail.linkedEmployeeId,
  };

  return (
    <div>
      <PageHeader
        title={detail.name}
        subtitle={
          [detail.company, detail.city].filter(Boolean).join(' · ') || 'Контакт клуба'
        }
        backTo="/contacts"
        backLabel="К списку контактов"
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing((value) => !value)}>
              <Icon name="pencil" className="h-4 w-4" />
              {editing ? 'Закрыть форму' : 'Изменить'}
            </Button>
            {isOwner ? (
              <Button variant="danger" onClick={handleDelete}>
                <Icon name="trash" className="h-4 w-4" />
                Удалить
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {editing ? (
            <section className="card">
              <p className="section-title mb-4">Редактирование контакта</p>
              <ContactForm
                initial={saved}
                submitLabel="Сохранить изменения"
                showLinkField={isOwner}
                employees={employees}
                onCancel={() => setEditing(false)}
                onSubmit={async (input) => {
                  await updateContact(detail.id, input);
                  setEditing(false);
                  toast('success', 'Контакт обновлён');
                }}
              />
            </section>
          ) : (
            <section className="card">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">
                  {initials(detail.name)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-base font-semibold text-slate-900">
                      {detail.name}
                    </p>
                    <TagBadge tag={detail.tag} />
                  </div>
                  <p className="mt-0.5 break-words text-xs text-slate-400">
                    Создан: {formatDateTime(detail.createdAt)}
                  </p>
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Телефон</dt>
                  <dd className="mt-1 break-words text-sm text-slate-700">
                    {detail.phone ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Компания</dt>
                  <dd className="mt-1 break-words text-sm text-slate-700">
                    {detail.company ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Город</dt>
                  <dd className="mt-1 break-words text-sm text-slate-700">
                    {detail.city ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">
                    Последний контакт
                  </dt>
                  <dd className="mt-1 break-words text-sm text-slate-700">
                    {detail.lastActionAt ? formatDateTime(detail.lastActionAt) : 'ещё не было'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Заметка</dt>
                  <dd className="mt-1 break-words text-sm text-slate-700">
                    {detail.note ?? '—'}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <section className="card">
            <p className="section-title">Добавить запись</p>
            <p className="mt-1 text-sm text-slate-500">
              Звонок, встреча или переписка — фиксируйте здесь.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Тип контакта">
                <Select value={action} onChange={(event) => setAction(event.target.value)}>
                  {CONTACT_ACTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Длительность, мин" hint="0–600, необязательно">
                <Input
                  type="number"
                  min={0}
                  max={600}
                  value={durationMin}
                  onChange={(event) => setDurationMin(event.target.value)}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Комментарий">
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  placeholder="О чём договорились"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Button loading={logBusy} onClick={() => void handleAddLog()}>
                <Icon name="plus" className="h-4 w-4" />
                Добавить в историю
              </Button>
            </div>
          </section>

          <section className="card">
            <p className="section-title">История контактов</p>
            {logs.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Записей пока нет — добавьте первую выше.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                        <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold uppercase text-brand-700">
                          {log.action}
                        </span>
                        {log.durationMin ? (
                          <span className="text-xs text-slate-500">{log.durationMin} мин</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    {log.comment ? (
                      <p className="mt-2 break-words text-sm text-slate-600">{log.comment}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {isOwner ? (
            <section className="card">
              <p className="section-title">Привязка к сотруднику</p>
              <p className="mt-1 text-sm text-slate-500">
                Только владелец клуба может назначить ответственного сотрудника.
              </p>
              <div className="mt-4 space-y-3">
                <Select
                  value={linkedEmployeeId}
                  onChange={(event) => setLinkedEmployeeId(event.target.value)}
                  aria-label="Сотрудник"
                >
                  <option value="">Не привязан</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.email})
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  onClick={() => void handleSaveLink()}
                  disabled={linkedEmployeeId === (detail.linkedEmployeeId ?? '')}
                >
                  Сохранить привязку
                </Button>
                {employees.length === 0 ? (
                  <p className="break-words text-xs text-slate-400">
                    Сотрудников пока нет — добавьте их в разделе «Сотрудники».
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="card">
            <p className="section-title">Кратко</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="break-words">
                Записей в истории: <strong>{logs.length}</strong>
              </li>
              <li className="break-words">
                Тег: <TagBadge tag={detail.tag} />
              </li>
              <li className="break-words">
                Последний контакт:{' '}
                {detail.lastActionAt ? formatDateTime(detail.lastActionAt) : 'ещё не было'}
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
