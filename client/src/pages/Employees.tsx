import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { formatDateTime, initials } from '../lib/format';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useProfile } from '../store/profile';
import { useUI } from '../store/ui';

export default function Employees() {
  const employees = useProfile((state) => state.employees);
  const employeesLoading = useProfile((state) => state.employeesLoading);
  const fetchEmployees = useProfile((state) => state.fetchEmployees);
  const createEmployee = useProfile((state) => state.createEmployee);
  const deleteEmployee = useProfile((state) => state.deleteEmployee);
  const openConfirm = useUI((state) => state.openConfirm);
  const toast = useUI((state) => state.toast);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isWide = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Введите имя сотрудника');
      return;
    }
    if (!email.trim()) {
      setError('Введите email');
      return;
    }
    if (password.length < 6) {
      setError('Пароль — минимум 6 символов');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await createEmployee({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || null,
      });
      setShowCreate(false);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      toast('success', 'Сотрудник создан');
    } catch {
      setError('Не удалось создать сотрудника — проверьте данные');
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(employeeId: string, employeeName: string) {
    openConfirm({
      title: 'Удалить сотрудника?',
      message: `Сотрудник «${employeeName}» и все его данные будут удалены навсегда.`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        await deleteEmployee(employeeId);
        toast('success', 'Сотрудник удалён');
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        subtitle="Управление сотрудниками клуба — только для владельца"
        backTo="/"
        backLabel="На главную"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Добавить сотрудника
          </Button>
        }
      />

      {employeesLoading && employees.length === 0 ? (
        <InlineSpinner label="Загружаем сотрудников…" />
      ) : employees.length === 0 ? (
        <EmptyState
          title="Сотрудников пока нет"
          description="Создайте сотрудника — он сможет вести собственные привычки и контакты."
          icon={<Icon name="users" className="h-6 w-6" />}
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Icon name="plus" className="h-4 w-4" />
              Добавить сотрудника
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {(isWide
            ? [
                employees.filter((_, index) => index % 2 === 0),
                employees.filter((_, index) => index % 2 === 1),
              ]
            : [employees]
          ).map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-4">
              {column.map((employee) => (
                <div key={employee.id} className="card">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {initials(employee.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-slate-900">
                    {employee.name}
                  </p>
                  <p className="break-words text-xs text-slate-500">{employee.email}</p>
                  <p className="break-words text-xs text-slate-500">
                    {employee.phone ?? 'телефон не указан'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(employee.id, employee.name)}
                  aria-label={`Удалить ${employee.name}`}
                  className="shrink-0 rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-100 px-2 py-2">
                  <p className="text-lg font-semibold text-slate-700">
                    {employee.contactsCount}
                  </p>
                  <p className="text-xs text-slate-500">контактов</p>
                </div>
                <div className="rounded-lg bg-slate-100 px-2 py-2">
                  <p className="text-lg font-semibold text-slate-700">{employee.habitsCount}</p>
                  <p className="text-xs text-slate-500">привычек</p>
                </div>
                <div className="rounded-lg bg-slate-100 px-2 py-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {formatDateTime(employee.createdAt)}
                  </p>
                  <p className="text-xs text-slate-500">создан</p>
                </div>
              </div>
            </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        title="Новый сотрудник"
        onClose={() => setShowCreate(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Имя" error={error && !name.trim() ? error : undefined}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Мария Сидорова"
              required
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="employee@example.com"
              required
            />
          </Field>
          <Field label="Пароль" hint="Минимум 6 символов">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          {error && name.trim() && email.trim() && password.length >= 6 ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={busy}>
              Отмена
            </Button>
            <Button type="submit" loading={busy}>
              Создать
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
