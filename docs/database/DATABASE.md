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

Les utilisateurs peuvent être créés via **4 sources différentes** :

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

## Registration Sources

Les utilisateurs peuvent être créés via **4 sources différentes**, identifiées par le champ `registration.source` :

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

### 4. `crowdfunding` - Contribution Crowdfunding ⭐ NOUVEAU

*   **Description** : Utilisateur créé automatiquement suite à une contribution sur la plateforme crowdfunding
*   **Processus** : Page crowdfunding → Choix forfait → Paiement Square → Création automatique si membership
*   **Champs spécifiques** :
    *   `registration.source: 'crowdfunding'`
    *   `registration.crowdfundingContributionId` : ID de la contribution dans la collection `contributions`
*   **Tags automatiques** : `['CROWDFUNDING', 'NEW_MEMBER']`
*   **Note importante** : Seuls les forfaits avec membership créent un compte. Les dons libres sont enregistrés uniquement dans `contributions`.

### Affichage dans l'admin

Dans la liste des utilisateurs (`EnhancedUsersListPage`), chaque source a une couleur distinctive :

| Source | Badge | Couleur |
|--------|-------|---------|
| `platform` | Plateforme | 🔵 Bleu |
| `admin` | Ajout Admin | 🟣 Violet |
| `transfer` | Transfert | 🟠 Orange |
| `crowdfunding` | Crowdfunding | 💗 Rose |

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
