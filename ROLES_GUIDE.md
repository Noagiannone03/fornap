# Guide du Système de Rôles - FORNAP Admin

## Vue d'ensemble

Le système de gestion des rôles administrateurs permet de contrôler finement l'accès aux différentes fonctionnalités du panel d'administration.

## Hiérarchie des Rôles

### 1. Administrateur (Niveau 7)
- **Accès** : Accès complet à toutes les fonctionnalités
- **Permissions** : Toutes les permissions
- **Peut** : Tout faire, y compris supprimer d'autres administrateurs

### 2. Co-Administrateur (Niveau 6)
- **Accès** : Tous les droits sauf supprimer les administrateurs
- **Permissions** : Toutes sauf `ADMINS_DELETE`
- **Peut** : Créer, modifier, activer/désactiver des admins (niveaux inférieurs uniquement)
- **Ne peut pas** : Supprimer des admins, modifier des administrateurs de niveau supérieur

### 3. Éditeur (Niveau 5)
- **Accès** : Peut voir, ajouter et modifier, mais ne peut pas supprimer
- **Permissions** :
  - `USERS_VIEW`, `USERS_CREATE`, `USERS_EDIT`, `USERS_BLOCK`, `USERS_EXPORT`
  - `EVENTS_VIEW`, `EVENTS_CREATE`, `EVENTS_EDIT`, `EVENTS_PUBLISH`
  - `MEMBERSHIPS_VIEW`, `MEMBERSHIPS_CREATE`, `MEMBERSHIPS_EDIT`
  - `ANALYTICS_VIEW`, `ANALYTICS_FINANCIAL`
  - etc.
- **Peut** : Créer et modifier des utilisateurs, événements, abonnements
- **Ne peut pas** : Supprimer des données, gérer les admins

### 4. Visualisateur (Niveau 4)
- **Accès** : Lecture seule sur tous les onglets
- **Permissions** :
  - `USERS_VIEW`
  - `EVENTS_VIEW`
  - `MEMBERSHIPS_VIEW`
  - `ANALYTICS_VIEW`, `ANALYTICS_FINANCIAL`
  - etc.
- **Peut** : Voir toutes les données, consulter les analytics
- **Ne peut pas** : Créer, modifier ou supprimer quoi que ce soit

### 5. Scanneur (Niveau 3)
- **Accès** : Uniquement le scanner de QR code
- **Redirection** : Automatiquement redirigé vers `/scanner` à la connexion
- **Permissions** :
  - `CHECKIN_SCAN`
  - `CHECKIN_VIEW_HISTORY`
- **Peut** : Scanner les QR codes, voir l'historique de ses scans
- **Ne peut pas** : Accéder au panel admin

### 6. Modérateur [Legacy] (Niveau 2)
- Rôle hérité de l'ancienne version
- Peut modifier users et events
- Lecture seule sur analytics

### 7. Support [Legacy] (Niveau 1)
- Rôle hérité de l'ancienne version
- Lecture + édition basique des users uniquement

---

## Utilisation dans le Code

### 1. Vérifier les permissions dans un composant

```tsx
import { useAdminAuth } from '@/shared/contexts/AdminAuthContext';
import { AdminPermission } from '@/shared/types/admin';

function MyComponent() {
  const { checkPermission, adminProfile } = useAdminAuth();

  const canEdit = checkPermission(AdminPermission.USERS_EDIT);
  const canDelete = checkPermission(AdminPermission.USERS_DELETE);

  return (
    <div>
      {canEdit && <Button>Modifier</Button>}
      {canDelete && <Button>Supprimer</Button>}
    </div>
  );
}
```

### 2. Utiliser les composants de permission

```tsx
import { PermissionButton, PermissionWrapper } from '@/admin/components/PermissionComponents';
import { AdminPermission } from '@/shared/types/admin';

function UserActions() {
  return (
    <div>
      {/* Bouton qui se désactive automatiquement */}
      <PermissionButton
        requiredPermission={AdminPermission.USERS_EDIT}
        onClick={handleEdit}
      >
        Modifier
      </PermissionButton>

      {/* Bouton caché si pas de permission */}
      <PermissionButton
        requiredPermission={AdminPermission.USERS_DELETE}
        hideIfNoPermission
        onClick={handleDelete}
      >
        Supprimer
      </PermissionButton>

      {/* Wrapper pour cacher tout un bloc */}
      <PermissionWrapper requiredPermission={AdminPermission.USERS_CREATE}>
        <CreateUserForm />
      </PermissionWrapper>
    </div>
  );
}
```

### 3. Protéger une route

```tsx
import { AdminProtectedRoute } from '@/admin/components/AdminProtectedRoute';
import { AdminPermission } from '@/shared/types/admin';

// Dans le fichier de routes
<Route
  path="users"
  element={
    <AdminProtectedRoute requiredPermission={AdminPermission.USERS_VIEW}>
      <UsersListPage />
    </AdminProtectedRoute>
  }
/>
```

### 4. Vérifier plusieurs permissions

```tsx
import { useAdminAuth } from '@/shared/contexts/AdminAuthContext';
import { AdminPermission } from '@/shared/types/admin';

function ComplexComponent() {
  const { checkAllPermissions, checkAnyPermission } = useAdminAuth();

  // Requiert TOUTES les permissions
  const canManageEverything = checkAllPermissions([
    AdminPermission.USERS_EDIT,
    AdminPermission.EVENTS_EDIT,
    AdminPermission.MEMBERSHIPS_EDIT,
  ]);

  // Requiert AU MOINS UNE permission
  const canViewSomething = checkAnyPermission([
    AdminPermission.USERS_VIEW,
    AdminPermission.EVENTS_VIEW,
  ]);

  return <div>...</div>;
}
```

---

## Ajout d'un Nouvel Administrateur

1. Se connecter avec un compte **Administrateur** ou **Co-Administrateur**
2. Aller dans **Paramètres** (menu de navigation)
3. Cliquer sur **Créer un administrateur**
4. Remplir le formulaire :
   - Email
   - Mot de passe (minimum 6 caractères)
   - Prénom et Nom
   - **Sélectionner le rôle approprié**
5. Cliquer sur **Créer**

### Règles de création

- Un **Administrateur** peut créer tous les rôles
- Un **Co-Administrateur** peut créer tous les rôles sauf Administrateur
- Les autres rôles ne peuvent pas créer d'admins

---

## Bonnes Pratiques

### 1. Principe du moindre privilège
Donnez toujours le rôle le plus restrictif possible :
- Pour quelqu'un qui doit juste scanner des QR codes → **Scanneur**
- Pour quelqu'un qui consulte les stats → **Visualisateur**
- Pour quelqu'un qui gère le contenu → **Éditeur**
- Pour un administrateur complet → **Co-Administrateur** (sauf si besoin de gérer les admins)

### 2. Utiliser les composants de permission
Plutôt que de vérifier manuellement les permissions partout, utilisez les composants `PermissionButton`, `PermissionActionIcon` et `PermissionWrapper`.

### 3. Ne pas hardcoder les rôles
❌ **Mauvais** :
```tsx
if (adminProfile.role === 'administrateur') {
  // ...
}
```

✅ **Bon** :
```tsx
if (checkPermission(AdminPermission.USERS_DELETE)) {
  // ...
}
```

### 4. Navigation conditionnelle
La navigation se filtre automatiquement selon les permissions. Vous n'avez rien à faire de spécial.

---

## Permissions Disponibles

Voici toutes les permissions disponibles :

### Utilisateurs
- `USERS_VIEW` - Voir les utilisateurs
- `USERS_CREATE` - Créer des utilisateurs
- `USERS_EDIT` - Modifier des utilisateurs
- `USERS_DELETE` - Supprimer des utilisateurs
- `USERS_BLOCK` - Bloquer/débloquer des utilisateurs
- `USERS_EXPORT` - Exporter les données utilisateurs

### Événements
- `EVENTS_VIEW` - Voir les événements
- `EVENTS_CREATE` - Créer des événements
- `EVENTS_EDIT` - Modifier des événements
- `EVENTS_DELETE` - Supprimer des événements
- `EVENTS_PUBLISH` - Publier des événements
- `EVENTS_EXPORT` - Exporter les données événements

### Abonnements
- `MEMBERSHIPS_VIEW` - Voir les abonnements
- `MEMBERSHIPS_CREATE` - Créer des abonnements
- `MEMBERSHIPS_EDIT` - Modifier des abonnements
- `MEMBERSHIPS_DELETE` - Supprimer des abonnements
- `MEMBERSHIPS_RENEW` - Renouveler des abonnements

### Coworking
- `COWORKING_VIEW` - Voir le coworking
- `COWORKING_MANAGE` - Gérer le coworking

### Analytics
- `ANALYTICS_VIEW` - Voir les analytics basiques
- `ANALYTICS_FINANCIAL` - Voir les analytics financières
- `ANALYTICS_EXPORT` - Exporter les analytics

### Admins
- `ADMINS_VIEW` - Voir les administrateurs
- `ADMINS_CREATE` - Créer des administrateurs
- `ADMINS_EDIT` - Modifier des administrateurs
- `ADMINS_DELETE` - Supprimer des administrateurs
- `ADMINS_CHANGE_ROLE` - Changer les rôles

### Paramètres
- `SETTINGS_VIEW` - Voir les paramètres
- `SETTINGS_EDIT` - Modifier les paramètres
- `SETTINGS_SECURITY` - Gérer la sécurité

### Check-in / Scanner
- `CHECKIN_SCAN` - Scanner les QR codes
- `CHECKIN_VIEW_HISTORY` - Voir l'historique des scans

### Logs
- `LOGS_VIEW` - Voir les logs
- `LOGS_EXPORT` - Exporter les logs

---

## FAQ

### Q: Comment créer le premier administrateur ?
**R**: Le premier administrateur doit être créé manuellement dans Firestore. Créez un document dans la collection `admins` avec le rôle `administrateur`.

### Q: Que se passe-t-il si je désactive mon propre compte ?
**R**: Le système empêche de se modifier soi-même pour éviter ce problème. Vous ne pouvez ni vous désactiver ni modifier votre propre rôle.

### Q: Un Scanneur peut-il accéder au panel admin ?
**R**: Non. Les utilisateurs avec le rôle Scanneur sont automatiquement redirigés vers `/scanner` et ne peuvent pas accéder au panel admin.

### Q: Comment savoir quel est mon rôle ?
**R**: Votre rôle est affiché dans le menu utilisateur en haut à droite (badge coloré sous votre nom).

### Q: Puis-je avoir plusieurs rôles ?
**R**: Non, chaque administrateur a un seul rôle. Choisissez le rôle qui correspond le mieux aux besoins.

---

## Support

Pour toute question ou problème avec le système de rôles, contactez l'équipe technique.
