# Architecture du Système Utilisateur FORNAP

## Vue d'ensemble

Ce document décrit l'architecture complète du système de gestion des utilisateurs pour la plateforme FORNAP, incluant la structure de données, les flux d'inscription, et les fonctionnalités admin.

## 1. Structure de Données Firestore

### Collection `users/{userId}`

```typescript
{
  // === INFORMATIONS DE BASE (Obligatoire pour tous) ===
  uid: string,
  email: string,
  firstName: string,
  lastName: string,
  postalCode: string,
  birthDate: Timestamp,
  phone: string,

  // === STATUT ET MÉTADONNÉES ===
  status: {
    tags: string[],  // ['vip', 'actif', 'inactif', 'billetterie', 'atelier_couture', 'exposant']
    isAccountBlocked: boolean,
    isCardBlocked: boolean,
    blockedReason?: string,
    blockedAt?: Timestamp,
    blockedBy?: string  // userId de l'admin qui a bloqué
  },

  // === ORIGINE DU COMPTE ===
  registration: {
    source: 'platform' | 'admin' | 'transfer',  // plateforme, ajout admin, ou transfert
    createdAt: Timestamp,
    createdBy?: string,  // userId de l'admin si ajout manuel
    transferredFrom?: string,  // référence ancien système si transfert
    ipAddress?: string,
    userAgent?: string
  },

  // === ABONNEMENT (Sous-collection pour historique) ===
  currentMembership: {
    planId: string,  // référence au plan d'abonnement
    planName: string,
    planType: 'monthly' | 'annual' | 'lifetime',
    status: 'active' | 'expired' | 'pending' | 'cancelled',
    paymentStatus: 'paid' | 'pending' | 'failed',
    startDate: Timestamp,
    expiryDate: Timestamp | null,  // null pour lifetime
    price: number,
    autoRenew: boolean,
    lastPaymentDate?: Timestamp
  },

  // === QR CODE ===
  qrCode: {
    code: string,  // Code unique
    generatedAt: Timestamp,
    lastScannedAt?: Timestamp,
    scanCount: number
  },

  // === POINTS DE FIDÉLITÉ ===
  loyaltyPoints: number,

  // === INFORMATIONS ÉTENDUES (Pour abonnements annuels) ===
  extendedProfile?: {
    // Vie Active & Engagement Associatif
    professional: {
      profession: string,
      activityDomain: string,
      status: 'salaried' | 'independent' | 'student' | 'retired' | 'unemployed',
      volunteerWork?: {
        isVolunteer: boolean,
        domains: string[]
      },
      skills: string[]  // ['graphisme', 'reseaux_sociaux', 'bricolage', etc.]
    },

    // Goûts et Intérêts
    interests: {
      eventTypes: string[],  // ['concerts', 'expositions', 'ateliers', etc.]
      artisticDomains: string[],  // ['musique', 'arts_visuels', 'litterature', etc.]
      musicGenres?: string[],
      conferenceThemes: string[]
    },

    // Liens & Canaux de Diffusion
    communication: {
      preferredContact: 'email' | 'sms' | 'social' | 'app',
      socialMedia?: {
        instagram?: string,
        facebook?: string,
        linkedin?: string,
        tiktok?: string,
        youtube?: string,
        blog?: string,
        website?: string
      },
      publicProfileConsent: boolean,
      publicProfileLevel: 'none' | 'all' | 'friends_only'
    },

    // Implication & Feedback
    engagement: {
      howDidYouKnowUs: string,
      suggestions?: string,
      participationInterest: {
        interested: boolean,
        domains: string[]
      }
    }
  },

  // === TIMESTAMPS ===
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt?: Timestamp
}
```

### Sous-collection `users/{userId}/membershipHistory/{historyId}`

Historique de tous les abonnements de l'utilisateur:

```typescript
{
  planId: string,
  planName: string,
  planType: 'monthly' | 'annual' | 'lifetime',
  status: 'active' | 'expired' | 'cancelled',
  startDate: Timestamp,
  endDate: Timestamp | null,
  price: number,
  paymentMethod?: string,
  transactionId?: string,
  cancelReason?: string,
  cancelledAt?: Timestamp
}
```

### Sous-collection `users/{userId}/actionHistory/{actionId}`

Traçabilité complète de toutes les actions:

```typescript
{
  actionType: 'scan' | 'transaction' | 'event_checkin' | 'loyalty_earned' | 'loyalty_spent' | 'profile_update' | 'card_blocked' | 'card_unblocked',

  // Détails selon le type
  details: {
    // Pour scan/event_checkin
    location?: string,
    eventId?: string,
    eventName?: string,
    scannedBy?: string,  // userId de qui a scanné

    // Pour transaction
    amount?: number,
    description?: string,
    transactionId?: string,

    // Pour loyalty
    pointsChange?: number,
    balanceBefore?: number,
    balanceAfter?: number,
    reason?: string,

    // Pour profile_update
    fieldUpdated?: string,
    oldValue?: any,
    newValue?: any,
    updatedBy?: string  // userId de l'admin si modif admin
  },

  // Métadonnées
  timestamp: Timestamp,
  ipAddress?: string,
  userAgent?: string,
  deviceType?: 'web' | 'mobile' | 'scanner',
  notes?: string
}
```

## 2. Flux d'Inscription

### Flux A: Nouvel Utilisateur

1. **Page /membership**: L'utilisateur choisit sa formule
2. **Page /signup?plan={planId}**:
   - Collecte des informations de base (obligatoires)
   - Si plan annuel: afficher formulaire étendu
   - Validation et création du compte
3. **Paiement**: Intégration Stripe/autre
4. **Génération QR Code**: Création et affichage
5. **Email de confirmation**: Envoi avec QR code

### Flux B: Transfert d'Ancien Compte

1. **Scan de l'ancien QR code**
2. **Vérification**: Check si le code existe dans l'ancien système
3. **Récupération des données**: Import des informations disponibles
4. **Complément**: Demande des informations manquantes
5. **Création du compte**: Avec flag `registration.source = 'transfer'`
6. **Génération nouveau QR Code**

### Flux C: Création Manuelle (Admin)

1. **Interface admin**: Formulaire complet
2. **Saisie de toutes les informations**
3. **Création du compte**: Avec flag `registration.source = 'admin'`
4. **Génération QR Code**
5. **Option**: Envoi email/SMS avec credentials

## 3. Fonctionnalités Admin

### Page de Liste des Utilisateurs

**Filtres:**
- Recherche par nom, email, téléphone
- Type d'abonnement
- Statut d'abonnement
- Tags
- Date d'inscription (range)
- Statut compte/carte (bloqué/actif)
- Source d'inscription (platform/admin/transfer)

**Colonnes affichées:**
- Avatar + Nom complet
- Email
- Type d'abonnement + badge
- Statut abonnement
- Points fidélité
- Tags (max 2 + compteur)
- Date inscription
- Actions rapides

**Export:**
- CSV avec toutes les données
- Excel avec feuilles multiples (info base, abonnements, historique)

### Page Détail Utilisateur

**Onglets:**
1. **Informations Générales**: Toutes les infos de base + bouton édition
2. **Abonnement**: Détails + historique + actions (renouveler, annuler)
3. **Profil Étendu**: Si abonnement annuel
4. **Historique d'Actions**: Liste paginée avec filtres
5. **Points de Fidélité**: Historique + ajout/retrait manuel
6. **Gestion Compte**: Bloquer/débloquer compte ou carte

**Actions disponibles:**
- Éditer informations
- Modifier abonnement
- Ajouter/retirer points fidélité
- Bloquer/débloquer compte
- Bloquer/débloquer carte
- Envoyer email/SMS
- Régénérer QR code
- Exporter données utilisateur (RGPD)
- Supprimer compte (soft delete)

### Formulaire Création Manuelle

**Sections:**
1. Informations de base (obligatoires)
2. Choix de l'abonnement + statut paiement
3. Tags et statuts
4. Informations étendues (si annuel)
5. Génération automatique ou importation QR code
6. Notes admin

## 4. Règles de Validation

### Informations de base
- Email: format valide + unicité
- Téléphone: format français + unicité
- Date de naissance: âge minimum 18 ans
- Code postal: format français valide

### Abonnement
- Date expiration calculée automatiquement selon le type
- Vérification du paiement avant activation
- Un seul abonnement actif à la fois

### QR Code
- Unicité garantie
- Format: FORNAP-{userId}-{timestamp}-{random}
- Régénération possible (ancien désactivé)

## 5. Sécurité et Permissions

### Permissions Firestore Rules

```javascript
// Users peuvent lire/modifier leur propre profil
match /users/{userId} {
  allow read: if request.auth.uid == userId || isAdmin();
  allow update: if request.auth.uid == userId && validUserUpdate();
  allow create: if request.auth != null;
  allow delete: if isAdmin();

  // Historique en lecture seule pour l'utilisateur
  match /actionHistory/{actionId} {
    allow read: if request.auth.uid == userId || isAdmin();
    allow write: if isAdmin() || isSystem();
  }

  match /membershipHistory/{historyId} {
    allow read: if request.auth.uid == userId || isAdmin();
    allow write: if isAdmin() || isSystem();
  }
}
```

## 6. Notifications et Emails

### Events déclenchant des notifications:
- Création de compte
- Paiement réussi
- Abonnement expirant (7 jours, 1 jour)
- Abonnement expiré
- Renouvellement automatique
- Carte/compte bloqué
- Points fidélité gagnés
- Actions importantes sur le compte

## 7. Intégrations Futures

### Possibilités d'extension:
- API publique pour partenaires
- Synchronisation avec CRM externe
- Webhook pour événements importants
- Application mobile avec scan QR
- Borne automatique de check-in
- Système de parrainage
- Programme de fidélité avancé

## 8. Migrations et Maintenance

### Scripts nécessaires:
- Migration des anciens comptes
- Recalcul des dates d'expiration
- Nettoyage des données obsolètes
- Backup régulier
- Audit des actions admin

## 9. Métriques et Analytics

### KPIs à suivre:
- Taux de conversion par formule
- Churn rate
- Lifetime value
- Taux d'utilisation QR code
- Engagement par type de membre
- ROI par canal d'acquisition
