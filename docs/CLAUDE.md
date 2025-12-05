# Documentation Système FORNAP - Guide Claude

Ce document contient les informations essentielles sur la logique métier et l'architecture du système FORNAP, destiné à être utilisé comme référence par Claude Code.

## Types d'Adhésions et Dates d'Expiration

### 🎯 Règle Fondamentale

**IL N'Y A PAS D'ADHÉSION ILLIMITÉE DANS LES SYSTÈMES PAYANTS (adhesion & crowdfunding)**

### Types d'adhésions supportés

Le système supporte 3 types d'adhésions (`MembershipType`) :

#### 1. `monthly` - Adhésion Mensuelle
- **Durée** : 1 mois
- **Calcul** : `startDate + 1 mois`
- **Prix** : 2€
- **Expiration** : TOUJOURS une date calculée (jamais `null`)
- **Exemple** : Adhésion créée le 04/12/2025 → expire le 04/01/2026

#### 2. `annual` - Adhésion Annuelle
- **Durée** : 1 an
- **Calcul** : `startDate + 1 an`
- **Prix** : 12€ (adhesion) ou variable (crowdfunding)
- **Expiration** : TOUJOURS une date calculée (jamais `null`)
- **Exemple** : Adhésion créée le 04/12/2025 → expire le 04/12/2026

#### 3. `lifetime` - Membre d'Honneur (ADMIN UNIQUEMENT)
- **Durée** : Illimitée
- **Calcul** : `expiryDate = null`
- **Prix** : N/A
- **Expiration** : `null` (affichée comme "Illimité" dans l'interface)
- **Création** : UNIQUEMENT via l'admin panel (création manuelle)
- **Usage** : Membres d'honneur, anciens membres migrés avec statut spécial

### ⚠️ Sources de Création et Règles d'Expiration

| Source | Types Autorisés | Expiration Peut Être Null ? |
|--------|----------------|----------------------------|
| `adhesion_web` | `monthly`, `annual` | ❌ NON - Toujours une date |
| `crowdfunding` | `monthly`, `annual`, `null` (dons) | ⚠️ OUI seulement pour dons sans membership |
| `platform` | `monthly`, `annual` | ❌ NON - Toujours une date |
| `admin` | `monthly`, `annual`, `lifetime` | ✅ OUI seulement si `lifetime` |
| `transfer` | `monthly`, `annual`, `lifetime` | ✅ OUI seulement si `lifetime` |

### 🔧 Implémentation Technique

#### Fonction `calculateExpiryDate()`

**Dans `/src/adhesion/services/adhesionService.ts`** :
```typescript
function calculateExpiryDate(startDate: Date, membershipType: AdhesionType): Timestamp {
  const expiryDate = new Date(startDate);

  if (membershipType === 'monthly') {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else if (membershipType === 'annual') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else {
    // Sécurité : ne devrait jamais arriver
    console.error(`Type invalide: ${membershipType}`);
    expiryDate.setMonth(expiryDate.getMonth() + 1); // Défaut: 1 mois
  }

  return Timestamp.fromDate(expiryDate); // ⚠️ Ne retourne JAMAIS null
}
```

**Dans `/src/services/contributionService.ts` (crowdfunding)** :
```typescript
function calculateExpiryDate(startDate: Date, membershipType: MembershipType): Timestamp | null {
  if (membershipType === null) {
    return null; // OK pour dons sans membership
  }

  const expiryDate = new Date(startDate);

  if (membershipType === 'monthly') {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else if (membershipType === 'annual') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else {
    // Sécurité
    console.error(`Type invalide: ${membershipType}`);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Défaut: 1 an
  }

  return Timestamp.fromDate(expiryDate);
}
```

### 🐛 Bug Corrigé (04/12/2025)

**Problème identifié** : Des utilisateurs ayant pris une adhésion mensuelle 2€ via le mini-site adhesion se retrouvaient avec `expiryDate: null` (affiché comme "Illimité").

**Cause** :
1. Le type `expiryDate: Timestamp | null` permettait théoriquement `null`
2. Aucune validation stricte empêchant `null` pour les adhésions payantes
3. Risque d'edge case où le type n'était pas correctement vérifié

**Corrections appliquées** :
1. ✅ Ajout d'un `else` de sécurité dans `calculateExpiryDate()` (3 fichiers)
2. ✅ Ajout d'une vérification stricte dans `createUser()` pour adhesion
3. ✅ Changement du type de retour de `Timestamp | null` → `Timestamp` pour adhesion
4. ✅ Documentation claire avec commentaires dans le code

**Fichiers modifiés** :
- `/src/adhesion/services/adhesionService.ts`
- `/src/services/contributionService.ts`
- `/src/shared/services/contributionService.ts`

## Logique de Prix par Type d'Adhésion

### Mini-site Adhésion (`/src/adhesion/`)

| Type | Prix | Nom |
|------|------|-----|
| `monthly` | 2€ | Adhésion mensuelle 2€ |
| `annual` | 12€ | Adhésion annuelle 12€ |

### Crowdfunding (`/src/crowdfunding/`)

| Forfait | Prix | Type | Durée |
|---------|------|------|-------|
| Don libre | Variable | `null` | - |
| PASS Love | 2€ | `monthly` | 1 mois |
| PASS PIONNIER | 12€ | `annual` | 1 an |
| PASS SUMMER | 35€ | `annual` | 1 an |
| PACK WINTER | 55€ | `annual` | 1 an |
| PACK PARTY HARDER | 25€ | `annual` | 1 an |
| PACK AMBASSADEUR | 60€ | `annual` | 1 an |
| MEETING PASS | 100€ | `annual` | 1 an |
| COWORK PASS | 150€ | `annual` | 1 an |
| MANUFACTURE PASS | 200€ | `annual` | 1 an |
| PRIVATE PASS | 400€ | `annual` | 1 an |
| BÂTISSEURS du FORT | 1000€+ | `annual` | 1 an |

## Structure de Données dans Firestore

### Collection `users`

Chaque utilisateur a un champ `currentMembership` :

```typescript
currentMembership: {
  planId: string;              // Ex: "adhesion_monthly_2eur"
  planName: string;            // Ex: "Adhésion mensuelle 2€"
  planType: 'monthly' | 'annual' | 'lifetime';
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'failed';
  startDate: Timestamp;        // Date de début
  expiryDate: Timestamp | null; // Date de fin OU null si lifetime
  price: number;               // Prix payé
  autoRenew: boolean;          // Renouvellement auto
}
```

### Règles de Validation

**AVANT d'écrire dans Firestore** :
1. ✅ Vérifier que si `planType === 'monthly'` ou `'annual'` → `expiryDate !== null`
2. ✅ Vérifier que si `planType === 'lifetime'` → `expiryDate === null`
3. ✅ Calculer `expiryDate` avec `calculateExpiryDate(startDate, planType)`

## Affichage dans l'Interface

### Admin Panel (`UserDetailPage.tsx`)

```typescript
{user.currentMembership.expiryDate
  ? toDate(user.currentMembership.expiryDate).toLocaleDateString('fr-FR')
  : 'Illimité'}
```

- Si `expiryDate` existe → affiche la date formatée
- Si `expiryDate === null` → affiche "Illimité"

## Points de Vigilance pour Claude Code

### ❌ À NE JAMAIS FAIRE

1. **Ne JAMAIS créer** un user avec `planType: 'monthly'` ou `'annual'` ET `expiryDate: null`
2. **Ne JAMAIS utiliser** `lifetime` dans adhesion ou crowdfunding (réservé admin)
3. **Ne JAMAIS modifier** `calculateExpiryDate()` sans vérifier les 3 implémentations
4. **Ne JAMAIS omettre** la validation de `expiryDate` lors de la création d'un user

### ✅ À TOUJOURS FAIRE

1. **Toujours utiliser** `calculateExpiryDate()` pour calculer la date d'expiration
2. **Toujours valider** que `expiryDate` n'est pas null pour monthly/annual
3. **Toujours documenter** les changements dans ce fichier CLAUDE.md
4. **Toujours vérifier** les 3 fichiers `contributionService.ts` en cas de modification

## Historique des Modifications

### 04/12/2025 - Correction Bug Expiration Illimitée
- **Problème** : Users avec adhésion mensuelle 2€ ayant `expiryDate: null`
- **Fichiers modifiés** :
  - `src/adhesion/services/adhesionService.ts`
  - `src/services/contributionService.ts`
  - `src/shared/services/contributionService.ts`
- **Corrections** :
  - Ajout clause `else` de sécurité dans `calculateExpiryDate()`
  - Ajout validation stricte dans `createUser()` pour adhesion
  - Type de retour changé en `Timestamp` (non-nullable) pour adhesion
  - Documentation ajoutée dans le code

---

**Note** : Ce document doit être mis à jour à chaque changement significatif de la logique métier concernant les adhésions, les dates d'expiration, ou la création d'utilisateurs.
