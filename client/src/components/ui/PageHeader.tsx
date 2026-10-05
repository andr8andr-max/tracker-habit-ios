import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, backLabel, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backTo ? (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand-600"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            {backLabel ?? 'Назад'}
          </Link>
        ) : null}
        <h1 className="break-words text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 break-words text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
