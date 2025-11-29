import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from '../shared/contexts/AdminAuthContext';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminLogin } from './pages/AdminLogin';
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
import { ContributionStatsPage } from './pages/Analytics/ContributionStatsPage';
import { CampaignsListPage, CampaignCreatePage, CampaignEditPage, CampaignDetailPage } from './pages/Campaigns';
import { EmailDiagnosticsPage } from './pages/EmailDiagnostics';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { CrowdfundingManagementPage } from './pages/Crowdfunding';

export function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        {/* Route de login non protégée */}
        <Route path="login" element={<AdminLogin />} />

        {/* Routes protégées avec AdminLayout */}
        <Route
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
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

          {/* Route Crowdfunding */}
          <Route path="crowdfunding" element={<CrowdfundingManagementPage />} />

          {/* Routes Campaigns */}
          <Route path="campaigns" element={<CampaignsListPage />} />
          <Route path="campaigns/create" element={<CampaignCreatePage />} />
          <Route path="campaigns/:campaignId" element={<CampaignDetailPage />} />
          <Route path="campaigns/:campaignId/edit" element={<CampaignEditPage />} />
          <Route path="campaigns/diagnostics" element={<EmailDiagnosticsPage />} />

          {/* Routes Analytics */}
          <Route path="analytics" element={<Navigate to="/admin/analytics/overview" replace />} />
          <Route path="analytics/overview" element={<AnalyticsOverviewPage />} />
          <Route path="analytics/financial" element={<FinancialAnalyticsPage />} />
          <Route path="analytics/demographics" element={<DemographicsAnalyticsPage />} />
          <Route path="analytics/engagement" element={<EngagementAnalyticsPage />} />
          <Route path="analytics/events" element={<EventStatsPage />} />
          <Route path="analytics/contributions" element={<ContributionStatsPage />} />

          {/* Route AI Assistant */}
          <Route path="ai-assistant" element={<AIAssistantPage />} />

          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
