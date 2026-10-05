import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useUI } from '../../store/ui';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/', label: 'Главная', icon: 'home', end: true },
  { to: '/habits', label: 'Привычки', icon: 'checkCircle' },
  { to: '/contacts', label: 'Контакты', icon: 'phone' },
  { to: '/profile', label: 'Профиль', icon: 'user', end: true },
  { to: '/profile/notifications', label: 'Уведомления', icon: 'bell', end: true },
];

const OWNER_ITEMS: NavItem[] = [
  { to: '/owner/employees', label: 'Сотрудники', icon: 'users' },
  { to: '/owner/club', label: 'Настройки клуба', icon: 'building' },
];

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Icon name={item.icon} className="h-5 w-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const setSidebarOpen = useUI((state) => state.setSidebarOpen);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const isOwner = user?.role === 'owner';

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              Т
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Трекер привычек</p>
              <p className="truncate text-xs text-slate-500">Клуб предпринимателей</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Разделы
            </p>
            {MAIN_ITEMS.map((item) => (
              <NavItemLink key={item.to} item={item} onNavigate={onClose} />
            ))}
          </div>

          {isOwner ? (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Управление
              </p>
              {OWNER_ITEMS.map((item) => (
                <NavItemLink key={item.to} item={item} onNavigate={onClose} />
              ))}
            </div>
          ) : null}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3">
          <p className="break-words text-xs text-slate-500">
            {isOwner ? 'Вы управляете клубом' : 'Ваш рабочий кабинет'}
          </p>
        </div>
      </aside>
    </>
  );
}
