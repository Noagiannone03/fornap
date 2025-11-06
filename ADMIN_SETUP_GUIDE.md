# 🔐 Guide de Configuration du Système Admin

Ce guide explique comment configurer le système d'administration pour la première fois.

## 📋 Table des Matières

1. [Architecture du Système](#architecture-du-système)
2. [Création du Premier Admin](#création-du-premier-admin)
3. [Connexion au Panel Admin](#connexion-au-panel-admin)
4. [Gestion des Administrateurs](#gestion-des-administrateurs)
5. [Système de Rôles](#système-de-rôles)
6. [Permissions](#permissions)

---

## 🏗️ Architecture du Système

### Séparation des Comptes

Le système distingue **complètement** deux types de comptes :

- **Comptes Utilisateurs** (`users` collection)
  - Utilisateurs normaux de la plateforme
  - Accès au site public et au dashboard utilisateur
  - Gérés via l'inscription classique

- **Comptes Administrateurs** (`admins` collection)
  - Administrateurs de la plateforme
  - Accès au panel admin `/admin/*`
  - Gérés uniquement via l'interface admin (après création du premier admin)

### Collections Firestore

```
Firestore
├── users/                    # Utilisateurs normaux
│   └── {uid}/
│       ├── email
│       ├── firstName
│       ├── lastName
│       ├── currentMembership
│       └── ...
│
└── admins/                   # Administrateurs
    └── {uid}/
        ├── email
        ├── firstName
        ├── lastName
        ├── role              # administrateur, co-administrateur, moderateur, support
        ├── isActive
        ├── createdAt
        ├── createdBy
        ├── lastLoginAt
        └── actionHistory/    # Sous-collection : historique des actions
            └── {actionId}/
```

---

## 🎯 Création du Premier Admin

### Étape 1 : Créer un Compte Firebase Auth

1. Accédez à la [Console Firebase](https://console.firebase.google.com)
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Users**
4. Cliquez sur **Add user**
5. Remplissez :
   - **Email** : `admin@fornap.com` (ou votre email)
   - **Password** : Choisissez un mot de passe fort
6. Copiez l'**UID** du compte créé

### Étape 2 : Créer le Document Admin dans Firestore

1. Dans la console Firebase, allez dans **Firestore Database**
2. Cliquez sur **Start collection**
3. ID de collection : `admins`
4. ID de document : Collez l'**UID** copié à l'étape 1
5. Ajoutez les champs suivants :

```javascript
{
  "uid": "l'UID de votre compte Firebase Auth",
  "email": "admin@fornap.com",
  "firstName": "Votre",
  "lastName": "Nom",
  "role": "administrateur",
  "isActive": true,
  "createdAt": [Timestamp] maintenant,
  "createdBy": null,
  "updatedAt": [Timestamp] maintenant,
  "lastLoginAt": null,
  "metadata": {
    "phone": "",
    "notes": "Premier administrateur créé manuellement"
  }
}
```

**Note** : Pour les champs de type `Timestamp`, cliquez sur **+** puis choisissez **timestamp** et sélectionnez la date/heure actuelle.

### Étape 3 : Vérification

Votre premier compte admin est maintenant créé ! Vous pouvez vous connecter.

---

## 🔑 Connexion au Panel Admin

### URL de Connexion

```
http://localhost:5173/admin/login
```

Ou en production :
```
https://votre-domaine.com/admin/login
```

### Processus de Connexion

1. Accédez à `/admin/login`
2. Entrez votre **email** et **mot de passe**
3. Le système vérifie :
   - ✅ Authentification Firebase
   - ✅ Existence dans la collection `admins`
   - ✅ Statut `isActive = true`
4. Redirection vers `/admin/dashboard`

### Sécurité

- ❌ Les utilisateurs normaux ne peuvent **PAS** accéder au panel admin
- ❌ Un compte désactivé (`isActive: false`) ne peut pas se connecter
- ✅ Toutes les actions sont tracées dans l'historique

---

## 👥 Gestion des Administrateurs

Une fois connecté en tant qu'administrateur, vous pouvez gérer les autres admins.

### Ajouter un Administrateur

1. Allez dans **Paramètres** > **Administrateurs**
2. Cliquez sur **Ajouter un administrateur**
3. Remplissez le formulaire :
   - Prénom, Nom
   - Email
   - Mot de passe (min. 6 caractères)
   - Rôle (voir ci-dessous)
   - Informations optionnelles (téléphone, notes)
4. Cliquez sur **Créer l'administrateur**

### Modifier un Administrateur

1. Dans la liste des admins, cliquez sur **︙** > **Modifier**
2. Modifiez les informations souhaitées
3. Cliquez sur **Enregistrer les modifications**

### Désactiver/Activer un Admin

1. Cliquez sur **︙** > **Désactiver** ou **Activer**
2. Un admin désactivé ne peut plus se connecter

### Supprimer un Admin

1. Cliquez sur **︙** > **Supprimer**
2. Confirmez la suppression
3. ⚠️ **Action irréversible**

### Restrictions

- ❌ Vous ne pouvez **pas** modifier votre propre compte
- ❌ Vous ne pouvez modifier que les admins de niveau **inférieur**
- ✅ Toutes les modifications sont tracées

---

## 🎭 Système de Rôles

Le système utilise 4 rôles hiérarchiques :

### 1. Administrateur (Niveau 4) 🔴

**Badge** : Rouge

**Accès** : Complet - Toutes les permissions

**Peut** :
- ✅ Créer/modifier/supprimer tous les admins (y compris d'autres administrateurs)
- ✅ Accès complet à toutes les fonctionnalités
- ✅ Modifier tous les paramètres

**Idéal pour** : Propriétaires, CTO

---

### 2. Co-Administrateur (Niveau 3) 🟠

**Badge** : Orange

**Accès** : Presque complet

**Peut** :
- ✅ Créer des admins (sauf administrateur)
- ✅ Gérer utilisateurs, événements, abonnements
- ✅ Accès complet analytics
- ✅ Modifier les paramètres
- ❌ Ne peut pas créer d'administrateurs

**Idéal pour** : Directeurs, Responsables

---

### 3. Modérateur (Niveau 2) 🔵

**Badge** : Bleu

**Accès** : Limité

**Peut** :
- ✅ Modifier les utilisateurs
- ✅ Bloquer des comptes
- ✅ Créer/modifier des événements
- ✅ Voir analytics (lecture seule)
- ❌ Ne peut pas gérer les admins
- ❌ Ne peut pas modifier les abonnements

**Idéal pour** : Community managers, Modérateurs

---

### 4. Support (Niveau 1) 🟢

**Badge** : Vert

**Accès** : Minimal

**Peut** :
- ✅ Voir et éditer les utilisateurs (basique)
- ✅ Voir les événements (lecture seule)
- ✅ Scan QR codes
- ❌ Pas d'accès aux admins
- ❌ Pas d'accès aux abonnements
- ❌ Pas d'accès analytics

**Idéal pour** : Support client, Accueil

---

## 🔐 Permissions

Le système utilise des permissions granulaires :

### Gestion des Utilisateurs
- `users_view` - Voir les utilisateurs
- `users_create` - Créer des utilisateurs
- `users_edit` - Modifier des utilisateurs
- `users_delete` - Supprimer des utilisateurs
- `users_block` - Bloquer/débloquer des comptes
- `users_export` - Exporter les données

### Gestion des Événements
- `events_view` - Voir les événements
- `events_create` - Créer des événements
- `events_edit` - Modifier des événements
- `events_delete` - Supprimer des événements
- `events_publish` - Publier des événements
- `events_export` - Exporter les données

### Gestion des Abonnements
- `memberships_view` - Voir les abonnements
- `memberships_create` - Créer des plans
- `memberships_edit` - Modifier des plans
- `memberships_delete` - Supprimer des plans
- `memberships_renew` - Renouveler des abonnements

### Analytics
- `analytics_view` - Voir les analytics
- `analytics_financial` - Voir les données financières
- `analytics_export` - Exporter les analytics

### Gestion des Admins
- `admins_view` - Voir les admins
- `admins_create` - Créer des admins
- `admins_edit` - Modifier des admins
- `admins_delete` - Supprimer des admins
- `admins_change_role` - Changer les rôles

### Paramètres
- `settings_view` - Voir les paramètres
- `settings_edit` - Modifier les paramètres
- `settings_security` - Modifier la sécurité

### Autres
- `checkin_scan` - Scanner des QR codes
- `checkin_view_history` - Voir l'historique de scan
- `logs_view` - Voir les logs
- `logs_export` - Exporter les logs

---

## 🔍 Historique des Actions

Toutes les actions admin sont tracées :

### Types d'Actions Tracées

- Création/modification/suppression d'utilisateurs
- Création/modification/suppression d'événements
- Modifications d'abonnements
- Gestion des admins
- Connexions/déconnexions
- Modifications des paramètres
- Exports de données

### Consulter l'Historique

L'historique est stocké dans la sous-collection `actionHistory` de chaque admin :

```
admins/{uid}/actionHistory/{actionId}
```

Chaque action contient :
- Type d'action
- Cible (user, event, admin, etc.)
- Description
- Changements (avant/après)
- Timestamp
- IP et User Agent

---

## 🚀 Utilisation

### Composants Utiles

#### PermissionGuard

Afficher du contenu basé sur les permissions :

```tsx
import { PermissionGuard } from '../../shared/contexts/AdminAuthContext';
import { AdminPermission } from '../../shared/types/admin';

<PermissionGuard permission={AdminPermission.USERS_DELETE}>
  <Button color="red">Supprimer</Button>
</PermissionGuard>
```

#### RoleGuard

Afficher du contenu basé sur le rôle :

```tsx
import { RoleGuard } from '../../shared/contexts/AdminAuthContext';
import { AdminRole } from '../../shared/types/admin';

<RoleGuard allowedRoles={[AdminRole.ADMINISTRATEUR, AdminRole.CO_ADMINISTRATEUR]}>
  <Button>Action sensible</Button>
</RoleGuard>
```

#### Hook useAdminAuth

Vérifier les permissions dans le code :

```tsx
import { useAdminAuth } from '../../shared/contexts/AdminAuthContext';
import { AdminPermission } from '../../shared/types/admin';

function MyComponent() {
  const { checkPermission, adminProfile } = useAdminAuth();

  if (checkPermission(AdminPermission.USERS_DELETE)) {
    // L'admin peut supprimer des users
  }

  return <div>Bonjour {adminProfile?.firstName}</div>;
}
```

---

## 📝 Bonnes Pratiques

### Sécurité

1. ✅ Utilisez des mots de passe forts (min. 12 caractères)
2. ✅ Limitez le nombre d'administrateurs
3. ✅ Donnez le rôle minimum nécessaire
4. ✅ Désactivez les comptes inutilisés
5. ✅ Vérifiez régulièrement l'historique des actions

### Gestion des Rôles

1. ✅ **Administrateur** : 1-2 personnes max
2. ✅ **Co-Administrateur** : Management uniquement
3. ✅ **Modérateur** : Community management
4. ✅ **Support** : Service client uniquement

### Audit

1. ✅ Consultez régulièrement les logs
2. ✅ Vérifiez les actions suspectes
3. ✅ Désactivez immédiatement les comptes compromis

---

## ⚠️ Dépannage

### "Accès refusé" lors de la connexion

- ✅ Vérifiez que l'email existe dans la collection `admins`
- ✅ Vérifiez que `isActive = true`
- ✅ Vérifiez que le mot de passe Firebase Auth est correct

### "Vous n'avez pas les permissions"

- ✅ Vérifiez votre rôle dans Firestore
- ✅ Consultez la section Permissions ci-dessus
- ✅ Contactez un administrateur de niveau supérieur

### Le premier admin ne peut pas se connecter

- ✅ Vérifiez que l'UID dans `admins` correspond à Firebase Auth
- ✅ Vérifiez que tous les champs sont bien renseignés
- ✅ Vérifiez la console du navigateur pour les erreurs

---

## 📞 Support

Pour toute question ou problème :

1. Consultez la console du navigateur (F12)
2. Vérifiez les logs Firebase
3. Consultez le code dans `/src/shared/services/adminService.ts`

---

**Version** : 1.0.0
**Dernière mise à jour** : 2025-11-06
