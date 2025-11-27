# Statistiques des Contributions

## Vue d'ensemble

Cette fonctionnalité ajoute une nouvelle page de statistiques dans le panel admin pour analyser les contributions provenant du site web externe de crowdfunding.

## Accès

Navigation : **Admin Panel** → **Analytics** → **Contributions**

URL : `/admin/analytics/contributions`

## Fonctionnalités

### KPIs Principaux

La page affiche les indicateurs clés suivants :

1. **Montant Total** - Revenu total généré par toutes les contributions
2. **Nombre de Contributions** - Nombre total de contributions réussies
3. **Panier Moyen** - Montant moyen par contribution
4. **Taux de Conversion** - Pourcentage de contributeurs devenus membres

### Répartition par Type

- **Pass** - Nombre de pass vendus
- **Donations** - Nombre de donations reçues
- **Billets** - Nombre de billets vendus

### Visualisations

#### Graphique d'Évolution
- Évolution mensuelle des contributions sur 12 mois
- Répartition par type (Pass, Donations, Billets)
- Vue du montant total

#### Distribution par Type
- Graphique circulaire montrant la répartition des contributions par type

#### Distribution par Âge
- Graphique en barres des contributeurs par tranche d'âge
- Tranches : 18-25, 26-35, 36-45, 46-55, 56-65, 66+

### Tableaux Détaillés

#### Statistiques par Article
- Liste des articles/forfaits vendus
- Nombre de ventes par article
- Montant total et moyen
- Part du total en pourcentage

#### Distribution Géographique
- Top 10 des codes postaux
- Nombre de contributions par zone
- Montant total par zone

#### Dernières Contributions
- Liste des 10 dernières contributions
- Informations du contributeur
- Article acheté
- Montant et date

### Insights Automatiques

Section résumé affichant :
- Article le plus populaire
- Article le plus lucratif
- Taux de conversion en membres
- Âge moyen des contributeurs
- Zone géographique principale

### Export de Données

Bouton d'export CSV incluant :
- Date de la contribution
- Informations du contributeur (nom, prénom, email, téléphone)
- Code postal
- Article acheté
- Montant
- Type
- Statut membre
- Commentaire éventuel

Export disponible pour les 12 derniers mois.

## Structure des Données

### Collection Firebase : `contributions`

Chaque document contient :

```typescript
{
  amount: number,
  contributor: {
    codePostal: string,
    commentaire?: string,
    email: string,
    naissance: string, // Format: "YYYY-MM-DD"
    nom: string,
    prenom: string,
    pseudo: string,
    telephone: string
  },
  itemName: string, // Ex: "PASS SUMMER"
  type: 'pass' | 'donation' | 'ticket',
  paymentId: string,
  paymentStatus: 'completed' | 'pending' | 'failed',
  paidAt: Timestamp,
  isMember: boolean,
  membershipType?: 'monthly' | 'annual' | 'lifetime',
  createdAt: Timestamp,
  userAgent?: string
}
```

## Fichiers Créés

### Types
- `src/shared/types/contribution.ts` - Types TypeScript pour les contributions

### Services
- `src/shared/services/analytics/contributionAnalytics.ts` - Service de récupération et analyse des données

### Pages
- `src/admin/pages/Analytics/ContributionStatsPage.tsx` - Page principale des statistiques

### Modifications
- `src/admin/routes.tsx` - Ajout de la route `/admin/analytics/contributions`
- `src/admin/layouts/AdminLayout.tsx` - Ajout du lien dans le menu Analytics

## Utilisation

1. Se connecter au panel admin
2. Naviguer vers **Analytics** → **Contributions**
3. Visualiser les statistiques en temps réel
4. Utiliser le bouton "Actualiser" pour recharger les données
5. Cliquer sur "Exporter CSV" pour télécharger les données

## Notes Techniques

- Les données sont chargées en temps réel depuis Firebase Firestore
- Tous les montants sont arrondis à 2 décimales
- Les pourcentages sont arrondis à 1 décimale
- Les graphiques utilisent les composants Mantine Charts (Recharts)
- L'export CSV respecte le format français (séparateur `,` et encodage UTF-8 BOM)

## Améliorations Futures Possibles

- Filtres par date personnalisés
- Comparaison de périodes
- Graphiques interactifs avec zoom
- Export en format Excel
- Envoi d'emails automatiques de remerciement
- Intégration avec le système de comptabilité
- Statistiques de conversion détaillées
