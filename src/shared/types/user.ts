import { Timestamp } from 'firebase/firestore';
import type { ScanMode, ScanResultStatus } from './scan';

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type MembershipType = 'monthly' | 'annual' | 'lifetime';
export type MembershipStatus = 'active' | 'expired' | 'pending' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'failed';
export type RegistrationSource = 'platform' | 'admin' | 'transfer' | 'crowdfunding' | 'adhesion_web' | 'adhesion';
export type ProfessionalStatus = 'salaried' | 'independent' | 'student' | 'retired' | 'unemployed';
export type PreferredContact = 'email' | 'sms' | 'social' | 'app';
export type PublicProfileLevel = 'none' | 'all' | 'friends_only';
export type ActionType =
  | 'scan'
  | 'transaction'
  | 'event_checkin'
  | 'loyalty_earned'
  | 'loyalty_spent'
  | 'profile_update'
  | 'card_blocked'
  | 'card_unblocked'
  | 'membership_created'
  | 'membership_renewed'
  | 'membership_cancelled';
export type DeviceType = 'web' | 'mobile' | 'scanner';

// Tags personnalisables pour catégoriser les membres
export type MemberTag =
  | 'actif'
  | 'inactif'
  | 'vip'
  | 'atelier_couture'
  | 'billetterie'
  | 'exposant'
  | string;

// ============================================================================
// STRUCTURES DE DONNÉES
// ============================================================================

/**
 * Statut du compte et de la carte
 */
export interface UserStatus {
  tags: MemberTag[];
  isAccountBlocked: boolean;
  isCardBlocked: boolean;
  blockedReason?: string;
  blockedAt?: Timestamp;
  blockedBy?: string; // userId de l'admin qui a bloqué
}

/**
 * Informations sur l'origine du compte
 */
export interface RegistrationInfo {
  source: RegistrationSource;
  createdAt: Timestamp;
  createdBy?: string; // userId de l'admin si ajout manuel
  transferredFrom?: string; // référence ancien système si transfert
  legacyMemberType?: string; // Type original de l'ancien système (ex: "4nap-festival")
  legacyTicketType?: string; // Type de ticket original (ex: "Adhésion annuelle")
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Informations d'abonnement actuel
 */
export interface CurrentMembership {
  planId: string; // référence au plan d'abonnement
  planName: string;
  planType: MembershipType;
  status: MembershipStatus;
  paymentStatus: PaymentStatus;
  startDate: Timestamp;
  expiryDate: Timestamp | null; // null pour lifetime
  price: number;
  autoRenew: boolean;
  lastPaymentDate?: Timestamp;
}

/**
 * Informations professionnelles (profil étendu)
 */
export interface ProfessionalInfo {
  profession: string;
  activityDomain: string;
  status: ProfessionalStatus;
  volunteerWork?: {
    isVolunteer: boolean;
    domains: string[];
  };
  skills: string[]; // ['graphisme', 'reseaux_sociaux', 'bricolage', etc.]
}

/**
 * Centres d'intérêt (profil étendu)
 */
export interface InterestsInfo {
  eventTypes: string[]; // ['concerts', 'expositions', 'ateliers', etc.]
  artisticDomains: string[]; // ['musique', 'arts_visuels', 'litterature', etc.]
  musicGenres?: string[];
  conferenceThemes: string[];
}

/**
 * Préférences de communication (profil étendu)
 */
export interface CommunicationPreferences {
  preferredContact: PreferredContact;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    blog?: string;
    website?: string;
  };
  publicProfileConsent: boolean;
  publicProfileLevel: PublicProfileLevel;
}

/**
 * Engagement et feedback (profil étendu)
 */
export interface EngagementInfo {
  howDidYouKnowUs: string;
  suggestions?: string;
  participationInterest: {
    interested: boolean;
    domains: string[];
  };
}

/**
 * Profil étendu (uniquement pour abonnements annuels)
 */
export interface ExtendedProfile {
  professional: ProfessionalInfo;
  interests: InterestsInfo;
  communication: CommunicationPreferences;
  engagement: EngagementInfo;
}

/**
 * Statut d'envoi des emails
 */
export interface EmailStatus {
  membershipCardSent: boolean;
  membershipCardSentAt: Timestamp | null;
  membershipCardSentCount: number;
  lastEmailError?: string;
}

/**
 * Structure complète d'un utilisateur dans Firestore
 */
export interface User {
  // Informations de base (obligatoires)
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  birthDate?: Timestamp;
  phone: string;

  // Statut et métadonnées
  status: UserStatus;

  // Origine du compte
  registration: RegistrationInfo;

  // Abonnement actuel
  currentMembership: CurrentMembership;

  // Statistiques de scan QR (optionnelles)
  scanCount?: number;
  lastScannedAt?: Timestamp;

  // Points de fidélité
  loyaltyPoints: number;

  // Profil étendu (uniquement pour abonnements annuels)
  extendedProfile?: ExtendedProfile;

  // Statut d'envoi des emails
  emailStatus?: EmailStatus;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

// ============================================================================
// HISTORIQUE D'ABONNEMENT (Sous-collection)
// ============================================================================

export interface MembershipHistory {
  id: string;
  planId: string;
  planName: string;
  planType: MembershipType;
  status: MembershipStatus;
  startDate: Timestamp;
  endDate: Timestamp | null;
  price: number;
  paymentMethod?: string;
  transactionId?: string;
  cancelReason?: string;
  cancelledAt?: Timestamp;

  // Tracking des renouvellements pour analytics
  isRenewal: boolean; // True si c'est un renouvellement
  previousMembershipId?: string; // ID de l'abonnement précédent
  renewalSource?: 'auto' | 'manual'; // Renouvellement automatique ou manuel
  daysBeforeRenewal?: number; // Nombre de jours avant expiration où le renouvellement a eu lieu
}

// ============================================================================
// HISTORIQUE D'ACHATS (Sous-collection)
// ============================================================================

export type PurchaseType = 'crowdfunding' | 'donation' | 'event_ticket' | 'merchandise';
export type PurchaseSource = 'crowdfunding' | 'adhesion_web' | 'platform' | 'admin';
export type PurchasePaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';

/**
 * Structure d'un achat dans la sous-collection purchases
 * Path: users/{userId}/purchases/{purchaseId}
 */
export interface Purchase {
  id: string;
  type: PurchaseType;
  source: PurchaseSource;

  // Details de l'achat
  itemName: string;
  itemDescription?: string;
  amount: number;

  // Pour les billets d'evenements (future)
  eventId?: string;
  eventName?: string;
  eventDate?: Timestamp;

  // Informations de paiement
  paymentId: string;
  paymentStatus: PurchasePaymentStatus;

  // Reference vers la collection contributions (pour crowdfunding)
  contributionId?: string;

  // Timestamps
  purchasedAt: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// HISTORIQUE D'ACTIONS (Sous-collection)
// ============================================================================

export interface ActionDetails {
  // Pour scan/event_checkin
  scanMode?: ScanMode;
  scanResult?: ScanResultStatus;
  location?: string;
  eventId?: string;
  eventName?: string;
  scannedBy?: string;

  // Pour transaction
  amount?: number;
  description?: string;
  transactionId?: string;

  // Pour loyalty
  pointsChange?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  reason?: string;

  // Pour profile_update
  fieldUpdated?: string;
  oldValue?: any;
  newValue?: any;
  updatedBy?: string;
}

export interface ActionHistory {
  id: string;
  actionType: ActionType;
  details: ActionDetails;

  // Métadonnées
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: DeviceType;
  notes?: string;
}

// ============================================================================
// FORMULAIRES ET DTO
// ============================================================================

/**
 * Données du formulaire d'inscription de base
 */
export interface BasicSignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  birthDate: string; // Format ISO
  phone: string;
  planId: string;
}

/**
 * Données du formulaire d'inscription étendu (abonnement annuel)
 */
export interface ExtendedSignupFormData extends BasicSignupFormData {
  // Professionnel
  profession: string;
  activityDomain: string;
  professionalStatus: ProfessionalStatus;
  isVolunteer: boolean;
  volunteerDomains: string[];
  skills: string[];

  // Intérêts
  eventTypes: string[];
  artisticDomains: string[];
  musicGenres: string[];
  conferenceThemes: string[];

  // Communication
  preferredContact: PreferredContact;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  blog?: string;
  website?: string;
  publicProfileConsent: boolean;
  publicProfileLevel: PublicProfileLevel;

  // Engagement
  howDidYouKnowUs: string;
  suggestions?: string;
  participationInterested: boolean;
  participationDomains: string[];
}

/**
 * Données pour création manuelle par admin
 */
export interface AdminCreateUserData {
  // Informations de base
  email: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  birthDate: string;
  phone: string;

  // Abonnement
  planId: string;
  paymentStatus: PaymentStatus;
  startDate: string;
  autoRenew: boolean;

  // Statut
  tags: MemberTag[];
  isAccountBlocked: boolean;
  isCardBlocked: boolean;

  // Profil étendu (optionnel, si abonnement annuel)
  extendedProfile?: Partial<ExtendedProfile>;

  // Notes admin
  adminNotes?: string;
}

/**
 * Données pour mise à jour d'un utilisateur
 */
export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  postalCode?: string;
  birthDate?: Timestamp;
  phone?: string;
  status?: Partial<UserStatus>;
  currentMembership?: Partial<CurrentMembership>;
  loyaltyPoints?: number;
  extendedProfile?: Partial<ExtendedProfile>;
  registration?: Partial<RegistrationInfo>;
}

/**
 * Type union pour SignupFormData (peut être basic ou extended)
 */
export type SignupFormData = BasicSignupFormData | ExtendedSignupFormData;

/**
 * Alias pour UserProfile (utilise User)
 */
export type UserProfile = User;

/**
 * Filtres pour la liste des utilisateurs (admin)
 */
export interface UserFilters {
  search?: string; // nom, email, téléphone
  membershipType?: MembershipType[];
  membershipStatus?: MembershipStatus[];
  tags?: MemberTag[];
  isAccountBlocked?: boolean;
  isCardBlocked?: boolean;
  registrationSource?: RegistrationSource[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minLoyaltyPoints?: number;
  maxLoyaltyPoints?: number;
}

/**
 * Options de pagination
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Résultat paginé
 */
export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// INTERFACES POUR L'AFFICHAGE (Frontend)
// ============================================================================

/**
 * Ancien membre de la collection 'members' (ancien système)
 * Format peut varier selon les enregistrements
 */
export interface LegacyMember {
  uid: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string; // Peut être une chaîne vide ou une date
  phone?: string;
  postalCode?: string;
  createdAt?: any; // Timestamp ou Date
  'end-member'?: any; // Timestamp ou Date
  'member-type'?: string; // Ex: "4nap-festival"
  ticketType?: string; // Ex: "Adhésion annuelle"
  [key: string]: any; // Pour gérer les variations de format
}

/**
 * Version simplifiée pour l'affichage dans les listes
 */
export interface UserListItem {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  membership: {
    type: MembershipType;
    status: MembershipStatus;
    planName: string;
  };
  loyaltyPoints: number;
  tags: MemberTag[];
  createdAt: Timestamp;
  isAccountBlocked: boolean;
  isCardBlocked: boolean;
  registrationSource: RegistrationSource; // Source d'origine du compte
  // Indicateur pour les anciens membres non migrés
  isLegacy?: boolean;
  legacyData?: LegacyMember;
  // Statut d'envoi de l'email
  emailStatus?: EmailStatus;
}

/**
 * Résultat avec séparation des membres legacy et users
 */
export interface SeparatedUsersList {
  legacyMembers: UserListItem[];
  users: UserListItem[];
}

/**
 * Statistiques d'un utilisateur
 */
export interface UserStats {
  totalScans: number;
  totalTransactions: number;
  totalSpent: number;
  eventsAttended: number;
  loyaltyPointsEarned: number;
  loyaltyPointsSpent: number;
  memberSince: Timestamp;
  lastActivity?: Timestamp;
}

// ============================================================================
// TYPES UTILITAIRES
// ============================================================================

/**
 * Type guard pour vérifier si un utilisateur a un profil étendu
 */
export function hasExtendedProfile(user: User): user is User & { extendedProfile: ExtendedProfile } {
  return user.extendedProfile !== undefined;
}

/**
 * Type guard pour vérifier si un utilisateur est bloqué
 */
export function isUserBlocked(user: User): boolean {
  return user.status.isAccountBlocked || user.status.isCardBlocked;
}

/**
 * Type guard pour vérifier si un abonnement est actif
 */
export function hasMembershipActive(user: User): boolean {
  return user.currentMembership.status === 'active' &&
    user.currentMembership.paymentStatus === 'paid';
}

/**
 * Type guard pour vérifier si un abonnement est expiré ou va expirer
 */
export function isMembershipExpiringSoon(user: User, daysThreshold: number = 7): boolean {
  if (!user.currentMembership.expiryDate) return false;

  const now = new Date();
  const expiryDate = user.currentMembership.expiryDate.toDate();
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0;
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  monthly: 'Mensuel',
  annual: 'Annuel',
  lifetime: 'Honoraire',
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: 'Actif',
  expired: 'Expiré',
  pending: 'En attente',
  cancelled: 'Annulé',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Payé',
  pending: 'En attente',
  failed: 'Échec',
};

export const PROFESSIONAL_STATUS_LABELS: Record<ProfessionalStatus, string> = {
  salaried: 'Salarié',
  independent: 'Indépendant',
  student: 'Étudiant',
  retired: 'Retraité',
  unemployed: 'Sans emploi',
};

export const REGISTRATION_SOURCE_LABELS: Record<RegistrationSource, string> = {
  platform: 'Plateforme',
  admin: 'Ajout Admin',
  transfer: 'Transfert',
  crowdfunding: 'Crowdfunding',
  adhesion_web: 'Adhésion Web',
  adhesion: 'Adhésion',
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  scan: 'Scan QR',
  transaction: 'Transaction',
  event_checkin: 'Entrée Événement',
  loyalty_earned: 'Points Gagnés',
  loyalty_spent: 'Points Dépensés',
  profile_update: 'Mise à jour Profil',
  card_blocked: 'Carte Bloquée',
  card_unblocked: 'Carte Débloquée',
  membership_created: 'Abonnement Créé',
  membership_renewed: 'Abonnement Renouvelé',
  membership_cancelled: 'Abonnement Annulé',
};

// Tags disponibles
export const AVAILABLE_TAGS: MemberTag[] = [
  'actif',
  'inactif',
  'vip',
  'atelier_couture',
  'billetterie',
  'exposant',
];

// Compétences disponibles pour le profil étendu
export const AVAILABLE_SKILLS = [
  'graphisme',
  'reseaux_sociaux',
  'bricolage',
  'organisation_evenements',
  'photographie',
  'traduction',
  'accueil',
  'communication',
  'comptabilite',
  'juridique',
  'informatique',
  'menuiserie',
  'electricite',
  'plomberie',
  'jardinage',
  'cuisine',
  'couture',
  'musique',
  'danse',
  'theatre',
  'peinture',
  'sculpture',
];

// Types d'événements
export const EVENT_TYPES = [
  'concerts',
  'expositions',
  'ateliers',
  'conferences',
  'projections_cinema',
  'spectacles_vivants',
  'rencontres_thematiques',
  'visites_guidees',
  'activites_famille',
  'marches',
  'festivals',
];

// Domaines artistiques
export const ARTISTIC_DOMAINS = [
  'musique',
  'arts_visuels',
  'litterature',
  'theatre',
  'danse',
  'histoire_locale',
  'sciences',
  'environnement',
  'cinema',
  'photographie',
  'architecture',
  'design',
];

// Genres musicaux
export const MUSIC_GENRES = [
  'classique',
  'jazz',
  'rock',
  'pop',
  'electro',
  'hip_hop',
  'metal',
  'folk',
  'reggae',
  'blues',
  'world',
  'chanson_francaise',
];

// ============================================================================
// TYPES ANALYTICS
// ============================================================================

/**
 * KPIs pour la vue d'ensemble analytics
 */
export interface OverviewKPIs {
  totalMembers: number;
  activeMembers: number;
  activityRate: number; // Pourcentage
  renewalRate: number; // Pourcentage
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalRevenue: number;
  averageAge: number;
  newThisWeek: number;
  newThisMonth: number;
  trends: {
    members: number; // % change vs last period
    revenue: number;
    activeMembers: number;
    renewalRate: number;
  };
}

/**
 * Données d'évolution des membres dans le temps
 */
export interface MembersEvolutionData {
  date: string;
  monthly: number;
  annual: number;
  lifetime: number;
  total: number;
}

/**
 * Distribution des abonnements
 */
export interface MembershipDistribution {
  byType: {
    monthly: number;
    annual: number;
    lifetime: number;
  };
  byStatus: {
    active: number;
    expired: number;
    pending: number;
    cancelled: number;
  };
}

/**
 * Données sur le taux de renouvellement
 */
export interface RenewalRateData {
  overall: number; // Pourcentage
  byType: {
    monthly: number;
    annual: number;
  };
  evolution: Array<{
    month: string;
    rate: number;
  }>;
}

/**
 * Données sur les expirations à venir
 */
export interface ExpirationData {
  date: string;
  count: number;
  estimatedRevenueLoss: number;
  membershipType: MembershipType;
}

/**
 * Timeline d'un membre
 */
export interface MembershipTimelineEvent {
  date: Timestamp;
  type: 'created' | 'renewed' | 'cancelled' | 'expired';
  planName: string;
  price: number;
  isRenewal: boolean;
}

/**
 * Distribution par âge
 */
export interface AgeDistributionData {
  averageAge: number;
  medianAge: number;
  byRange: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46-55': number;
    '56-65': number;
    '66+': number;
  };
  byRangeAndType: {
    [range: string]: {
      monthly: number;
      annual: number;
      lifetime: number;
    };
  };
}

/**
 * Distribution géographique
 */
export interface GeographicData {
  totalPostalCodes: number;
  topPostalCodes: Array<{
    postalCode: string;
    count: number;
    percentage: number;
    byType: {
      monthly: number;
      annual: number;
      lifetime: number;
    };
  }>;
}

/**
 * Distribution professionnelle
 */
export interface ProfessionalData {
  totalWithExtendedProfile: number;
  byStatus: {
    salaried: number;
    independent: number;
    student: number;
    retired: number;
    unemployed: number;
  };
  topProfessions: Array<{
    profession: string;
    count: number;
  }>;
  topActivityDomains: Array<{
    domain: string;
    count: number;
  }>;
}

/**
 * KPIs d'engagement
 */
export interface EngagementKPIs {
  totalExtendedProfiles: number;
  profileCompletionRate: number;
  publicProfileConsentRate: number;
  volunteerCount: number;
  participationInterestedCount: number;
  totalSkillsAvailable: number;
  uniqueSkillsCount: number;
}

/**
 * Analytics des centres d'intérêt
 */
export interface InterestsAnalytics {
  eventTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  artisticDomains: Array<{
    domain: string;
    count: number;
    percentage: number;
  }>;
  musicGenres: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
  conferenceThemes: Array<{
    theme: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Analytics des compétences
 */
export interface SkillsData {
  bySkill: Array<{
    skill: string;
    totalCount: number;
    volunteersCount: number;
    members: Array<{
      userId: string;
      name: string;
      isVolunteer: boolean;
      email?: string;
    }>;
  }>;
}

/**
 * Données d'acquisition
 */
export interface AcquisitionData {
  channels: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  suggestions: Array<{
    text: string;
    userId: string;
    date: Timestamp;
  }>;
}

/**
 * Préférences de communication
 */
export interface CommunicationData {
  preferredContact: {
    email: number;
    sms: number;
    social: number;
    app: number;
  };
  socialMediaPresence: {
    instagram: number;
    facebook: number;
    linkedin: number;
    tiktok: number;
    youtube: number;
    blog: number;
    website: number;
  };
}

/**
 * KPIs financiers
 */
export interface FinancialKPIs {
  totalRevenue: number;
  mrr: number;
  arr: number;
  arpu: number; // Average Revenue Per User
  ltv: number; // Lifetime Value
  churnRate: number;
  revenueByType: {
    monthly: number;
    annual: number;
    lifetime: number;
  };
}

/**
 * Évolution du revenu
 */
export interface RevenueEvolutionData {
  date: string;
  totalRevenue: number;
  monthly: number;
  annual: number;
  lifetime: number;
  newMembers: number;
  renewals: number;
}

/**
 * Données de transaction pour exports
 */
export interface TransactionData {
  id: string;
  date: Timestamp;
  userId: string;
  userName: string;
  userEmail: string;
  membershipType: MembershipType;
  planName: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  isRenewal: boolean;
}
