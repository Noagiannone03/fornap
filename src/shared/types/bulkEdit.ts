import type { MembershipType, MembershipStatus, MemberTag, RegistrationSource } from './user';
import type { Timestamp } from 'firebase/firestore';

// Filtres avancés de recherche
export interface AdvancedUserFilters {
  search?: string;
  membershipTypes?: MembershipType[];
  membershipStatus?: MembershipStatus[];
  includeTags?: MemberTag[];
  excludeTags?: MemberTag[];
  ageRange?: { min?: number; max?: number };
  postalCodes?: string[];
  registrationSources?: RegistrationSource[];
  registrationDateRange?: { start?: Date; end?: Date };
  expiryDateRange?: { start?: Date; end?: Date };
  loyaltyPointsRange?: { min?: number; max?: number };
  accountBlockedStatus?: 'all' | 'blocked' | 'not_blocked';
  cardBlockedStatus?: 'all' | 'blocked' | 'not_blocked';
  emailSentStatus?: 'all' | 'sent' | 'not_sent';
  excludedUserIds?: string[];
}

// Opérations de modification
export type BulkEditOperationType =
  | 'changeMembershipType'
  | 'changeMembershipStatus'
  | 'addTags'
  | 'removeTags'
  | 'replaceTags'
  | 'updateStartDate'
  | 'updateExpiryDate'
  | 'addLoyaltyPoints'
  | 'setLoyaltyPoints'
  | 'blockAccounts'
  | 'unblockAccounts'
  | 'blockCards'
  | 'unblockCards';

// Données de modification
export interface BulkEditData {
  membershipType?: MembershipType;
  membershipStatus?: MembershipStatus;
  tagsToAdd?: MemberTag[];
  tagsToRemove?: MemberTag[];
  tagsToReplace?: MemberTag[];
  startDate?: Date;
  expiryDate?: Date;
  loyaltyPointsToAdd?: number;
  loyaltyPointsToSet?: number;
  blockReason?: string;
}

// Session de modification en masse
export interface BulkEditSession {
  filters: AdvancedUserFilters;
  targetUserIds: string[];
  operations: BulkEditOperationType[];
  data: BulkEditData;
  reason: string;
}

// Progression de l'exécution
export interface BulkEditProgress {
  current: number;
  total: number;
  currentUserName: string;
  success: number;
  errors: number;
  skipped: number;
}

// Résultat final
export interface BulkEditResult {
  success: number;
  errors: number;
  skipped: number;
  total: number;
  errorDetails: Array<{
    userId: string;
    userName: string;
    error: string;
  }>;
  executedAt: Timestamp;
  executedBy: string;
}

// État du wizard
export type BulkEditStep = 'filters' | 'preview' | 'actions' | 'confirmation' | 'progress';
