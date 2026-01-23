# Analytics System - Documentation

## Architecture

```
src/shared/services/analytics/
├── analyticsUtils.ts        # Fonctions utilitaires centralisees
├── usersDataCache.ts        # Cache unique des utilisateurs (TTL: 10 min)
├── analyticsService.ts      # KPIs overview (point d'entree principal)
├── demographicAnalytics.ts  # Analyses demographiques (age, geo, profession)
├── membershipAnalytics.ts   # Analyses abonnements
├── financialAnalytics.ts    # Analyses financieres
├── engagementAnalytics.ts   # Analyses engagement
├── eventAnalytics.ts        # Statistiques evenements
├── contributionAnalytics.ts # Statistiques contributions
└── exportService.ts         # Exports CSV/Excel
```

## Principes Cles

### 1. Source de Donnees Unique

Tous les services utilisent `usersDataCache.ts` au lieu de requetes Firestore directes:

```typescript
import { getUsers } from './usersDataCache';

const users = await getUsers();
```

### 2. Utilitaires Centralises

Toutes les fonctions utilitaires sont dans `analyticsUtils.ts`:

```typescript
import {
  toDate,
  calculateAge,
  isValidAge,
  normalizePlanType,
  getAgeRange,
  calculateAgeStatistics,
} from './analyticsUtils';
```

### 3. Validation Age Coherente

Un age est valide seulement si `age > 0 && age < 120`:

```typescript
if (isValidAge(age)) {
  // Utiliser l'age
}
```

## Ajouter de Nouvelles Fonctions

1. Ajouter la fonction dans `analyticsUtils.ts`
2. Exporter la fonction
3. Importer dans les services qui en ont besoin

## Performance

- Cache utilisateurs: 10 minutes TTL
- Cache KPIs Firestore: 1 heure TTL
- Une seule requete Firestore pour toutes les pages analytics
