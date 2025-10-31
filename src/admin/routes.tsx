import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { EnhancedUsersListPage } from './pages/Users/EnhancedUsersListPage';
import { UserDetailPage } from './pages/Users/UserDetailPage';
import { UserEditPage } from './pages/Users/UserEditPage';
import { UserCreatePage } from './pages/Users/UserCreatePage';
import { MembershipsPage } from './pages/Memberships/MembershipsPage';
import { EventsListPage } from './pages/Events/EventsListPage';
import { EventCreatePage } from './pages/Events/EventCreatePage';
import { EventEditPage } from './pages/Events/EventEditPage';
import { EventDetailPage } from './pages/Events/EventDetailPage';
import { CoworkingListPage } from './pages/Coworking/CoworkingListPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { AnalyticsOverviewPage } from './pages/Analytics/AnalyticsOverviewPage';
import { FinancialAnalyticsPage } from './pages/Analytics/FinancialAnalyticsPage';
import { DemographicsAnalyticsPage } from './pages/Analytics/DemographicsAnalyticsPage';
import { EngagementAnalyticsPage } from './pages/Analytics/EngagementAnalyticsPage';
import { EventStatsPage } from './pages/Analytics/EventStatsPage';

export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<EnhancedUsersListPage />} />
        <Route path="users/new" element={<UserCreatePage />} />
        <Route path="users/:uid" element={<UserDetailPage />} />
        <Route path="users/:uid/edit" element={<UserEditPage />} />
        <Route path="memberships" element={<MembershipsPage />} />

        {/* Routes Events */}
        <Route path="events" element={<EventsListPage />} />
        <Route path="events/create" element={<EventCreatePage />} />
        <Route path="events/:eventId" element={<EventDetailPage />} />
        <Route path="events/:eventId/edit" element={<EventEditPage />} />

        <Route path="coworking" element={<CoworkingListPage />} />

        {/* Routes Analytics */}
        <Route path="analytics" element={<Navigate to="analytics/overview" replace />} />
        <Route path="analytics/overview" element={<AnalyticsOverviewPage />} />
        <Route path="analytics/financial" element={<FinancialAnalyticsPage />} />
        <Route path="analytics/demographics" element={<DemographicsAnalyticsPage />} />
        <Route path="analytics/engagement" element={<EngagementAnalyticsPage />} />
        <Route path="analytics/events" element={<EventStatsPage />} />

        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
