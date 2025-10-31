# Architecture du Système d'Analytics FORNAP

## 📊 Vue d'ensemble

Ce document détaille l'architecture complète du système d'analytics pour la plateforme FORNAP. Le système exploite toutes les données collectées lors de l'inscription et de l'utilisation de la plateforme pour fournir des insights détaillés sur les adhérents, les revenus, et l'engagement.

---

## 🎯 Objectifs

### Fonctionnalités Principales

1. **Suivi Administratif & Comptabilité**
   - Comptabilisation automatique des adhérents (mensuel/annuel)
   - Export comptable (.csv, .xlsx)
   - Statistiques automatiques d'évolution
   - Suivi des encaissements (en ligne et direct)

2. **Dashboard Synthétique**
   - **Indicateurs clés**: Total adhérents, adhérents à jour, taux de renouvellement
   - **Répartition**: Mensuel/Annuel/Honoraire, géographique, tranches d'âge
   - **Graphiques**: Évolution temporelle, pyramide d'âge, zones de provenance

3. **Analyses Avancées**
   - Catégories professionnelles
   - Centres d'intérêts et préférences culturelles
   - Engagement et participation
   - Compétences disponibles dans la communauté

---

## 🏗️ Architecture Proposée

### 1. Navigation

Ajout d'une nouvelle section **Analytics** dans la navbar admin :

```typescript
// Dans AdminLayout.tsx
const navigationItems: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: IconUsers, label: 'Utilisateurs', path: '/admin/users' },
  { icon: IconTicket, label: 'Abonnements', path: '/admin/memberships' },
  { icon: IconCalendar, label: 'Événements', path: '/admin/events' },
  { icon: IconBuildingCommunity, label: 'Coworking', path: '/admin/coworking' },

  // 🆕 NOUVELLE SECTION
  { icon: IconChartBar, label: 'Analytics', path: '/admin/analytics',
    submenu: [
      { icon: IconDashboard, label: 'Vue d\'ensemble', path: '/admin/analytics/overview' },
      { icon: IconCurrencyEuro, label: 'Comptabilité', path: '/admin/analytics/financial' },
      { icon: IconMapPin, label: 'Démographie', path: '/admin/analytics/demographics' },
      { icon: IconHeart, label: 'Engagement', path: '/admin/analytics/engagement' },
    ]
  },

  { icon: IconSettings, label: 'Paramètres', path: '/admin/settings' },
];
```

### 2. Structure des Pages

```
src/admin/pages/Analytics/
├── AnalyticsOverviewPage.tsx          # Dashboard général
├── FinancialAnalyticsPage.tsx         # Comptabilité & exports
├── DemographicsAnalyticsPage.tsx      # Analyses démographiques
├── EngagementAnalyticsPage.tsx        # Analyses d'engagement
└── components/
    ├── charts/
    │   ├── MembershipEvolutionChart.tsx
    │   ├── AgeDistributionChart.tsx
    │   ├── GeographicDistributionMap.tsx
    │   ├── ProfessionalCategoriesChart.tsx
    │   ├── InterestsRadarChart.tsx
    │   └── RevenueChart.tsx
    ├── stats/
    │   ├── KPICard.tsx
    │   ├── ComparisonCard.tsx
    │   └── TrendIndicator.tsx
    └── exports/
        ├── ExportButton.tsx
        └── ExportModal.tsx
```

---

## 📊 Métriques et KPIs

### 1. Analytics Overview (Dashboard Général)

#### KPIs Principaux
- **Total Adhérents**: Nombre total d'utilisateurs inscrits
- **Adhérents Actifs**: Avec abonnement actif et à jour
- **Taux d'Activité**: % d'adhérents avec abonnement actif
- **Taux de Renouvellement**: % d'adhérents qui ont renouvelé
- **MRR (Monthly Recurring Revenue)**: Revenu récurrent mensuel
- **ARR (Annual Recurring Revenue)**: Revenu récurrent annuel
- **Revenu Total**: Depuis le début
- **Moyenne d'Âge**: Âge moyen des adhérents
- **Nouveaux Cette Semaine**: Inscriptions des 7 derniers jours
- **Nouveaux Ce Mois**: Inscriptions du mois en cours

#### Graphiques
1. **Évolution des Adhérents** (Line chart)
   - Par type d'abonnement (mensuel, annuel, honoraire)
   - Sur 12 mois glissants

2. **Répartition des Abonnements** (Donut chart)
   - Par type (mensuel/annuel/honoraire)
   - Par statut (actif/expiré/en attente)

3. **Taux de Renouvellement** (Area chart)
   - Evolution mensuelle du taux de ré-adhésion
   - Comparaison mensuel vs annuel

4. **Top 5 Codes Postaux** (Bar chart)
   - Zones géographiques les plus représentées

### 2. Financial Analytics (Comptabilité)

#### KPIs Financiers
- **Revenu Total**: Cumul depuis le début
- **MRR**: Revenu récurrent mensuel
- **ARR**: Revenu récurrent annuel
- **ARPU (Average Revenue Per User)**: Revenu moyen par utilisateur
- **LTV (Lifetime Value)**: Valeur vie client estimée
- **Churn Rate**: Taux d'attrition mensuel
- **Revenu par Type d'Abonnement**: Répartition mensuel/annuel/honoraire

#### Graphiques
1. **Évolution du Revenu** (Line + Bar chart combiné)
   - Revenu mensuel total
   - Breakdown par type d'abonnement
   - Tendance et prévisions

2. **Répartition des Revenus** (Stacked bar chart)
   - Par type d'abonnement
   - Par mois sur 12 mois glissants

3. **Encaissements** (Table détaillée)
   - Date, Utilisateur, Type, Montant, Mode de paiement
   - Filtrable et triable

#### Exports Comptables
Boutons d'export disponibles :

**Export Mensuel** :
```csv
Mois, Type_Abonnement, Nombre_Nouveaux, Nombre_Renouvellements, Revenu_Total, MRR
2025-01, Mensuel, 45, 123, 1980€, 1980€
2025-01, Annuel, 23, 87, 7600€, 633€
2025-01, Honoraire, 2, 1, 300€, 25€
```

**Export Détaillé par Adhérent** :
```csv
ID, Nom, Prénom, Email, Type_Abonnement, Date_Inscription, Date_Expiration, Montant, Statut_Paiement, Mode_Paiement
USER001, Dupont, Jean, jean@email.com, Annuel, 2025-01-15, 2026-01-15, 250€, Payé, Carte
```

**Export Comptable** (format compatible logiciels compta) :
```csv
Date, Compte, Libellé, Débit, Crédit, Référence
2025-01-15, 706000, Cotisation Annuelle - Jean Dupont, , 250.00, FAC-2025-001
2025-01-15, 512000, Banque, 250.00, , FAC-2025-001
```

### 3. Demographics Analytics (Démographie)

#### KPIs Démographiques
- **Moyenne d'Âge**: Âge moyen de tous les adhérents
- **Âge Médian**: Médiane de l'âge
- **Tranche d'Âge Dominante**: Tranche avec le plus d'adhérents
- **Répartition Hommes/Femmes**: Si collecté
- **Nombre de Codes Postaux**: Diversité géographique
- **Zone Principale**: Code postal le plus représenté

#### Graphiques
1. **Pyramide d'Âge** (Bar chart horizontal)
   ```
   Tranches:
   - 18-25 ans
   - 26-35 ans
   - 36-45 ans
   - 46-55 ans
   - 56-65 ans
   - 66+ ans
   ```
   Avec répartition par type d'abonnement

2. **Carte Géographique** (Heatmap)
   - Concentration par code postal
   - Taille des bulles = nombre d'adhérents
   - Couleur = type d'abonnement dominant

3. **Top 10 Codes Postaux** (Bar chart)
   - Nombre d'adhérents par zone
   - Breakdown par type d'abonnement

4. **Statut Professionnel** (Pie chart)
   - Répartition : Salarié, Indépendant, Étudiant, Retraité, Sans emploi
   - Uniquement pour adhérents annuels (profil étendu)

5. **Domaines d'Activité** (Tree map)
   - Visualisation des secteurs d'activité professionnelle
   - Taille proportionnelle au nombre d'adhérents

#### Filtres Disponibles
- Par type d'abonnement
- Par statut (actif/expiré)
- Par période d'inscription
- Par tranche d'âge
- Par zone géographique

### 4. Engagement Analytics (Profils Étendus)

**Important**: Ces données ne concernent **que les adhérents annuels** (profil étendu)

#### KPIs d'Engagement
- **Taux de Complétion du Profil**: % d'adhérents annuels avec profil complet
- **Taux de Consentement Public**: % ayant accepté un profil public
- **Bénévoles Potentiels**: Nombre d'adhérents intéressés par le bénévolat
- **Participants Potentiels**: Nombre intéressés par la participation active
- **Compétences Disponibles**: Nombre total de compétences dans la communauté

#### Graphiques

1. **Centres d'Intérêt - Types d'Événements** (Bar chart)
   ```
   Types: concerts, expositions, ateliers, conférences,
          projections cinéma, spectacles vivants, etc.
   ```
   Nombre d'adhérents intéressés par chaque type

2. **Domaines Artistiques** (Radar chart)
   ```
   Domaines: musique, arts visuels, littérature, théâtre,
             danse, histoire locale, sciences, etc.
   ```
   Visualisation des préférences culturelles

3. **Genres Musicaux** (Word cloud ou Bar chart)
   - Préférences musicales de la communauté
   - Utile pour programmer des concerts

4. **Thèmes de Conférences** (Bar chart)
   - Sujets d'intérêt pour les conférences
   - Guide la programmation

5. **Compétences de la Communauté** (Tag cloud)
   ```
   Compétences: graphisme, réseaux sociaux, bricolage,
                organisation événements, photographie, etc.
   ```
   - Taille = nombre de personnes avec cette compétence
   - Utile pour identifier des bénévoles qualifiés

6. **Bénévolat** (Stats détaillées)
   - Nombre de bénévoles potentiels
   - Domaines de bénévolat souhaités
   - Compétences disponibles pour le bénévolat

7. **Canaux d'Acquisition** (Pie chart)
   - Comment les adhérents ont connu FORNAP
   - Identifie les canaux les plus efficaces

8. **Préférences de Communication** (Donut chart)
   - Email vs SMS vs Réseaux sociaux vs App
   - Guide la stratégie de communication

9. **Présence sur Réseaux Sociaux** (Stats)
   - % d'adhérents sur Instagram, Facebook, LinkedIn, etc.
   - Liens renseignés pour création de communauté

#### Tables Détaillées

**Table "Compétences Disponibles"** :
| Compétence | Nombre | Bénévoles | Contact |
|------------|--------|-----------|---------|
| Graphisme | 12 | 8 | Voir liste |
| Photographie | 8 | 5 | Voir liste |
| Organisation événements | 15 | 12 | Voir liste |

**Table "Suggestions & Feedback"** :
- Affichage des suggestions laissées par les adhérents
- Permet d'identifier des tendances et besoins

---

## 🛠️ Services Analytics

### Structure des Services

```
src/shared/services/analytics/
├── analyticsService.ts           # Service principal
├── membershipAnalytics.ts        # Analyses abonnements
├── demographicAnalytics.ts       # Analyses démographiques
├── engagementAnalytics.ts        # Analyses engagement
├── financialAnalytics.ts         # Analyses financières
└── exportService.ts              # Exports CSV/Excel
```

### analyticsService.ts

#### Fonctions Principales

```typescript
/**
 * KPIs Dashboard Overview
 */
export async function getOverviewKPIs(): Promise<OverviewKPIs>;

export interface OverviewKPIs {
  totalMembers: number;
  activeMembers: number;
  activityRate: number;
  renewalRate: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
  averageAge: number;
  newThisWeek: number;
  newThisMonth: number;
  trends: {
    members: number; // % change vs last period
    revenue: number;
    activeMembers: number;
  };
}

/**
 * Évolution des adhérents dans le temps
 */
export async function getMembersEvolution(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month'
): Promise<MembersEvolutionData[]>;

export interface MembersEvolutionData {
  date: string;
  monthly: number;
  annual: number;
  lifetime: number;
  total: number;
}

/**
 * Répartition des abonnements
 */
export async function getMembershipDistribution(): Promise<MembershipDistribution>;

export interface MembershipDistribution {
  byType: {
    monthly: number;
    annual: number;
    lifetime: number;
  };
  byStatus: {
    active: number;
    expired: number;
    pending: number;
    cancelled: number;
  };
}
```

### membershipAnalytics.ts

```typescript
/**
 * Calcule le taux de renouvellement
 */
export async function getRenewalRate(
  periodMonths: number = 12
): Promise<RenewalRateData>;

export interface RenewalRateData {
  overall: number; // %
  byType: {
    monthly: number;
    annual: number;
  };
  evolution: Array<{
    month: string;
    rate: number;
  }>;
}

/**
 * Analyse des expirations à venir
 */
export async function getUpcomingExpirations(
  daysAhead: number = 30
): Promise<ExpirationData[]>;

export interface ExpirationData {
  date: string;
  count: number;
  estimatedRevenueLoss: number;
  membershipType: MembershipType;
}

/**
 * Historique complet d'un adhérent
 */
export async function getMembershipTimeline(
  userId: string
): Promise<MembershipTimelineEvent[]>;

export interface MembershipTimelineEvent {
  date: Timestamp;
  type: 'created' | 'renewed' | 'cancelled' | 'expired';
  planName: string;
  price: number;
  isRenewal: boolean;
}
```

### demographicAnalytics.ts

```typescript
/**
 * Distribution par âge
 */
export async function getAgeDistribution(): Promise<AgeDistributionData>;

export interface AgeDistributionData {
  averageAge: number;
  medianAge: number;
  byRange: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46-55': number;
    '56-65': number;
    '66+': number;
  };
  byRangeAndType: {
    [range: string]: {
      monthly: number;
      annual: number;
      lifetime: number;
    };
  };
}

/**
 * Distribution géographique
 */
export async function getGeographicDistribution(): Promise<GeographicData>;

export interface GeographicData {
  totalPostalCodes: number;
  topPostalCodes: Array<{
    postalCode: string;
    count: number;
    percentage: number;
    byType: {
      monthly: number;
      annual: number;
      lifetime: number;
    };
  }>;
  byRegion?: {
    [region: string]: number;
  };
}

/**
 * Statuts professionnels (adhérents annuels uniquement)
 */
export async function getProfessionalDistribution(): Promise<ProfessionalData>;

export interface ProfessionalData {
  totalWithExtendedProfile: number;
  byStatus: {
    salaried: number;
    independent: number;
    student: number;
    retired: number;
    unemployed: number;
  };
  topProfessions: Array<{
    profession: string;
    count: number;
  }>;
  topActivityDomains: Array<{
    domain: string;
    count: number;
  }>;
}
```

### engagementAnalytics.ts

```typescript
/**
 * KPIs d'engagement
 */
export async function getEngagementKPIs(): Promise<EngagementKPIs>;

export interface EngagementKPIs {
  totalExtendedProfiles: number;
  profileCompletionRate: number;
  publicProfileConsentRate: number;
  volunteerCount: number;
  participationInterestedCount: number;
  totalSkillsAvailable: number;
  uniqueSkillsCount: number;
}

/**
 * Centres d'intérêt
 */
export async function getInterestsAnalytics(): Promise<InterestsAnalytics>;

export interface InterestsAnalytics {
  eventTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  artisticDomains: Array<{
    domain: string;
    count: number;
    percentage: number;
  }>;
  musicGenres: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
  conferenceThemes: Array<{
    theme: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Compétences disponibles
 */
export async function getSkillsAnalytics(): Promise<SkillsData>;

export interface SkillsData {
  bySkill: Array<{
    skill: string;
    totalCount: number;
    volunteersCount: number;
    members: Array<{
      userId: string;
      name: string;
      isVolunteer: boolean;
      email?: string; // Si consentement public
    }>;
  }>;
}

/**
 * Canaux d'acquisition
 */
export async function getAcquisitionChannels(): Promise<AcquisitionData>;

export interface AcquisitionData {
  channels: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  suggestions: Array<{
    text: string;
    userId: string;
    date: Timestamp;
  }>;
}

/**
 * Préférences de communication
 */
export async function getCommunicationPreferences(): Promise<CommunicationData>;

export interface CommunicationData {
  preferredContact: {
    email: number;
    sms: number;
    social: number;
    app: number;
  };
  socialMediaPresence: {
    instagram: number;
    facebook: number;
    linkedin: number;
    tiktok: number;
    youtube: number;
    blog: number;
    website: number;
  };
}
```

### financialAnalytics.ts

```typescript
/**
 * KPIs financiers
 */
export async function getFinancialKPIs(): Promise<FinancialKPIs>;

export interface FinancialKPIs {
  totalRevenue: number;
  mrr: number;
  arr: number;
  arpu: number;
  ltv: number;
  churnRate: number;
  revenueByType: {
    monthly: number;
    annual: number;
    lifetime: number;
  };
}

/**
 * Évolution du revenu
 */
export async function getRevenueEvolution(
  startDate: Date,
  endDate: Date
): Promise<RevenueEvolutionData[]>;

export interface RevenueEvolutionData {
  date: string;
  totalRevenue: number;
  monthly: number;
  annual: number;
  lifetime: number;
  newMembers: number;
  renewals: number;
}

/**
 * Détails des transactions pour export comptable
 */
export async function getTransactionsForPeriod(
  startDate: Date,
  endDate: Date
): Promise<TransactionData[]>;

export interface TransactionData {
  id: string;
  date: Timestamp;
  userId: string;
  userName: string;
  userEmail: string;
  membershipType: MembershipType;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  isRenewal: boolean;
}
```

### exportService.ts

```typescript
/**
 * Export CSV mensuel des abonnements
 */
export async function exportMonthlyMembershipCSV(
  year: number,
  month: number
): Promise<Blob>;

/**
 * Export CSV détaillé par adhérent
 */
export async function exportMembersDetailCSV(
  filters?: UserFilters
): Promise<Blob>;

/**
 * Export comptable (format compatible logiciels compta)
 */
export async function exportAccountingCSV(
  startDate: Date,
  endDate: Date,
  format: 'sage' | 'ebp' | 'ciel' | 'generic'
): Promise<Blob>;

/**
 * Export Excel avec plusieurs onglets
 */
export async function exportFullAnalyticsExcel(
  startDate: Date,
  endDate: Date
): Promise<Blob>;
// Contient : Vue d'ensemble, Abonnements, Démographie, Engagement, Financier

/**
 * Export des compétences disponibles
 */
export async function exportSkillsCSV(): Promise<Blob>;
```

---

## 🔧 Enrichissement de la Structure de Données

### Modifications à Apporter

#### 1. Type `MembershipHistory` (Enrichissement)

Dans `src/shared/types/user.ts`, ajouter :

```typescript
export interface MembershipHistory {
  id: string;
  planId: string;
  planName: string;
  planType: MembershipType;
  status: MembershipStatus;
  startDate: Timestamp;
  endDate: Timestamp | null;
  price: number;
  paymentMethod?: string;
  transactionId?: string;
  cancelReason?: string;
  cancelledAt?: Timestamp;

  // 🆕 NOUVEAUX CHAMPS POUR TRACKING RENOUVELLEMENT
  isRenewal: boolean;                     // C'est un renouvellement ?
  previousMembershipId?: string;          // ID de l'abonnement précédent
  renewalSource?: 'auto' | 'manual';      // Renouvellement auto ou manuel
  daysBeforeRenewal?: number;             // Jours avant expiration où il a renouvelé
}
```

#### 2. Nouveaux Types pour Analytics

```typescript
// Types pour les KPIs
export interface OverviewKPIs { ... }
export interface FinancialKPIs { ... }
export interface EngagementKPIs { ... }

// Types pour les graphiques
export interface MembersEvolutionData { ... }
export interface RevenueEvolutionData { ... }
export interface AgeDistributionData { ... }
export interface GeographicData { ... }
export interface InterestsAnalytics { ... }

// Types pour les exports
export interface TransactionData { ... }
export interface MonthlyReportData { ... }
```

---

## 🎨 Composants de Visualisation

### Bibliothèques Recommandées

```bash
npm install recharts date-fns
npm install @mantine/dates dayjs
npm install xlsx # Pour exports Excel
npm install papaparse # Pour exports CSV
```

### Composants Réutilisables

#### 1. KPICard

```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    period: string;
  };
  description?: string;
}
```

#### 2. Charts

- **LineChart**: Évolutions temporelles
- **BarChart**: Comparaisons par catégorie
- **PieChart** / **DonutChart**: Répartitions
- **AreaChart**: Tendances avec remplissage
- **RadarChart**: Profils multi-critères (centres d'intérêt)
- **Heatmap**: Carte géographique
- **TreeMap**: Domaines d'activité

---

## 📅 Plan d'Implémentation

### Phase 1: Foundation (1-2 jours)

1. ✅ Créer la structure des dossiers analytics
2. ✅ Ajouter la section Analytics dans AdminLayout
3. ✅ Créer les types TypeScript enrichis
4. ✅ Mettre à jour `MembershipHistory` avec les nouveaux champs

### Phase 2: Services Analytics (2-3 jours)

1. ✅ Implémenter `membershipAnalytics.ts`
2. ✅ Implémenter `demographicAnalytics.ts`
3. ✅ Implémenter `engagementAnalytics.ts`
4. ✅ Implémenter `financialAnalytics.ts`
5. ✅ Implémenter `exportService.ts`

### Phase 3: Pages Analytics (3-4 jours)

1. ✅ `AnalyticsOverviewPage` - Dashboard général
2. ✅ `FinancialAnalyticsPage` - Comptabilité
3. ✅ `DemographicsAnalyticsPage` - Démographie
4. ✅ `EngagementAnalyticsPage` - Engagement

### Phase 4: Composants de Visualisation (2-3 jours)

1. ✅ Créer tous les composants de graphiques
2. ✅ Créer les composants de stats (KPICard, etc.)
3. ✅ Créer les composants d'export

### Phase 5: Intégration & Tests (1-2 jours)

1. ✅ Tester tous les calculs de métriques
2. ✅ Tester les exports
3. ✅ Optimiser les performances (cache, pagination)
4. ✅ Ajuster le design

### Phase 6: Enrichissement de la page Memberships (1 jour)

Sur la page actuelle `/admin/memberships` :
- Garder les stats de base existantes
- Ajouter un bouton "Voir analyses détaillées" → redirige vers `/admin/analytics/financial`

---

## 🔍 Considérations Importantes

### Performance

- **Caching**: Utiliser Firestore cache pour les données d'analytics
- **Agrégations**: Précalculer les stats périodiquement (Cloud Functions)
- **Pagination**: Limiter les résultats pour les grandes tables
- **Lazy loading**: Charger les graphiques au scroll

### Sécurité

- **Règles Firestore**: Seuls les admins peuvent lire les analytics
- **Anonymisation**: Les exports ne contiennent que les données nécessaires
- **Logs**: Tracer tous les exports pour audit

### RGPD

- **Exports personnels**: Les utilisateurs peuvent demander leurs propres données
- **Anonymisation**: Option pour anonymiser les données dans les exports
- **Consentement**: Respecter les consentements pour les profils publics

---

## 📊 Exemples de Métriques Calculées

### Taux de Renouvellement

```typescript
// Formule
RenewalRate = (Nombre de renouvellements / Nombre d'expirations) × 100

// Exemple
// Sur 12 mois :
// - 150 abonnements ont expiré
// - 120 se sont renouvelés
// Taux de renouvellement = (120 / 150) × 100 = 80%
```

### MRR (Monthly Recurring Revenue)

```typescript
// Formule
MRR = (Abonnements mensuels × Prix mensuel) + (Abonnements annuels × Prix annuel / 12)

// Exemple
// - 200 mensuels à 15€ = 3000€
// - 150 annuels à 120€ = 18000€ / 12 = 1500€
// MRR = 3000 + 1500 = 4500€
```

### LTV (Lifetime Value)

```typescript
// Formule simplifiée
LTV = ARPU × (1 / ChurnRate)

// Exemple
// - ARPU = 100€
// - ChurnRate mensuel = 5% (0.05)
// LTV = 100 / 0.05 = 2000€
```

### Churn Rate

```typescript
// Formule
ChurnRate = (Nombre d'annulations / Nombre total d'abonnés début période) × 100

// Exemple
// - 500 abonnés début du mois
// - 25 annulations dans le mois
// ChurnRate = (25 / 500) × 100 = 5%
```

---

## 🎯 Prochaines Étapes

1. **Validation de l'architecture** : Confirmer que cette approche convient
2. **Priorisation des features** : Quelles pages implémenter en priorité ?
3. **Design system** : Définir les couleurs/styles des graphiques
4. **Implémentation** : Commencer par la phase 1

---

## 📝 Notes

- Cette architecture est extensible : facile d'ajouter de nouvelles analyses
- Les services sont découplés : chaque domaine (membership, demographic, etc.) est indépendant
- Les exports sont modulaires : facile d'ajouter de nouveaux formats
- Les composants sont réutilisables : un seul composant de graphique pour plusieurs usages

---

**Version**: 1.0.0
**Date**: 2025-10-29
**Auteur**: Architecture System
