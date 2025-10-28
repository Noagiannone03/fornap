import type { MembershipPlan } from '../types/user';

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'monthly',
    name: 'Membre Mensuel',
    price: 15,
    period: 'month',
    features: [
      'Accès prioritaire aux événements',
      'Accès au lieu et aux installations',
      'Promotions exclusives sur le shop',
      'Newsletter mensuelle',
      'Support communautaire',
    ],
  },
  {
    id: 'annual',
    name: 'Membre Annuel',
    price: 150,
    period: 'year',
    highlighted: true,
    features: [
      'Tous les avantages du Membre Mensuel',
      'Programme de fidélité actif',
      'Cumul de points sur tous les achats',
      'Réductions progressives',
      'Accès aux exclusivités et avant-premières',
      'Événements VIP réservés aux membres annuels',
      '2 mois offerts (économie de 30€)',
    ],
  },
  {
    id: 'honorary',
    name: "Membre d'Honneur",
    price: 500,
    period: 'lifetime',
    features: [
      'Tous les avantages du Membre Annuel',
      'Adhésion à vie sans renouvellement',
      'Statut VIP permanent',
      'Accès illimité aux événements premium',
      'Invitations exclusives partenaires',
      'Carte membre physique personnalisée',
      'Badge spécial sur votre profil',
      'Participation aux décisions communautaires',
    ],
  },
];
