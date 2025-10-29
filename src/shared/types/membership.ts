import { Timestamp } from 'firebase/firestore';

/**
 * Type de période pour les abonnements
 */
export type MembershipPeriod = 'month' | 'year' | 'lifetime';

/**
 * Structure d'une formule d'abonnement dans Firestore
 */
export interface MembershipPlan {
  id: string;                      // Identifiant unique (monthly, annual, honorary, etc.)
  name: string;                    // Nom de la formule
  description: string;             // Description courte
  price: number;                   // Prix en euros
  period: MembershipPeriod;        // Période de l'abonnement
  features: string[];              // Liste des avantages
  isActive: boolean;               // Formule active et visible
  isPrimary: boolean;              // Formule recommandée/mise en avant
  order: number;                   // Ordre d'affichage (1, 2, 3, etc.)
  createdAt: Timestamp | Date;     // Date de création
  updatedAt: Timestamp | Date;     // Date de dernière modification
}

/**
 * Données pour créer ou mettre à jour une formule
 * (sans les champs auto-générés)
 */
export interface MembershipPlanInput {
  id: string;
  name: string;
  description: string;
  price: number;
  period: MembershipPeriod;
  features: string[];
  isActive: boolean;
  isPrimary: boolean;
  order: number;
}

/**
 * Statistiques pour une formule d'abonnement
 */
export interface MembershipPlanStats {
  planId: string;
  subscriberCount: number;         // Nombre d'abonnés actifs
  totalRevenue: number;            // Revenu total généré
  activeSubscribers: number;       // Abonnés avec status 'active'
  pendingSubscribers: number;      // Abonnés avec status 'pending'
  expiredSubscribers: number;      // Abonnés avec status 'expired'
}

/**
 * Formule d'abonnement avec ses statistiques
 */
export interface MembershipPlanWithStats extends MembershipPlan {
  stats?: MembershipPlanStats;
}
