import { useUI } from '../../store/ui';
import type { ToastType } from '../../store/ui';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const ICONS: Record<ToastType, IconName> = {
  success: 'checkCircle',
  error: 'close',
  info: 'bell',
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-brand-200 bg-brand-50 text-brand-800',
};

export function Toaster() {
  const toasts = useUI((state) => state.toasts);
  const dismissToast = useUI((state) => state.dismissToast);

  return (
    <div
      className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 shadow-soft ${STYLES[toast.type]}`}
          role="status"
        >
          <Icon name={ICONS[toast.type]} className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1 break-words text-sm">{toast.message}</p>
          <button
            type="button"
            aria-label="Закрыть уведомление"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
