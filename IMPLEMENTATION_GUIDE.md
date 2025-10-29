# Guide d'Implémentation du Système Utilisateur FORNAP

## Vue d'ensemble

Ce document vous guide à travers l'implémentation complète du nouveau système de gestion des utilisateurs pour la plateforme FORNAP. Le système inclut:

- ✅ Structure de données Firestore complète et professionnelle
- ✅ Types TypeScript complets et bien documentés
- ✅ Service utilisateur avec toutes les fonctionnalités CRUD
- ✅ Système de traçabilité des actions
- ✅ Processus d'inscription adaptatif (base vs étendu)
- ✅ Interface admin complète
- ✅ Gestion du blocage compte/carte
- ✅ Création manuelle d'utilisateurs

## Structure du Projet

### Fichiers Créés

```
/
├── USER_SYSTEM_ARCHITECTURE.md          # Documentation architecturale complète
├── IMPLEMENTATION_GUIDE.md              # Ce document
│
├── src/
│   ├── shared/
│   │   ├── types/
│   │   │   └── user.ts                 # Types TypeScript complets (600+ lignes)
│   │   │
│   │   └── services/
│   │       └── userService.ts          # Service complet (900+ lignes)
│   │
│   ├── app/
│   │   └── pages/
│   │       └── Signup/
│   │           ├── EnhancedSignup.tsx           # Composant d'inscription adaptatif
│   │           └── steps/
│   │               ├── ProfessionalInfoStep.tsx
│   │               ├── ExtendedInterestsStep.tsx
│   │               ├── CommunicationPreferencesStep.tsx
│   │               └── EngagementStep.tsx
│   │
│   └── admin/
│       ├── pages/
│       │   └── Users/
│       │       └── EnhancedUsersListPage.tsx    # Page de liste des utilisateurs
│       │
│       └── components/
│           └── users/
│               ├── CreateUserModal.tsx          # Modal de création
│               └── CreateUserForms/
│                   ├── BasicInfoForm.tsx
│                   ├── MembershipForm.tsx
│                   ├── ExtendedProfileForm.tsx
│                   └── ReviewForm.tsx
```

## Étape 1: Configuration de la Base de Données

### 1.1 Structure Firestore

La nouvelle structure de données utilise:
- **Collection principale**: `users/{userId}`
- **Sous-collections**:
  - `users/{userId}/actionHistory/{actionId}` - Historique des actions
  - `users/{userId}/membershipHistory/{historyId}` - Historique des abonnements

### 1.2 Règles de Sécurité Firestore

Ajoutez ces règles dans votre console Firebase:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonction helper pour vérifier si l'utilisateur est admin
    function isAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // Fonction helper pour vérifier si l'utilisateur est le système
    function isSystem() {
      return request.auth.token.admin == true;
    }

    // Collection des utilisateurs
    match /users/{userId} {
      // Lecture: l'utilisateur peut lire son propre profil ou les admins
      allow read: if request.auth.uid == userId || isAdmin();

      // Création: tout utilisateur authentifié peut créer son profil
      allow create: if request.auth != null;

      // Mise à jour: l'utilisateur peut modifier son profil ou les admins
      allow update: if request.auth.uid == userId || isAdmin();

      // Suppression: seulement les admins
      allow delete: if isAdmin();

      // Sous-collection actionHistory
      match /actionHistory/{actionId} {
        allow read: if request.auth.uid == userId || isAdmin();
        allow write: if isAdmin() || isSystem();
      }

      // Sous-collection membershipHistory
      match /membershipHistory/{historyId} {
        allow read: if request.auth.uid == userId || isAdmin();
        allow write: if isAdmin() || isSystem();
      }
    }

    // Collection des admins (à créer manuellement)
    match /admins/{adminId} {
      allow read: if request.auth.uid == adminId;
    }
  }
}
```

### 1.3 Index Firestore Requis

Créez ces index composites dans Firebase Console:

1. **Index pour la recherche d'utilisateurs**:
   - Collection: `users`
   - Champs: `currentMembership.planType` (Ascending), `createdAt` (Descending)

2. **Index pour le filtrage par statut**:
   - Collection: `users`
   - Champs: `currentMembership.status` (Ascending), `createdAt` (Descending)

3. **Index pour l'historique d'actions**:
   - Collection: `users/{userId}/actionHistory`
   - Champs: `actionType` (Ascending), `timestamp` (Descending)

## Étape 2: Intégration des Types

### 2.1 Remplacer les Anciens Types

Le nouveau fichier `src/shared/types/user.ts` remplace complètement l'ancien. Il contient:

- Types de base exhaustifs
- Interfaces pour toutes les structures de données
- Types utilitaires avec type guards
- Constantes et labels pour l'affichage
- Documentation JSDoc complète

### 2.2 Mettre à Jour les Imports

Dans tous vos fichiers existants, mettez à jour les imports:

```typescript
// Ancien
import { UserProfile, SignupFormData } from '../types/user';

// Nouveau
import { User, BasicSignupFormData, ExtendedSignupFormData } from '../types/user';
```

## Étape 3: Intégration du Service Utilisateur

### 3.1 Vérifier le Fichier de Configuration Firebase

Assurez-vous que `src/shared/config/firebase.ts` exporte bien `db`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Votre configuration
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### 3.2 Utiliser le Service

Exemples d'utilisation du service:

```typescript
import {
  createUser,
  getUserById,
  updateUser,
  toggleAccountBlocked,
  addLoyaltyPoints,
  recordQRCodeScan,
} from '../services/userService';

// Créer un utilisateur
const userId = await createUser(userData);

// Récupérer un utilisateur
const user = await getUserById(userId);

// Bloquer un compte
await toggleAccountBlocked(userId, true, 'Raison', adminId);

// Ajouter des points de fidélité
await addLoyaltyPoints(userId, 50, 'Achat effectué');

// Enregistrer un scan de QR code
await recordQRCodeScan(userId, 'Entrée principale', scannerId);
```

## Étape 4: Mise en Place du Processus d'Inscription

### 4.1 Mettre à Jour le Contexte d'Authentification

Dans `src/shared/contexts/AuthContext.tsx`, mettez à jour la fonction `signup`:

```typescript
import { createUser } from '../services/userService';
import type { BasicSignupFormData, ExtendedSignupFormData } from '../types/user';

const signup = async (formData: BasicSignupFormData | ExtendedSignupFormData) => {
  try {
    // 1. Créer le compte Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );

    // 2. Récupérer le plan d'abonnement
    const plan = await getMembershipPlanById(formData.planId);
    if (!plan) throw new Error('Plan not found');

    // 3. Préparer les données utilisateur
    const now = Timestamp.now();
    const startDate = now;
    const expiryDate = calculateExpiryDate(startDate.toDate(), plan.period);

    const userData = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      postalCode: formData.postalCode,
      birthDate: Timestamp.fromDate(new Date(formData.birthDate)),
      phone: formData.phone,

      status: {
        tags: [],
        isAccountBlocked: false,
        isCardBlocked: false,
      },

      registration: {
        source: 'platform' as const,
        createdAt: now,
      },

      currentMembership: {
        planId: plan.id,
        planName: plan.name,
        planType: plan.period,
        status: 'pending' as const, // Sera 'active' après paiement
        paymentStatus: 'pending' as const,
        startDate,
        expiryDate: expiryDate ? Timestamp.fromDate(expiryDate) : null,
        price: plan.price,
        autoRenew: false,
      },

      loyaltyPoints: 0,

      // Profil étendu si abonnement annuel
      extendedProfile: isExtendedSignup(formData) ? {
        professional: {
          profession: formData.profession,
          activityDomain: formData.activityDomain,
          status: formData.professionalStatus,
          volunteerWork: formData.isVolunteer ? {
            isVolunteer: true,
            domains: formData.volunteerDomains,
          } : undefined,
          skills: formData.skills,
        },
        interests: {
          eventTypes: formData.eventTypes,
          artisticDomains: formData.artisticDomains,
          musicGenres: formData.musicGenres,
          conferenceThemes: formData.conferenceThemes,
        },
        communication: {
          preferredContact: formData.preferredContact,
          socialMedia: {
            instagram: formData.instagram,
            facebook: formData.facebook,
            linkedin: formData.linkedin,
            tiktok: formData.tiktok,
            youtube: formData.youtube,
            blog: formData.blog,
            website: formData.website,
          },
          publicProfileConsent: formData.publicProfileConsent,
          publicProfileLevel: formData.publicProfileLevel,
        },
        engagement: {
          howDidYouKnowUs: formData.howDidYouKnowUs,
          suggestions: formData.suggestions,
          participationInterest: {
            interested: formData.participationInterested,
            domains: formData.participationDomains,
          },
        },
      } : undefined,
    };

    // 4. Créer le document utilisateur dans Firestore
    await createUser(userData, getClientIP(), getUserAgent());

    // 5. Rediriger vers le paiement (Stripe, etc.)
    // ...

  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

// Type guard
function isExtendedSignup(data: any): data is ExtendedSignupFormData {
  return 'profession' in data;
}

function calculateExpiryDate(startDate: Date, period: string): Date | null {
  if (period === 'lifetime') return null;
  const expiry = new Date(startDate);
  if (period === 'month') {
    expiry.setMonth(expiry.getMonth() + 1);
  } else if (period === 'year') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  }
  return expiry;
}
```

### 4.2 Mettre à Jour les Routes

Dans votre fichier de routes (ex: `src/App.tsx` ou `src/routes/index.tsx`):

```typescript
import { EnhancedSignup } from './app/pages/Signup/EnhancedSignup';

// Remplacer l'ancienne route
<Route path="/signup" element={<EnhancedSignup />} />
```

## Étape 5: Configuration de l'Interface Admin

### 5.1 Créer le Hook useMembershipPlans

Si ce n'est pas déjà fait, créez `src/shared/hooks/useMembershipPlans.ts`:

```typescript
import { useState, useEffect } from 'react';
import { getAllMembershipPlans } from '../services/membershipService';
import type { MembershipPlan } from '../types/membership';

export function useMembershipPlans(onlyActive: boolean = false) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadPlans();
  }, [onlyActive]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await getAllMembershipPlans(onlyActive);
      setPlans(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { plans, loading, error, refresh: loadPlans };
}
```

### 5.2 Mettre à Jour les Routes Admin

```typescript
import { EnhancedUsersListPage } from './admin/pages/Users/EnhancedUsersListPage';

<Route path="/admin/users" element={<EnhancedUsersListPage />} />
```

### 5.3 Créer les Composants Manquants

Si vous n'avez pas encore ces composants, créez-les:

**StepProgress Component** (`src/app/components/common/StepProgress.tsx`):

```typescript
import { Progress, Text, Group } from '@mantine/core';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function StepProgress({ currentStep, totalSteps, stepLabels }: StepProgressProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div>
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={700}>
          Étape {currentStep + 1} sur {totalSteps}
        </Text>
        <Text size="sm" c="dimmed">
          {stepLabels[currentStep]}
        </Text>
      </Group>
      <Progress value={progress} size="md" radius="xl" />
    </div>
  );
}
```

## Étape 6: Tests et Validation

### 6.1 Tests à Effectuer

1. **Inscription utilisateur**:
   - [ ] Inscription avec plan mensuel (formulaire de base uniquement)
   - [ ] Inscription avec plan annuel (formulaire étendu)
   - [ ] Validation des champs
   - [ ] Génération du QR code
   - [ ] Création de l'historique

2. **Interface Admin**:
   - [ ] Liste des utilisateurs avec filtres
   - [ ] Création manuelle d'utilisateur
   - [ ] Blocage/déblocage de compte
   - [ ] Blocage/déblocage de carte
   - [ ] Régénération de QR code
   - [ ] Ajout/retrait de points de fidélité

3. **Traçabilité**:
   - [ ] Scan de QR code enregistré
   - [ ] Actions admin enregistrées
   - [ ] Historique d'abonnement créé

### 6.2 Données de Test

Créez des utilisateurs de test pour chaque scénario:

```typescript
// Script de test (à exécuter dans la console ou via un endpoint admin)
import { createUserByAdmin } from './services/userService';

// Utilisateur test mensuel
await createUserByAdmin('admin-id', {
  email: 'test.monthly@example.com',
  firstName: 'Test',
  lastName: 'Mensuel',
  postalCode: '75001',
  birthDate: '1990-01-01',
  phone: '0612345678',
  planId: 'monthly',
  paymentStatus: 'paid',
  startDate: new Date().toISOString().split('T')[0],
  autoRenew: false,
  tags: ['test'],
  isAccountBlocked: false,
  isCardBlocked: false,
});

// Utilisateur test annuel avec profil étendu
await createUserByAdmin('admin-id', {
  email: 'test.annual@example.com',
  firstName: 'Test',
  lastName: 'Annuel',
  postalCode: '75002',
  birthDate: '1985-05-15',
  phone: '0698765432',
  planId: 'annual',
  paymentStatus: 'paid',
  startDate: new Date().toISOString().split('T')[0],
  autoRenew: true,
  tags: ['test', 'vip'],
  isAccountBlocked: false,
  isCardBlocked: false,
  extendedProfile: {
    professional: {
      profession: 'Développeur',
      activityDomain: 'Technologie',
      status: 'salaried',
      skills: ['informatique', 'graphisme'],
    },
    interests: {
      eventTypes: ['concerts', 'expositions'],
      artisticDomains: ['musique', 'arts_visuels'],
      musicGenres: ['jazz', 'rock'],
      conferenceThemes: ['technologie', 'innovation'],
    },
    communication: {
      preferredContact: 'email',
      socialMedia: {
        instagram: '@test',
      },
      publicProfileConsent: true,
      publicProfileLevel: 'all',
    },
    engagement: {
      howDidYouKnowUs: 'Test',
      suggestions: 'Aucune',
      participationInterest: {
        interested: false,
        domains: [],
      },
    },
  },
});
```

## Étape 7: Migration des Données Existantes

Si vous avez déjà des utilisateurs dans votre base de données:

### 7.1 Script de Migration

Créez un script de migration (`scripts/migrateUsers.ts`):

```typescript
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../src/shared/config/firebase';
import { generateUniqueQRCode } from '../src/shared/services/userService';

async function migrateUsers() {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  let migrated = 0;
  let errors = 0;

  for (const userDoc of snapshot.docs) {
    try {
      const oldData = userDoc.data();

      // Générer QR code si n'existe pas
      const qrCode = oldData.qrCode || await generateUniqueQRCode(userDoc.id);

      // Transformer vers nouvelle structure
      const newData = {
        // Garder les champs existants
        ...oldData,

        // Ajouter les nouveaux champs requis
        status: {
          tags: oldData.tags || [],
          isAccountBlocked: oldData.isBlocked || false,
          isCardBlocked: false,
        },

        registration: {
          source: 'platform',
          createdAt: oldData.createdAt || Timestamp.now(),
        },

        qrCode: {
          code: qrCode,
          generatedAt: Timestamp.now(),
          scanCount: 0,
        },

        loyaltyPoints: oldData.loyaltyPoints || 0,

        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'users', userDoc.id), newData);
      migrated++;
      console.log(`Migrated user ${userDoc.id}`);

    } catch (error) {
      console.error(`Error migrating user ${userDoc.id}:`, error);
      errors++;
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${errors} errors`);
}

// Exécuter
migrateUsers();
```

### 7.2 Exécution de la Migration

```bash
# Installer ts-node si nécessaire
npm install -D ts-node

# Exécuter le script
npx ts-node scripts/migrateUsers.ts
```

## Étape 8: Optimisations et Améliorations Futures

### 8.1 Intégration Stripe

Pour gérer les paiements:

```typescript
import { loadStripe } from '@stripe/stripe-js';

const handlePayment = async (planId: string, userId: string) => {
  const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY!);

  // Créer une session de paiement
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, userId }),
  });

  const session = await response.json();

  // Rediriger vers Stripe
  await stripe?.redirectToCheckout({ sessionId: session.id });
};
```

### 8.2 Notifications Email

Utilisez Firebase Cloud Functions pour envoyer des emails:

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

export const onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data();

    // Envoyer email de bienvenue
    await sendWelcomeEmail(userData.email, {
      firstName: userData.firstName,
      qrCode: userData.qrCode.code,
    });
  });

export const onMembershipExpiring = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    // Vérifier les abonnements expirant dans 7 jours
    const expiringUsers = await getExpiringMemberships(7);

    for (const user of expiringUsers) {
      await sendExpirationWarningEmail(user.email, {
        firstName: user.firstName,
        expiryDate: user.currentMembership.expiryDate,
      });
    }
  });
```

### 8.3 Application Mobile (React Native)

Pour scanner les QR codes:

```typescript
import { Camera } from 'expo-camera';
import { recordQRCodeScan } from './services/userService';

const QRScanner = () => {
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    try {
      // Vérifier le format du QR code
      if (data.startsWith('FORNAP-')) {
        const user = await getUserByQRCode(data);
        if (user) {
          await recordQRCodeScan(
            user.uid,
            'Event Location',
            scannerId,
            eventId,
            eventName
          );
          // Afficher succès
        }
      }
    } catch (error) {
      // Afficher erreur
    }
  };

  return <Camera onBarCodeScanned={handleBarCodeScanned} />;
};
```

### 8.4 Export de Données (RGPD)

Interface pour l'export des données utilisateur:

```typescript
import { exportUserData } from './services/userService';

const handleExportData = async (userId: string) => {
  const data = await exportUserData(userId);

  // Créer un fichier JSON téléchargeable
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `user-data-${userId}.json`;
  a.click();
};
```

## Étape 9: Monitoring et Analytics

### 9.1 Métriques Importantes

Ajoutez ces métriques dans votre dashboard admin:

```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';

// Taux de conversion par formule
const getConversionRate = async (planId: string) => {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('currentMembership.planId', '==', planId),
    where('currentMembership.status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

// Churn rate (utilisateurs qui n'ont pas renouvelé)
const getChurnRate = async () => {
  const usersRef = collection(db, 'users');
  const expiredQuery = query(
    usersRef,
    where('currentMembership.status', '==', 'expired')
  );
  const expiredSnapshot = await getDocs(expiredQuery);

  const totalQuery = query(usersRef);
  const totalSnapshot = await getDocs(totalQuery);

  return (expiredSnapshot.size / totalSnapshot.size) * 100;
};

// Lifetime Value moyen
const getAverageLTV = async () => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  let totalRevenue = 0;
  snapshot.forEach((doc) => {
    const user = doc.data();
    totalRevenue += user.currentMembership.price || 0;
  });

  return totalRevenue / snapshot.size;
};
```

## Troubleshooting

### Problèmes Courants

1. **Erreur: "Missing or insufficient permissions"**
   - Vérifiez vos règles Firestore
   - Assurez-vous que l'utilisateur est authentifié

2. **Erreur: "QR code generation failed"**
   - Vérifiez la connexion à Firestore
   - Assurez-vous que la fonction d'unicité fonctionne

3. **Types TypeScript non reconnus**
   - Redémarrez votre serveur de développement
   - Vérifiez les imports

4. **Formulaire étendu ne s'affiche pas**
   - Vérifiez que le plan est bien de type 'year'
   - Vérifiez la logique dans EnhancedSignup.tsx

## Support et Contact

Pour toute question ou problème:
- Consultez la documentation Firebase: https://firebase.google.com/docs
- Consultez la documentation Mantine: https://mantine.dev

## Changelog

### Version 1.0.0 (Date actuelle)
- ✅ Architecture complète implémentée
- ✅ Types TypeScript complets
- ✅ Service utilisateur avec toutes les fonctionnalités
- ✅ Processus d'inscription adaptatif
- ✅ Interface admin complète
- ✅ Système de traçabilité
- ✅ Gestion du blocage
- ✅ Création manuelle d'utilisateurs

---

**Bon développement! 🚀**
