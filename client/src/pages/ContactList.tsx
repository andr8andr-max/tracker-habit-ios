import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ContactTag } from '../api/types';
import { ContactRow } from '../components/contact/ContactRow';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Input, Select } from '../components/ui/Input';
import { InlineSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { TAG_LABELS } from '../lib/format';
import { useContacts } from '../store/contacts';

const TAGS: (ContactTag | '')[] = ['', 'vip', 'partner', 'client', 'inactive'];

export default function ContactList() {
  const items = useContacts((state) => state.items);
  const loading = useContacts((state) => state.loading);
  const loaded = useContacts((state) => state.loaded);
  const fetchContacts = useContacts((state) => state.fetchContacts);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tag, setTag] = useState<ContactTag | ''>('');
  const [sort, setSort] = useState<'alpha' | 'last'>('alpha');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void fetchContacts({ q: debouncedSearch, tag, sort });
  }, [fetchContacts, debouncedSearch, tag, sort]);

  const hasFilters = Boolean(debouncedSearch || tag);

  return (
      <div className="lg:max-w-[calc((200%_-_20px)/3)]">
      <PageHeader
        title="Контакты"
        subtitle="Поиск, фильтр по тегу и сортировка"
        actions={
          <Link
            to="/contacts/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            <Icon name="plus" className="h-4 w-4" />
            Новый контакт
          </Link>
        }
      />

      <section className="card mb-5 space-y-4">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по имени, телефону, компании, городу"
            className="pl-9"
            aria-label="Поиск контактов"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {TAGS.map((value) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => setTag(value)}
              className={`chip text-xs ${tag === value ? 'chip-active' : 'chip-idle'}`}
              aria-pressed={tag === value}
            >
              {value === '' ? 'Все теги' : TAG_LABELS[value]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Найдено: <span className="font-semibold text-slate-700">{items.length}</span>
            {debouncedSearch ? ` по запросу «${debouncedSearch}»` : ''}
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">Сортировка</span>
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as 'alpha' | 'last')}
              className="w-auto"
              aria-label="Сортировка контактов"
            >
              <option value="alpha">По имени (А–Я)</option>
              <option value="last">По последнему контакту</option>
            </Select>
          </label>
        </div>
      </section>

      {loading && !loaded ? (
        <InlineSpinner label="Загружаем контакты…" />
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Ничего не найдено' : 'Контактов пока нет'}
          description={
            hasFilters
              ? 'Попробуйте изменить запрос или снять фильтр по тегу.'
              : 'Добавьте первый контакт, чтобы вести историю общения.'
          }
          icon={<Icon name={hasFilters ? 'search' : 'users'} className="h-6 w-6" />}
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTag('');
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Сбросить фильтры
              </button>
            ) : (
              <Link
                to="/contacts/new"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                <Icon name="plus" className="h-4 w-4" />
                Добавить контакт
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((contact) => (
            <ContactRow key={contact.id} contact={contact} />
          ))}
        </div>
      )}

      {loading && loaded ? (
        <p className="mt-4 text-center text-xs text-slate-400">Обновляем список…</p>
      ) : null}
    </div>
  );
}
