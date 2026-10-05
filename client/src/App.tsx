import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ConfirmModal } from './components/ui/Modal';
import { FullSpinner } from './components/ui/Spinner';
import { Toaster } from './components/ui/Toaster';
import { AppLayout } from './layout/AppLayout';
import ClubSettings from './pages/ClubSettings';
import ContactCreate from './pages/ContactCreate';
import ContactDetail from './pages/ContactDetail';
import ContactList from './pages/ContactList';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import HabitCreate from './pages/HabitCreate';
import HabitDetail from './pages/HabitDetail';
import HabitList from './pages/HabitList';
import Login from './pages/Login';
import NotificationSettings from './pages/NotificationSettings';
import Profile from './pages/Profile';
import { useAuthStore } from './store/auth';

function ProtectedRoute() {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);

  if (!initialized) return <FullSpinner label="Проверяем сессию…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function OwnerRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (user && user.role !== 'owner') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="habits" element={<HabitList />} />
            <Route path="habits/new" element={<HabitCreate />} />
            <Route path="habits/:id" element={<HabitDetail />} />
            <Route path="contacts" element={<ContactList />} />
            <Route path="contacts/new" element={<ContactCreate />} />
            <Route path="contacts/:id" element={<ContactDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/notifications" element={<NotificationSettings />} />
            <Route
              path="owner/employees"
              element={
                <OwnerRoute>
                  <Employees />
                </OwnerRoute>
              }
            />
            <Route
              path="owner/club"
              element={
                <OwnerRoute>
                  <ClubSettings />
                </OwnerRoute>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <ConfirmModal />
    </BrowserRouter>
  );
}
