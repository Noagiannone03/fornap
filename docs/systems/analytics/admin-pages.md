# Pages Analytics FORNAP

Ce dossier contient toutes les pages d'analytics pour le panel administrateur de FORNAP.

## Pages Disponibles

### 1. AnalyticsOverviewPage.tsx
**Vue d'ensemble générale**

**KPIs affichés :**
- Total Adhérents
- Adhérents Actifs
- MRR (Monthly Recurring Revenue)
- Taux de Renouvellement
- ARR (Annual Recurring Revenue)
- Âge Moyen
- Nouveaux Cette Semaine
- Nouveaux Ce Mois

**Graphiques :**
- Évolution des Adhérents (LineChart) - 12 derniers mois
- Répartition des Abonnements (PieChart)

**Services utilisés :**
- `getOverviewKPIs()`
- `getMembersEvolution()`
- `getMembershipDistribution()`

---

### 2. FinancialAnalyticsPage.tsx
**Analyse financière détaillée**

**KPIs affichés :**
- Revenu Total
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- LTV (Lifetime Value)
- Taux de Churn

**Graphiques :**
- Évolution du Revenu (LineChart) - par type d'abonnement sur 12 mois

**Fonctionnalités d'export :**
- Export CSV Mensuel (`downloadMonthlyMembershipCSV`)
- Export CSV Adhérents (`downloadMembersDetailCSV`)
- Export CSV Comptable (`downloadAccountingCSV`)

**Services utilisés :**
- `getFinancialKPIs()`
- `getRevenueEvolution()`
- `downloadMonthlyMembershipCSV()`
- `downloadMembersDetailCSV()`
- `downloadAccountingCSV()`

---

### 3. DemographicsAnalyticsPage.tsx
**Analyse démographique**

**KPIs affichés :**
- Âge Moyen
- Âge Médian
- Nombre de Codes Postaux différents
- Nombre de Profils Étendus (si disponibles)

**Graphiques :**
- Distribution par Âge (BarChart) - par tranches d'âge

**Tableaux :**
- Top 20 Codes Postaux avec répartition par type d'abonnement
- Top Professions (si profils étendus)
- Top Domaines d'Activité (si profils étendus)

**Services utilisés :**
- `getAgeDistribution()`
- `getGeographicDistribution()`
- `getProfessionalDistribution()`

---

### 4. EngagementAnalyticsPage.tsx
**Analyse de l'engagement des adhérents**

**KPIs affichés :**
- Nombre de Profils Étendus
- Nombre de Bénévoles
- Intéressés pour Participation
- Taux de Profils Publics
- Compétences Totales
- Compétences Uniques

**Graphiques :**
- Types d'Événements Préférés (BarChart horizontal)
- Domaines Artistiques (BarChart horizontal)
- Genres Musicaux (BarChart horizontal)
- Canaux d'Acquisition

**Tableaux :**
- Top 15 Compétences avec nombre de bénévoles et profils publics

**Services utilisés :**
- `getEngagementKPIs()`
- `getInterestsAnalytics()`
- `getSkillsAnalytics()`
- `getAcquisitionChannels()`

---

## Structure des Composants Utilisés

### Composants Réutilisables

#### KPICard
```typescript
<KPICard
  title="Titre du KPI"
  value={valeur}
  icon={<Icon />}
  color="couleur"
  description="Description optionnelle"
  trend={{ value: pourcentage, period: 'période' }}  // optionnel
/>
```

#### ReusableLineChart
```typescript
<ReusableLineChart
  title="Titre du graphique"
  subtitle="Sous-titre"
  data={données}
  xAxisKey="clé_x"
  series={[
    { dataKey: 'clé', name: 'Nom', color: '#couleur' }
  ]}
  height={hauteur}
/>
```

#### ReusableBarChart
```typescript
<ReusableBarChart
  title="Titre du graphique"
  subtitle="Sous-titre"
  data={données}
  xAxisKey="clé_x"
  series={[
    { dataKey: 'clé', name: 'Nom', color: '#couleur' }
  ]}
  height={hauteur}
  horizontal={true}  // optionnel
  stacked={true}     // optionnel
/>
```

#### ReusablePieChart
```typescript
<ReusablePieChart
  title="Titre du graphique"
  subtitle="Sous-titre"
  data={[
    { name: 'Label', value: nombre, color: '#couleur' }
  ]}
  height={hauteur}
  innerRadius={rayon}  // optionnel pour donut chart
/>
```

---

## Services Analytics

Tous les services sont situés dans `/src/shared/services/analytics/` :

- **analyticsService.ts** : Vue d'ensemble générale
- **financialAnalytics.ts** : KPIs et évolution financière
- **demographicAnalytics.ts** : Analyse démographique (âge, géographie, profession)
- **engagementAnalytics.ts** : Centres d'intérêt, compétences, acquisition
- **exportService.ts** : Exports CSV (mensuel, adhérents, comptable)
- **membershipAnalytics.ts** : Analyse des abonnements

---

## Types TypeScript

Tous les types sont définis dans `/src/shared/types/user.ts` :

### Types Analytics
- `OverviewKPIs`
- `FinancialKPIs`
- `RevenueEvolutionData`
- `AgeDistributionData`
- `GeographicData`
- `ProfessionalData`
- `EngagementKPIs`
- `InterestsAnalytics`
- `SkillsData`
- `AcquisitionData`

---

## Imports

Pour importer les pages dans votre application :

```typescript
import {
  AnalyticsOverviewPage,
  FinancialAnalyticsPage,
  DemographicsAnalyticsPage,
  EngagementAnalyticsPage,
} from '@/admin/pages/Analytics';
```

---

## Style et Design

Toutes les pages suivent le même design pattern :

1. **Header** : Titre de la page
2. **KPIs** : SimpleGrid avec 2-4 KPI cards par ligne (responsive)
3. **Graphiques** : Grid layout responsive
4. **Tableaux** : Paper avec Table Mantine
5. **Actions** : Boutons d'export ou autres actions

**Couleurs utilisées :**
- Blue (#339AF0) : Mensuel
- Green (#51CF66) : Annuel / Actif
- Purple (#CC5DE8) : Honoraire
- Teal : MRR / Financier
- Violet : Profils / ARPU
- Orange : Âge / Alertes
- Indigo : ARR / Advanced metrics

---

## Notes de Développement

- Toutes les pages utilisent `useState` et `useEffect` pour charger les données
- Loading overlay pendant le chargement
- Gestion d'erreur avec Alert Mantine
- Notifications Mantine pour les exports
- Responsive design avec breakpoints Mantine
- TypeScript strict mode compatible
