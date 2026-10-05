import type { ContactTag } from '../../api/types';
import { TAG_LABELS } from '../../lib/format';

const STYLES: Record<ContactTag, string> = {
  vip: 'border-amber-200 bg-amber-50 text-amber-700',
  partner: 'border-brand-200 bg-brand-50 text-brand-700',
  client: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-500',
};

interface TagBadgeProps {
  tag: ContactTag;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        STYLES[tag] ?? STYLES.inactive
      }`}
    >
      {TAG_LABELS[tag] ?? tag}
    </span>
  );
}
