import { Timestamp } from 'firebase/firestore';

/**
 * Structure d'une contribution du site web externe
 */
export interface Contribution {
  id: string;
  amount: number;

  // Informations du contributeur
  contributor: {
    pseudo: string;
    email: string;
    nom: string;
    prenom: string;
    naissance?: string; // Format: "YYYY-MM-DD"
    codePostal?: string;
    telephone?: string;
    commentaire?: string;
  };

  // Informations sur l'article/forfait acheté
  itemName: string; // Ex: "PASS SUMMER", "PASS Love", "Don libre"
  type: 'pass' | 'donation'; // Type de contribution

  // Informations de paiement
  paymentId: string;
  paymentStatus: 'completed' | 'pending' | 'failed';
  paidAt: Timestamp;

  // Informations membership (si applicable)
  isMember: boolean;
  membershipType: 'monthly' | 'annual' | null;

  // Métadonnées
  createdAt: Timestamp;
  userAgent?: string;
}

/**
 * KPIs des contributions
 */
export interface ContributionKPIs {
  totalAmount: number;
  totalContributions: number;
  averageAmount: number;
  memberConversions: number; // Nombre de contributeurs devenus membres
  conversionRate: number; // Pourcentage de conversion vers adhésion
  passCount: number;
  donationCount: number;
  // Répartition des pass par niveau
  monthlyPassCount: number; // PASS Love (mensuel)
  annualPassCount: number; // Tous les autres PASS (annuels)
}

/**
 * Évolution des contributions dans le temps
 */
export interface ContributionEvolutionData {
  date: string; // Format: "YYYY-MM"
  totalAmount: number;
  totalCount: number;
  passAmount: number;
  donationAmount: number;
  passCount: number;
  donationCount: number;
  memberConversions: number;
}

/**
 * Statistiques par type d'item
 */
export interface ItemStatistics {
  itemName: string;
  count: number;
  totalAmount: number;
  percentage: number; // Pourcentage du total
  averageAmount: number;
}

/**
 * Distribution géographique des contributions
 */
export interface ContributionGeographicData {
  totalPostalCodes: number;
  topPostalCodes: Array<{
    postalCode: string;
    count: number;
    totalAmount: number;
    percentage: number;
  }>;
}

/**
 * Analyse démographique des contributeurs
 */
export interface ContributorDemographics {
  averageAge: number;
  byAgeRange: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46-55': number;
    '56-65': number;
    '66+': number;
  };
}

/**
 * Dernières contributions récentes
 */
export interface RecentContribution {
  id: string;
  contributorName: string;
  contributorPseudo: string;
  contributorEmail: string;
  amount: number;
  itemName: string;
  type: 'pass' | 'donation';
  paidAt: Timestamp;
  isMember: boolean;
}

/**
 * Filtres pour les contributions
 */
export interface ContributionFilters {
  search?: string; // Nom, email, pseudo
  type?: ('pass' | 'donation')[];
  paymentStatus?: ('completed' | 'pending' | 'failed')[];
  isMember?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Options d'export pour les contributions
 */
export interface ContributionExportOptions {
  startDate: Date;
  endDate: Date;
  includePersonalInfo: boolean;
  includeComments: boolean;
  format: 'csv' | 'excel';
}

/**
 * Constantes pour les labels
 */
export const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  pass: 'Pass',
  donation: 'Don',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  completed: 'Complété',
  pending: 'En attente',
  failed: 'Échoué',
};

/**
 * Liste de tous les pass disponibles (du crowdfunding)
 */
export const AVAILABLE_PASSES = [
  'PASS Love',           // Mensuel
  'PASS PIONNIER',       // Annuel
  'PASS SUMMER',         // Annuel
  'PACK WINTER',         // Annuel
  'PACK PARTY HARDER',   // Annuel
  'PACK AMBASSADEUR',    // Annuel
  'MEETING PASS',        // Annuel
  'COWORK PASS',         // Annuel
  'MANUFACTURE PASS',    // Annuel
  'PRIVATE PASS',        // Annuel
  'LES BÂTISSEURS du FORT', // Annuel
] as const;
