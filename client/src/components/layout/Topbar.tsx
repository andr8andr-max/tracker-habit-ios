import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useUI } from '../../store/ui';
import { initials } from '../../lib/format';
import { Icon } from '../ui/Icon';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  employee: 'Сотрудник',
};

export function Topbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setSidebarOpen = useUI((state) => state.setSidebarOpen);
  const toast = useUI((state) => state.toast);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast('info', 'Вы вышли из аккаунта');
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Открыть меню"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            Клуб предпринимателей
          </p>
          <p className="truncate text-xs text-slate-500">Трекер привычек</p>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">
              {user ? ROLE_LABELS[user.role] ?? user.role : ''}
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {user ? initials(user.name) : '?'}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            title="Выйти из аккаунта"
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
}
