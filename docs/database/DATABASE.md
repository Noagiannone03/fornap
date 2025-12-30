# Firestore Database Structure

This document outlines the structure and organization of the Firestore database used in the Fornap application.

## Overview

The Fornap application primarily uses a single top-level collection named `users` to store all user-related data. Each document within this collection represents a unique user and is identified by their Firebase Authentication User ID (UID).

## Collections

### 1. `users` Collection

*   **Purpose**: Stores comprehensive profile information for each registered user of the application.
*   **Document ID**: The `uid` (User ID) provided by Firebase Authentication. This ensures a direct link between the authentication record and the user's profile data.
*   **Document Structure**: Each document adheres to the `UserProfile` interface defined in `src/types/user.ts`. Below are the key fields and their descriptions:

    ```typescript
    interface UserProfile {
      uid: string; // Firebase Authentication User ID (Document ID)
      email: string; // User's email address
      createdAt: string; // ISO date string of account creation

      // Personal Information
      firstName: string;
      lastName: string;
      dateOfBirth?: string; // ISO date string
      phone?: string;
      postalCode?: string;

      // Membership Details
      membership?: {
        type: 'monthly' | 'annual' | 'honorary';
        status: 'active' | 'inactive' | 'pending' | 'expired';
        startDate: string; // ISO date string
        endDate?: string; // ISO date string (undefined for honorary)
        validUntil?: string; // ISO date string
        autoRenew?: boolean;
      };
      // Note: 'subscription' field is also present, mirroring 'membership' for compatibility.
      subscription?: {
        type: string;
        status: 'active' | 'inactive';
        startDate: string;
        endDate: string;
        autoRenew?: boolean;
      };

      // Loyalty Program
      loyaltyPoints: number; // Accumulated loyalty points

      // Activity History
      activityHistory: Array<{
        id: string;
        type: 'event' | 'purchase' | 'workshop' | 'subscription' | 'other';
        title: string;
        description?: string;
        date: string; // ISO date string
        points?: number; // Points gained from this activity
      }>;

      // Customizable Tags
      tags: Array<'actif' | 'inactif' | 'vip' | 'atelier_couture' | 'billetterie' | 'exposant' | string>;

      // Interests (Optional)
      interests?: string[];

      // Personality Questions (Optional)
      howDidYouHearAboutUs?: string;
      preferredAmbiance?: string;

      // QR Code for Member Identification
      qrCode?: string; // Content: "FORNAP-MEMBER:{uid}"
    }
    ```

## Registration Sources

Les utilisateurs peuvent être créés via **5 sources différentes** :

### 1. `platform` - Inscription normale
- **Description** : Utilisateur inscrit via le formulaire d'inscription du site web FORNAP
- **Processus** : Formulaire → Paiement → Création compte
- **Champs spécifiques** : `ipAddress`, `userAgent`

### 2. `admin` - Ajout manuel
- **Description** : Utilisateur créé manuellement par un administrateur
- **Processus** : Admin panel → Formulaire de création → Validation
- **Champs spécifiques** : `createdBy` (UID de l'admin)

### 3. `transfer` - Migration anciens membres
- **Description** : Membre migré depuis l'ancien système (collection `members`)
- **Processus** : Script de migration → Transfert des données → Nouveau compte
- **Champs spécifiques** : `transferredFrom` (UID ancien système), `legacyMemberType`, `legacyTicketType`

### 4. `crowdfunding` - Contribution crowdfunding
- **Description** : Utilisateur créé suite à une contribution sur la plateforme crowdfunding
- **Processus** : Choix forfait → Paiement Square → Création automatique si membership
- **Champs spécifiques** : `crowdfundingContributionId` (lien vers la contribution)
- **Tags automatiques** : `['CROWDFUNDING', 'NEW_MEMBER']`

**Note** : Seuls les forfaits avec membership créent un compte utilisateur. Les dons libres sont enregistrés uniquement dans la collection `contributions`.

### 5. `adhesion_web` - Adhésion via mini-site
- **Description** : Utilisateur créé suite à une adhésion directe via le mini-site d'adhésion (`/src/adhesion/`)
- **Processus** : Mini-site adhésion → Paiement Square ou chèque → Création compte
- **Champs spécifiques** : `adhesionContributionId` (lien vers la contribution), `ipAddress`, `userAgent`
- **Tags automatiques** : `['ADHESION', 'NEW_MEMBER']` (+ `['PENDING_PAYMENT']` si paiement par chèque)

## Champ `registration.source` - Documentation Détaillée

Les utilisateurs peuvent être créés via **5 sources différentes**, identifiées par le champ `registration.source` :

### 1. `platform` - Inscription Plateforme Web

*   **Description** : Utilisateur inscrit normalement via le formulaire d'inscription du site web FORNAP
*   **Processus** : Formulaire d'inscription → Paiement membership → Création compte
*   **Champs spécifiques** :
    *   `registration.source: 'platform'`
    *   `registration.ipAddress` : Adresse IP de l'inscription
    *   `registration.userAgent` : User agent du navigateur

### 2. `admin` - Ajout Manuel par Admin

*   **Description** : Utilisateur créé manuellement par un administrateur depuis le panel admin
*   **Processus** : Admin panel → Formulaire de création → Validation et sauvegarde
*   **Champs spécifiques** :
    *   `registration.source: 'admin'`
    *   `registration.createdBy` : UID de l'admin qui a créé le compte

### 3. `transfer` - Migration Anciens Membres

*   **Description** : Membre migré depuis l'ancien système (collection `members`)
*   **Processus** : Interface de migration → Transfert des données → Nouveau compte
*   **Champs spécifiques** :
    *   `registration.source: 'transfer'`
    *   `registration.transferredFrom` : UID de l'ancien système
    *   `registration.legacyMemberType` : Type original (ex: "4nap-festival")
    *   `registration.legacyTicketType` : Type de ticket original (ex: "Adhésion annuelle")
*   **Tags automatiques** : `['MIGRATED_FROM_LEGACY']`

### 4. `crowdfunding` - Contribution Crowdfunding

*   **Description** : Utilisateur créé automatiquement suite à une contribution sur la plateforme crowdfunding
*   **Processus** : Page crowdfunding → Choix forfait → Paiement Square → Création automatique si membership
*   **Champs spécifiques** :
    *   `registration.source: 'crowdfunding'`
    *   `registration.crowdfundingContributionId` : ID de la contribution dans la collection `contributions`
*   **Tags automatiques** : `['CROWDFUNDING', 'NEW_MEMBER']`
*   **Note importante** : Seuls les forfaits avec membership créent un compte. Les dons libres sont enregistrés uniquement dans `contributions`.

### 5. `adhesion_web` - Adhésion via Mini-site ⭐ NOUVEAU

*   **Description** : Utilisateur créé suite à une adhésion directe via le mini-site d'adhésion (`/src/adhesion/`)
*   **Processus** : Mini-site adhésion → Formulaire complet → Paiement Square ou chèque → Création compte
*   **Champs spécifiques** :
    *   `registration.source: 'adhesion_web'`
    *   `registration.adhesionContributionId` : ID de la contribution dans la collection `contributions`
    *   `registration.ipAddress` : Adresse IP de l'inscription
    *   `registration.userAgent` : User agent du navigateur
*   **Tags automatiques** :
    *   Paiement CB : `['ADHESION', 'NEW_MEMBER']`
    *   Paiement chèque : `['ADHESION', 'NEW_MEMBER', 'PENDING_PAYMENT']`
*   **Particularité** : Contrairement au crowdfunding, le mini-site est dédié exclusivement aux adhésions (mensuelle 2€ ou annuelle 12€)

### Affichage dans l'admin

Dans la liste des utilisateurs (`EnhancedUsersListPage`), chaque source a une couleur distinctive :

| Source | Badge | Couleur |
|--------|-------|---------|
| `platform` | Plateforme | 🔵 Bleu |
| `admin` | Ajout Admin | 🟣 Violet |
| `transfer` | Transfert | 🟠 Orange |
| `crowdfunding` | Crowdfunding | 💗 Rose |
| `adhesion_web` | Adhésion Web | 🟢 Vert |

## Data Flow and Operations

### User Creation (Signup)

1.  A new user signs up via the application's signup flow.
2.  Firebase Authentication creates a new user record, providing a unique `uid`.
3.  A new document is created in the `users` collection with the `uid` as its document ID.
4.  The document is populated with data from the signup form (`SignupFormData`) and default values (e.g., `loyaltyPoints: 0`, initial `activityHistory` entry, `tags: ['actif']`).
5.  The `qrCode` field is generated using the format `FORNAP-MEMBER:{uid}`.
6.  This operation is handled by the `signup` function within `src/contexts/AuthContext.tsx`.

### User Creation (Crowdfunding)

1.  A contributor chooses a package on the crowdfunding platform.
2.  After successful Square payment, the contribution is saved in the `contributions` collection.
3.  If the package includes membership (`isMember === true`), a user document is automatically created.
4.  The user document includes:
    *   `registration.source: 'crowdfunding'`
    *   `registration.crowdfundingContributionId`: Link to the contribution
    *   `status.tags`: `['CROWDFUNDING', 'NEW_MEMBER']`
    *   `currentMembership`: Active membership with calculated expiry date
5.  Sub-collections `membershipHistory` and `actionHistory` are created.
6.  This operation is handled by the `saveContribution` function in `fornap-crowdfunding/src/services/contributionService.ts`.

### User Data Retrieval

1.  Upon successful authentication (login or session restoration), the `onAuthStateChanged` listener in `src/contexts/AuthContext.tsx` fetches the corresponding `UserProfile` document from the `users` collection using the authenticated user's `uid`.
2.  The `CheckIn` page (`src/pages/CheckIn.tsx`) reads a user's profile by scanning their QR code, extracting the `uid`, and then fetching the document from the `users` collection.

### User Data Updates

1.  User profile information can be updated via the `updateUserProfile` function in `src/contexts/AuthContext.tsx`.
2.  This function performs a partial update on the existing user document in the `users` collection using `setDoc` with the `merge: true` option.

## Relationships

Currently, the database schema is relatively flat, with all primary user data residing within the `users` collection. Relationships between different pieces of user data (e.g., membership, activity history) are embedded directly within the `UserProfile` document.

## QR Code Mechanism

*   The `qrCode` field in the `UserProfile` document stores a string in the format `FORNAP-MEMBER:{uid}`.
*   This format allows for easy parsing to retrieve the user's `uid` when a QR code is scanned, enabling quick lookup of user profiles (e.g., for check-in purposes).
*   The utility functions for generating and parsing QR code content are located in `src/utils/qrcode.ts`.

## Crowdfunding Integration

### Collections liées

**1. Collection `contributions`** (dans fornap-crowdfunding)
- Enregistre toutes les contributions (dons et forfaits)
- Contient les données du contributeur
- Champ `isMember` indique si le forfait crée un membership

**2. Lien avec `users`**
- Si `isMember === true`, un document utilisateur est créé automatiquement
- Le champ `registration.crowdfundingContributionId` fait le lien entre les deux
- Le champ `registration.source` est défini sur `'crowdfunding'`

### Logique de membership (crowdfunding)

| Forfait | Prix | Type Membership | Durée |
|---------|------|----------------|-------|
| Don libre | Variable | ❌ Aucun | - |
| PASS Love | 2€ | ✅ `monthly` | 1 mois |
| PASS PIONNIER | 12€ | ✅ `annual` | 1 an |
| PASS SUMMER | 35€ | ✅ `annual` | 1 an |
| PACK WINTER | 55€ | ✅ `annual` | 1 an |
| PACK PARTY HARDER | 25€ | ✅ `annual` | 1 an |
| PACK AMBASSADEUR | 60€ | ✅ `annual` | 1 an |
| MEETING PASS | 100€ | ✅ `annual` | 1 an |
| COWORK PASS | 150€ | ✅ `annual` | 1 an |
| MANUFACTURE PASS | 200€ | ✅ `annual` | 1 an |
| PRIVATE PASS | 400€ | ✅ `annual` | 1 an |
| BÂTISSEURS du FORT | 1000€+ | ✅ `annual` | 1 an |

**Note** : Les users créés via crowdfunding ont automatiquement les tags `['CROWDFUNDING', 'NEW_MEMBER']` pour faciliter leur identification.

---

## Collection `tickets` - Système de Support

### 2. `tickets` Collection

*   **Purpose**: Gère les demandes de support (maintenance, améliorations, bugs, nouvelles fonctionnalités)
*   **Document ID**: Auto-généré par Firestore
*   **Fichiers sources**: `src/shared/types/ticket.ts`, `src/shared/services/ticketService.ts`

#### Structure du document principal

```typescript
interface Ticket {
  id: string;                        // ID auto-généré (Document ID)
  ticketNumber: string;              // Numéro lisible (ex: TKT-2024-0001)

  // Informations de l'utilisateur
  createdBy: string;                 // UID de l'utilisateur
  userEmail: string;                 // Email de l'utilisateur
  userName: string;                  // Nom complet de l'utilisateur

  // Détails du ticket
  type: TicketType;                  // 'maintenance' | 'improvement' | 'feature_request' | 'bug_report' | 'other'
  subject: string;                   // Sujet/Titre du ticket
  description: string;               // Description détaillée
  priority: TicketPriority;          // 'low' | 'medium' | 'high' | 'urgent'
  status: TicketStatus;              // 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed'

  // Pièces jointes
  attachments: TicketAttachment[];   // Fichiers attachés au ticket

  // Assignation (optionnel)
  assignedTo?: string;               // UID de l'admin assigné
  assignedToName?: string;           // Nom de l'admin assigné

  // Timestamps
  createdAt: Timestamp;              // Date de création
  updatedAt: Timestamp;              // Date de dernière mise à jour
  resolvedAt?: Timestamp;            // Date de résolution (si résolu/fermé)
  resolvedBy?: string;               // UID de l'admin qui a résolu

  // Statistiques de conversation
  messageCount: number;              // Nombre de messages
  lastMessageAt?: Timestamp;         // Date du dernier message

  // Indicateurs de lecture
  hasUnreadForUser: boolean;         // Messages non lus pour l'utilisateur
  hasUnreadForAdmin: boolean;        // Messages non lus pour l'admin

  // Notes internes (visibles uniquement par les admins)
  internalNotes?: string;
}
```

#### Types de tickets

| Type | Valeur | Description |
|------|--------|-------------|
| Maintenance | `maintenance` | Demande de maintenance technique |
| Amélioration | `improvement` | Amélioration d'une fonctionnalité existante |
| Nouvelle fonctionnalité | `feature_request` | Demande de nouvelle fonctionnalité |
| Correction de bug | `bug_report` | Signalement d'un bug |
| Autre | `other` | Autre type de demande |

#### Statuts des tickets

| Statut | Valeur | Description |
|--------|--------|-------------|
| Ouvert | `open` | Ticket créé, en attente de traitement |
| En cours | `in_progress` | Ticket en cours de traitement |
| En attente | `waiting_for_user` | En attente d'une réponse de l'utilisateur |
| Résolu | `resolved` | Ticket traité et résolu |
| Fermé | `closed` | Ticket clôturé |

#### Niveaux de priorité

| Priorité | Valeur | Description |
|----------|--------|-------------|
| Basse | `low` | Demande non urgente |
| Normale | `medium` | Priorité standard |
| Haute | `high` | Demande importante |
| Urgente | `urgent` | Problème bloquant |

### Sous-collection `messages`

**Chemin**: `tickets/{ticketId}/messages`

*   **Purpose**: Stocke la conversation entre l'utilisateur et le support
*   **Document ID**: Auto-généré

```typescript
interface TicketMessage {
  id: string;                        // ID auto-généré

  // Expéditeur
  senderId: string;                  // UID de l'expéditeur
  senderName: string;                // Nom de l'expéditeur
  senderEmail: string;               // Email de l'expéditeur
  senderType: MessageSenderType;     // 'user' | 'admin' | 'system'

  // Contenu
  content: string;                   // Contenu du message
  attachments: TicketAttachment[];   // Pièces jointes

  // Timestamps et lecture
  createdAt: Timestamp;              // Date d'envoi
  readByUser: boolean;               // Lu par l'utilisateur
  readByAdmin: boolean;              // Lu par l'admin

  // Messages système
  isSystemMessage: boolean;          // Est un message automatique
  systemMetadata?: {                 // Métadonnées pour messages système
    action: 'status_change' | 'priority_change' | 'assignment' | 'ticket_created';
    previousValue?: string;
    newValue?: string;
  };
}
```

### Sous-collection `history`

**Chemin**: `tickets/{ticketId}/history`

*   **Purpose**: Journal d'audit de toutes les actions sur le ticket
*   **Document ID**: Auto-généré

```typescript
interface TicketHistoryEntry {
  id: string;
  actionType: TicketHistoryActionType;  // Type d'action (created, status_changed, etc.)
  actorId: string;                       // UID de l'acteur
  actorName: string;                     // Nom de l'acteur
  actorType: 'user' | 'admin';           // Type d'acteur
  description: string;                   // Description de l'action
  previousValue?: string;                // Valeur précédente
  newValue?: string;                     // Nouvelle valeur
  timestamp: Timestamp;                  // Date de l'action
}
```

### Permissions admin pour les tickets

Les permissions sont définies dans `src/shared/types/admin.ts`:

| Permission | Description |
|------------|-------------|
| `TICKETS_VIEW` | Voir la liste des tickets |
| `TICKETS_RESPOND` | Répondre aux tickets |
| `TICKETS_CHANGE_STATUS` | Changer le statut et la priorité |
| `TICKETS_ASSIGN` | Assigner un ticket à un admin |
| `TICKETS_DELETE` | Supprimer un ticket |

#### Permissions par rôle

| Rôle | VIEW | RESPOND | CHANGE_STATUS | ASSIGN | DELETE |
|------|------|---------|---------------|--------|--------|
| Administrateur | ✅ | ✅ | ✅ | ✅ | ✅ |
| Co-Administrateur | ✅ | ✅ | ✅ | ✅ | ❌ |
| Editor | ✅ | ✅ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ |
| Scanner | ❌ | ❌ | ❌ | ❌ | ❌ |

### Notifications email

Le système envoie des notifications automatiques via l'API `/api/tickets/send-notification`:

| Événement | Destinataire | Template |
|-----------|--------------|----------|
| Nouveau ticket créé | Admin (superadmin) | `new_ticket` |
| Confirmation de création | Utilisateur | `ticket_created_confirmation` |
| Nouvelle réponse admin | Utilisateur | `new_message_to_user` |
| Nouvelle réponse utilisateur | Admin | `new_message_to_admin` |
| Changement de statut | Utilisateur | `status_change` |

### Routes et pages

#### Côté utilisateur
- `/dashboard/support` - Liste des tickets de l'utilisateur
- `/dashboard/support/new` - Créer un nouveau ticket
- `/dashboard/support/:ticketId` - Détail et conversation d'un ticket

#### Côté admin
- `/admin/tickets` - Liste de tous les tickets
- `/admin/tickets/:ticketId` - Gestion détaillée d'un ticket

### Pièces jointes

Les fichiers sont stockés dans Firebase Storage:
- **Chemin**: `tickets/{ticketId}/{fileName}`
- **Types acceptés**: Images, PDF, documents Word
- **Taille max recommandée**: 10MB par fichier
## Historique des Achats (Sous-collection `purchases`)

Chaque utilisateur possede une sous-collection `purchases` qui enregistre tous les achats effectues.

**Path** : `users/{userId}/purchases/{purchaseId}`

### Structure d'un document Purchase

```typescript
interface Purchase {
  id: string;
  type: 'crowdfunding' | 'donation' | 'event_ticket' | 'merchandise';
  source: 'crowdfunding' | 'adhesion_web' | 'platform' | 'admin';

  // Details de l'achat
  itemName: string;
  itemDescription?: string;
  amount: number;

  // Pour billets d'evenements (futur)
  eventId?: string;
  eventName?: string;
  eventDate?: Timestamp;

  // Paiement
  paymentId: string;
  paymentStatus: 'completed' | 'pending' | 'failed' | 'refunded';

  // Lien vers contributions
  contributionId?: string;

  // Timestamps
  purchasedAt: Timestamp;
  createdAt: Timestamp;

  // Annulation (si annule)
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;

  // Invitation (pour les invites gratuits)
  isInvite?: boolean;           // True si c'est une invitation gratuite
  inviteReason?: string;        // Raison/description (ex: "Invite VIP", "Partenaire media")
  invitedBy?: string;           // UID de l'admin qui a cree l'invitation
}
```

### Champs d'invitation

Quand un admin invite quelqu'un a un evenement (ex: soiree Inkipit), un achat est cree avec:

| Champ | Valeur | Description |
|-------|--------|-------------|
| `isInvite` | `true` | Marque l'achat comme une invitation |
| `inviteReason` | texte libre | Raison de l'invitation |
| `invitedBy` | UID admin | Admin qui a cree l'invitation |
| `amount` | `0` | Les invitations sont gratuites |
| `paymentStatus` | `'completed'` | Toujours valide |

### Fonctions disponibles (`userService.ts`)

| Fonction | Description |
|----------|-------------|
| `addPurchase(userId, purchaseData)` | Ajoute un achat |
| `getUserPurchases(userId, limit?)` | Recupere les achats d'un user |
| `getPurchaseById(userId, purchaseId)` | Recupere un achat specifique |
| `getUserTotalSpent(userId)` | Calcule le total depense |

### Migration des contributions existantes

Script disponible : `scripts/migratePurchases.ts`

```bash
# Preview
npx ts-node scripts/migratePurchases.ts --dry-run

# Execute
npx ts-node scripts/migratePurchases.ts
```
