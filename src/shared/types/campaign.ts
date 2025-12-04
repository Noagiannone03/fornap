import { Timestamp } from 'firebase/firestore';
import type { MemberTag, MembershipType, MembershipStatus, ProfessionalStatus, RegistrationSource } from './user.js';

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'opened' | 'clicked' | 'bounced';
export type TargetingMode = 'all' | 'manual' | 'filtered';

// ============================================================================
// STRUCTURES DE DONNÉES
// ============================================================================

/**
 * Filtres de ciblage des utilisateurs
 */
export interface TargetingFilters {
  // Filtres de membership
  membershipTypes?: MembershipType[];
  membershipStatus?: MembershipStatus[];

  // Filtres de tags
  includeTags?: MemberTag[];
  excludeTags?: MemberTag[];

  // Filtres démographiques
  ageRange?: {
    min?: number;
    max?: number;
  };

  // Filtres de localisation
  postalCodes?: string[];
  cities?: string[];

  // Filtre de source d'inscription
  registrationSources?: RegistrationSource[];

  // Filtres de date d'inscription
  registrationDateRange?: {
    start?: Timestamp;
    end?: Timestamp;
  };

  // Filtres de points de fidélité
  loyaltyPointsRange?: {
    min?: number;
    max?: number;
  };

  // Filtres professionnels (pour profils étendus)
  professionalStatus?: ProfessionalStatus[];
  activityDomains?: string[];
  skills?: string[];

  // Filtres d'intérêts (pour profils étendus)
  eventTypes?: string[];
  artisticDomains?: string[];
  musicGenres?: string[];
  conferenceThemes?: string[];

  // Filtres d'engagement
  preferredContact?: ('email' | 'sms' | 'social' | 'app')[];
  hasExtendedProfile?: boolean;

  // Filtres de blocage
  includeBlocked?: boolean;

  // Filtre d'envoi de carte d'adhérent
  membershipCardNotSent?: boolean; // true = seulement ceux qui n'ont PAS reçu leur carte
  membershipCardSent?: boolean; // true = seulement ceux qui ONT reçu leur carte

  // Exclusion manuelle d'utilisateurs spécifiques
  excludedUserIds?: string[]; // IDs des utilisateurs à exclure manuellement
}

/**
 * Statistiques de la campagne
 */
export interface CampaignStats {
  totalRecipients: number;
  sent: number;
  pending: number;
  failed: number;
  opened: number;
  clicked: number;
  bounced: number;

  // Taux en pourcentage
  openRate: number;
  clickRate: number;
  bounceRate: number;
  failureRate: number;
}

/**
 * Contenu de l'email
 */
export interface EmailContent {
  subject: string;
  preheader?: string; // Texte de prévisualisation

  // Design Unlayer
  design?: any; // JSON du design Unlayer (optionnel pour les emails HTML simples)
  html: string; // HTML généré

  // Personnalisation
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

/**
 * Informations de ciblage
 */
export interface CampaignTargeting {
  mode: TargetingMode;

  // Pour le mode 'manual'
  manualUserIds?: string[];

  // Pour le mode 'filtered'
  filters?: TargetingFilters;

  // Nombre estimé de destinataires
  estimatedRecipients: number;
}

/**
 * Campagne d'emailing
 */
export interface Campaign {
  id: string;

  // Informations générales
  name: string;
  description?: string;
  status: CampaignStatus;

  // Contenu de l'email
  content: EmailContent;

  // Ciblage
  targeting: CampaignTargeting;

  // Planification
  scheduledAt?: Timestamp; // Date d'envoi planifiée
  sendImmediately: boolean;

  // Statistiques
  stats: CampaignStats;

  // Retry des emails en échec
  retryCount?: number; // Nombre de fois qu'on a réessayé
  lastRetryAt?: Timestamp; // Dernière tentative de retry

  // Métadonnées
  createdBy: string; // UID de l'admin créateur
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sentAt?: Timestamp; // Date d'envoi effectif
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;
}

/**
 * Destinataire d'une campagne
 */
export interface CampaignRecipient {
  id: string;
  campaignId: string;

  // Informations utilisateur
  userId: string;
  email: string;
  firstName: string;
  lastName: string;

  // Statut d'envoi
  status: RecipientStatus;

  // Tracking
  sentAt?: Timestamp;
  openedAt?: Timestamp;
  clickedAt?: Timestamp;
  bouncedAt?: Timestamp;

  // Nombre d'ouvertures et de clics
  openCount: number;
  clickCount: number;

  // Erreurs et retry
  errorMessage?: string;
  lastRetryAt?: Timestamp; // Dernière tentative de renvoi pour cet email

  // Métadonnées
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// TYPES POUR LES FORMULAIRES
// ============================================================================

/**
 * Données pour créer une campagne
 */
export interface CreateCampaignData {
  name: string;
  description?: string;
  content: EmailContent;
  targeting: CampaignTargeting;
  scheduledAt?: Timestamp;
  sendImmediately: boolean;
}

/**
 * Données pour mettre à jour une campagne
 */
export interface UpdateCampaignData {
  name?: string;
  description?: string;
  content?: Partial<EmailContent>;
  targeting?: Partial<CampaignTargeting>;
  scheduledAt?: Timestamp;
  sendImmediately?: boolean;
}

// ============================================================================
// TYPES POUR L'AFFICHAGE
// ============================================================================

/**
 * Item de campagne pour les listes
 */
export interface CampaignListItem {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  stats: CampaignStats;
  targeting: {
    mode: TargetingMode;
    estimatedRecipients: number;
  };
  createdAt: Timestamp;
  scheduledAt?: Timestamp;
  sentAt?: Timestamp;
}

/**
 * Options de pagination
 */
export interface CampaignPaginationOptions {
  page: number;
  limit: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'sentAt' | 'name';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Résultats paginés
 */
export interface PaginatedCampaigns {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Filtres pour les campagnes
 */
export interface CampaignFilters {
  status?: CampaignStatus[];
  createdBy?: string;
  dateRange?: {
    start?: Timestamp;
    end?: Timestamp;
  };
  searchTerm?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Vérifie si une campagne est modifiable
 */
export function isCampaignEditable(status: CampaignStatus): boolean {
  return status === 'draft' || status === 'scheduled';
}

/**
 * Vérifie si une campagne peut être envoyée
 */
export function canSendCampaign(campaign: Campaign): boolean {
  return (
    campaign.status === 'draft' || campaign.status === 'scheduled'
  ) && (
    campaign.targeting.estimatedRecipients > 0
  ) && (
    campaign.content.subject.trim() !== ''
  ) && (
    campaign.content.html.trim() !== ''
  );
}

/**
 * Vérifie si une campagne peut être annulée
 */
export function canCancelCampaign(status: CampaignStatus): boolean {
  return status === 'scheduled' || status === 'sending';
}

/**
 * Calcule les taux de performance
 */
export function calculateCampaignRates(stats: CampaignStats): CampaignStats {
  const sent = stats.sent || 0;

  return {
    ...stats,
    openRate: sent > 0 ? (stats.opened / sent) * 100 : 0,
    clickRate: sent > 0 ? (stats.clicked / sent) * 100 : 0,
    bounceRate: sent > 0 ? (stats.bounced / sent) * 100 : 0,
    failureRate: sent > 0 ? (stats.failed / sent) * 100 : 0,
  };
}

/**
 * Crée des statistiques initiales
 */
export function createInitialStats(): CampaignStats {
  return {
    totalRecipients: 0,
    sent: 0,
    pending: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    failureRate: 0,
  };
}
