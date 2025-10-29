import { Timestamp } from 'firebase/firestore';

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type MembershipType = 'monthly' | 'annual' | 'lifetime';
export type MembershipStatus = 'active' | 'expired' | 'pending' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'failed';
export type RegistrationSource = 'platform' | 'admin' | 'transfer';
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
 * Informations du QR Code
 */
export interface QRCodeInfo {
  code: string; // Code unique
  generatedAt: Timestamp;
  lastScannedAt?: Timestamp;
  scanCount: number;
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
 * Structure complète d'un utilisateur dans Firestore
 */
export interface User {
  // Informations de base (obligatoires)
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  birthDate: Timestamp;
  phone: string;

  // Statut et métadonnées
  status: UserStatus;

  // Origine du compte
  registration: RegistrationInfo;

  // Abonnement actuel
  currentMembership: CurrentMembership;

  // QR Code
  qrCode: QRCodeInfo;

  // Points de fidélité
  loyaltyPoints: number;

  // Profil étendu (uniquement pour abonnements annuels)
  extendedProfile?: ExtendedProfile;

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
}

// ============================================================================
// HISTORIQUE D'ACTIONS (Sous-collection)
// ============================================================================

export interface ActionDetails {
  // Pour scan/event_checkin
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

  // QR Code
  qrCode?: string; // Si vide, sera généré automatiquement

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
}

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
