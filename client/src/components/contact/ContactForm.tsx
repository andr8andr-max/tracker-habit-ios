import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Contact, ContactTag, Employee } from '../../api/types';
import type { ContactInput } from '../../store/contacts';
import { TAG_LABELS } from '../../lib/format';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Input';

const TAGS: ContactTag[] = ['vip', 'partner', 'client', 'inactive'];

interface ContactFormProps {
  initial?: Partial<Contact> | null;
  submitLabel: string;
  onSubmit: (input: ContactInput) => Promise<void>;
  onCancel?: () => void;
  employees?: Employee[];
  showLinkField?: boolean;
}

export function ContactForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  employees,
  showLinkField = false,
}: ContactFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [tag, setTag] = useState<ContactTag>(initial?.tag ?? 'client');
  const [note, setNote] = useState(initial?.note ?? '');
  const [linkedEmployeeId, setLinkedEmployeeId] = useState(initial?.linkedEmployeeId ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Введите имя контакта');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        name: trimmed,
        phone: phone.trim() || null,
        company: company.trim() || null,
        city: city.trim() || null,
        tag,
        note: note.trim() || null,
        ...(showLinkField ? { linkedEmployeeId: linkedEmployeeId || null } : {}),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Имя *" error={error && !name.trim() ? error : undefined}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Иван Иванов"
            invalid={Boolean(error) && !name.trim()}
            required
          />
        </Field>
        <Field label="Телефон">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 900 000-00-00"
            inputMode="tel"
          />
        </Field>
        <Field label="Компания">
          <Input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="ООО «Пример»"
          />
        </Field>
        <Field label="Город">
          <Input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Москва"
          />
        </Field>
        <Field label="Тег">
          <Select value={tag} onChange={(event) => setTag(event.target.value as ContactTag)}>
            {TAGS.map((value) => (
              <option key={value} value={value}>
                {TAG_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        {showLinkField ? (
          <Field
            label="Сотрудник"
            hint="Привязка контакта к сотруднику клуба (только владелец)"
          >
            <Select
              value={linkedEmployeeId}
              onChange={(event) => setLinkedEmployeeId(event.target.value)}
            >
              <option value="">Не привязан</option>
              {(employees ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.email})
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <Field label="Заметка">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Что важно помнить о контакте"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
