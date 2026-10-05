import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { useUI } from '../store/ui';

export function AppLayout() {
  const sidebarOpen = useUI((state) => state.sidebarOpen);
  const setSidebarOpen = useUI((state) => state.setSidebarOpen);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          Клуб предпринимателей — трекер привычек
        </footer>
      </div>
    </div>
  );
}
