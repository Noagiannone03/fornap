# Structure Firestore - Gestion des Abonnements

## Collection: `membershipPlans`

Cette collection contient toutes les formules d'abonnement disponibles.

### Structure d'un document

```typescript
{
  id: string;                    // Identifiant unique (monthly, annual, honorary, etc.)
  name: string;                  // Nom de la formule (ex: "Membre Mensuel")
  description: string;           // Description courte de la formule
  price: number;                 // Prix en euros
  period: 'month' | 'year' | 'lifetime'; // Période de l'abonnement
  features: string[];            // Liste des avantages
  isActive: boolean;             // Si la formule est active et visible
  isPrimary: boolean;            // Si la formule est recommandée/mise en avant
  order: number;                 // Ordre d'affichage (1, 2, 3, etc.)
  createdAt: Timestamp;          // Date de création
  updatedAt: Timestamp;          // Date de dernière modification
}
```

### Exemple de document

```json
{
  "id": "annual",
  "name": "Membre Annuel",
  "description": "Abonnement annuel - 2 mois offerts",
  "price": 150,
  "period": "year",
  "features": [
    "Tous les avantages du Membre Mensuel",
    "Programme de fidélité actif",
    "Cumul de points sur tous les achats",
    "Réductions progressives",
    "Accès aux exclusivités et avant-premières",
    "Événements VIP réservés aux membres annuels",
    "2 mois offerts (économie de 30€)"
  ],
  "isActive": true,
  "isPrimary": true,
  "order": 2,
  "createdAt": "2024-10-29T10:00:00.000Z",
  "updatedAt": "2024-10-29T10:00:00.000Z"
}
```

## Fonctionnalités Admin

### Gestion des formules
- ✅ Créer une nouvelle formule
- ✅ Modifier une formule existante (prix, nom, avantages, etc.)
- ✅ Supprimer une formule
- ✅ Activer/Désactiver une formule
- ✅ Ajouter/Retirer/Modifier des avantages
- ✅ Réorganiser l'ordre d'affichage
- ✅ Marquer une formule comme recommandée

### Page publique
- ✅ Affichage dynamique des formules actives
- ✅ Tri par ordre défini
- ✅ Mise en avant de la formule recommandée
- ✅ Sélection d'une formule pour l'inscription

## Relations avec les autres collections

### Collection `users`
Chaque utilisateur a un champ `membership.type` qui référence l'ID d'une formule dans `membershipPlans`.

```typescript
{
  uid: string;
  membership: {
    type: string;  // Référence l'id d'un document dans membershipPlans
    status: 'active' | 'inactive' | 'pending' | 'expired';
    startDate: string;
    endDate?: string;
  }
}
```

## Migration des données existantes

Les données actuellement en dur dans `membershipPlans.ts` seront migrées vers Firestore via un script d'initialisation qui peut être exécuté depuis le panel admin.
