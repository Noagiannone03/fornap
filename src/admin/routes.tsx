import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { EnhancedUsersListPage } from './pages/Users/EnhancedUsersListPage';
import { MembershipsPage } from './pages/Memberships/MembershipsPage';
import { EventsListPage } from './pages/Events/EventsListPage';
import { CoworkingListPage } from './pages/Coworking/CoworkingListPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<EnhancedUsersListPage />} />
        <Route path="memberships" element={<MembershipsPage />} />
        <Route path="events" element={<EventsListPage />} />
        <Route path="coworking" element={<CoworkingListPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
