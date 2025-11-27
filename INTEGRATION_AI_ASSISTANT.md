# 🚀 Intégration de l'Assistant IA FORNAP - Guide Rapide

## ⚡ Intégration en 2 minutes

### Étape 1 : Ajouter la route (routes.tsx)

Ouvrez `src/admin/routes.tsx` et ajoutez l'import et la route :

```tsx
// Ajoutez cet import en haut du fichier
import { AIAssistantPage } from './pages/AIAssistantPage';

// Puis ajoutez cette route dans la section des routes protégées (ligne 74)
<Route path="ai-assistant" element={<AIAssistantPage />} />
```

Le fichier devrait ressembler à ça :

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from '../shared/contexts/AdminAuthContext';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminLogin } from './pages/AdminLogin';
// ... autres imports ...
import { AIAssistantPage } from './pages/AIAssistantPage';  // ⬅️ NOUVEAU

export function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />

        <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          {/* ... autres routes ... */}
          <Route path="ai-assistant" element={<AIAssistantPage />} />  {/* ⬅️ NOUVEAU */}
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
```

### Étape 2 : Ajouter au menu de navigation (AdminLayout.tsx)

Ouvrez `src/admin/layouts/AdminLayout.tsx` :

1. **Ajoutez l'import de l'icône** (ligne 24) :

```tsx
import {
  // ... autres icons
  IconBrain,  // ⬅️ AJOUTEZ CETTE LIGNE
} from '@tabler/icons-react';
```

2. **Ajoutez l'élément de navigation** (dans `navigationItems` ligne 46) :

```tsx
const navigationItems: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: IconUsers, label: 'Utilisateurs', path: '/admin/users' },
  { icon: IconTicket, label: 'Abonnements', path: '/admin/memberships' },
  { icon: IconCalendar, label: 'Événements', path: '/admin/events' },
  { icon: IconBuildingCommunity, label: 'Coworking', path: '/admin/coworking' },
  { icon: IconQrcode, label: 'Scanner QR', path: '/scanner', isExternal: true },
  { icon: IconBrain, label: '🤖 Assistant IA', path: '/admin/ai-assistant' },  // ⬅️ AJOUTEZ CETTE LIGNE
  {
    icon: IconMail,
    label: 'Campagnes Email',
    path: '/admin/campaigns',
    // ... reste du code
  },
  // ... reste du code
];
```

### Étape 3 (Optionnel) : Ajouter le bouton flottant

Si vous voulez aussi le bouton flottant accessible partout :

Ouvrez `src/admin/layouts/AdminLayout.tsx` et ajoutez :

1. **Import** (ligne 30) :

```tsx
import { AIAssistantFab } from '../components/AIAssistant';  // ⬅️ AJOUTEZ
```

2. **Dans le render** (juste avant la fermeture du `</AppShell>` ligne 393) :

```tsx
export function AdminLayout() {
  // ... code existant ...

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ /* ... */ }}
      padding="md"
    >
      {/* ... Header, Navbar, Main existants ... */}

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      {/* ⬇️ AJOUTEZ CETTE LIGNE */}
      <AIAssistantFab />
    </AppShell>
  );
}
```

## ✅ C'est tout !

Redémarrez votre serveur de développement :

```bash
npm run dev
```

Puis :

1. **Option 1** : Cliquez sur "🤖 Assistant IA" dans le menu de navigation
2. **Option 2** : Cliquez sur le bouton flottant en bas à droite (si vous l'avez ajouté)

## 🎯 Testez l'assistant

Posez ces questions pour tester :

```
"Combien d'utilisateurs actifs avons-nous ?"
"Quel est le montant total des contributions ce mois ?"
"Montre-moi les 10 derniers utilisateurs créés"
```

## 📝 Code Complet des Modifications

### routes.tsx (version complète avec l'ajout)

```tsx
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
import { AIAssistantPage } from './pages/AIAssistantPage';  // ⬅️ NOUVEAU

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

          {/* Routes Campaigns */}
          <Route path="campaigns" element={<CampaignsListPage />} />
          <Route path="campaigns/create" element={<CampaignCreatePage />} />
          <Route path="campaigns/:campaignId" element={<CampaignDetailPage />} />
          <Route path="campaigns/:campaignId/edit" element={<CampaignEditPage />} />
          <Route path="campaigns/diagnostics" element={<EmailDiagnosticsPage />} />

          {/* Routes Analytics */}
          <Route path="analytics" element={<Navigate to="analytics/overview" replace />} />
          <Route path="analytics/overview" element={<AnalyticsOverviewPage />} />
          <Route path="analytics/financial" element={<FinancialAnalyticsPage />} />
          <Route path="analytics/demographics" element={<DemographicsAnalyticsPage />} />
          <Route path="analytics/engagement" element={<EngagementAnalyticsPage />} />
          <Route path="analytics/events" element={<EventStatsPage />} />
          <Route path="analytics/contributions" element={<ContributionStatsPage />} />

          {/* Route AI Assistant */}
          <Route path="ai-assistant" element={<AIAssistantPage />} />  {/* ⬅️ NOUVEAU */}

          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
```

## 🐛 En cas de problème

### Erreur : Module not found

Si vous voyez :
```
Module not found: Can't resolve './pages/AIAssistantPage'
```

Vérifiez que tous les fichiers ont bien été créés dans :
- `src/shared/types/ai.ts`
- `src/shared/services/ai/openRouterService.ts`
- `src/shared/services/ai/aiTools.ts`
- `src/shared/services/ai/aiAssistantService.ts`
- `src/admin/components/AIAssistant/AIAssistantPanel.tsx`
- `src/admin/components/AIAssistant/AIAssistantPanel.module.css`
- `src/admin/components/AIAssistant/AIAssistantFab.tsx`
- `src/admin/components/AIAssistant/index.ts`
- `src/admin/pages/AIAssistantPage.tsx`

### L'IA ne répond pas

1. Ouvrez la console du navigateur (F12)
2. Regardez les erreurs
3. Vérifiez votre connexion internet
4. L'API Key est déjà configurée dans le code

### Erreur de Firebase

Si vous voyez des erreurs Firebase, vérifiez que :
- Vous êtes connecté en tant qu'admin
- Votre compte admin a les bonnes permissions
- Firebase est bien configuré

## 📚 Documentation complète

Pour plus de détails, consultez :
- `/docs/AI_ASSISTANT_GUIDE.md` - Guide complet d'utilisation
- `AI_ASSISTANT_README.md` - Vue d'ensemble du système

## 🎉 Félicitations !

Votre assistant IA est maintenant opérationnel ! 🚀

Profitez-en pour :
- Analyser vos KPIs en temps réel
- Rechercher des utilisateurs
- Obtenir des statistiques
- Poser des questions sur vos données
