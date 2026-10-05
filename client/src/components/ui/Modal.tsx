import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useUI } from '../../store/ui';
import { Button } from './Button';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="break-words text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmModal() {
  const confirm = useUI((state) => state.confirm);
  const closeConfirm = useUI((state) => state.closeConfirm);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.onConfirm();
      closeConfirm();
    } catch {
      setBusy(false);
      return;
    }
    setBusy(false);
  }

  return (
    <Modal
      open={Boolean(confirm)}
      title={confirm?.title ?? ''}
      onClose={closeConfirm}
      footer={
        <>
          <Button variant="secondary" onClick={closeConfirm} disabled={busy}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={busy}>
            {confirm?.confirmLabel ?? 'Удалить'}
          </Button>
        </>
      }
    >
      <p className="break-words text-sm text-slate-600">{confirm?.message}</p>
    </Modal>
  );
}
