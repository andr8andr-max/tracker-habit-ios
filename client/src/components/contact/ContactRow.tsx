import { Link } from 'react-router-dom';
import type { Contact } from '../../api/types';
import { formatRelative, initials } from '../../lib/format';
import { TagBadge } from './TagBadge';

interface ContactRowProps {
  contact: Contact;
}

export function ContactRow({ contact }: ContactRowProps) {
  return (
    <Link
      to={`/contacts/${contact.id}`}
      className="card flex items-start gap-3 transition hover:border-brand-300 hover:shadow-soft"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
        {initials(contact.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-words text-sm font-semibold text-slate-900">{contact.name}</span>
          <TagBadge tag={contact.tag} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {contact.phone ? (
            <span className="break-words text-slate-700">{contact.phone}</span>
          ) : null}
          {contact.company ? <span className="break-words">{contact.company}</span> : null}
          {contact.city ? <span className="break-words">{contact.city}</span> : null}
        </div>
        <p className="mt-1 break-words text-xs text-slate-400">
          Последний контакт: {formatRelative(contact.lastActionAt)}
        </p>
      </div>
    </Link>
  );
}
