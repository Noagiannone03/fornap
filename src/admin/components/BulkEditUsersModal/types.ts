import type { User } from '../../../shared/types/user';
import type {
  AdvancedUserFilters,
  BulkEditData,
  BulkEditOperationType,
  BulkEditStep,
} from '../../../shared/types/bulkEdit';
import type { TagConfig } from '../../../shared/services/tagService';

export interface BulkEditUsersModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete: () => void;
  adminUserId: string;
  allTags: string[];
  tagsConfig: TagConfig[];
}

export interface BulkEditWizardState {
  step: BulkEditStep;
  filters: AdvancedUserFilters;
  filteredUsers: User[];
  selectedUserIds: string[];
  excludedUserIds: string[];
  operations: BulkEditOperationType[];
  data: BulkEditData;
  reason: string;
  isLoading: boolean;
  estimatedCount: number;
}

export interface AdvancedFiltersStepProps {
  filters: AdvancedUserFilters;
  onFiltersChange: (filters: AdvancedUserFilters) => void;
  estimatedCount: number;
  isLoading: boolean;
  allTags: string[];
  onNext: () => void;
}

export interface UsersPreviewStepProps {
  users: User[];
  excludedUserIds: string[];
  onExcludedChange: (excludedIds: string[]) => void;
  isLoading: boolean;
  tagsConfig: TagConfig[];
  onPrevious: () => void;
  onNext: () => void;
}

export interface BulkActionsStepProps {
  operations: BulkEditOperationType[];
  data: BulkEditData;
  onOperationsChange: (operations: BulkEditOperationType[]) => void;
  onDataChange: (data: BulkEditData) => void;
  allTags: string[];
  onPrevious: () => void;
  onNext: () => void;
}

export interface ConfirmationStepProps {
  targetCount: number;
  operations: BulkEditOperationType[];
  data: BulkEditData;
  reason: string;
  onReasonChange: (reason: string) => void;
  onPrevious: () => void;
  onExecute: () => void;
}

export interface ProgressStepProps {
  progress: {
    current: number;
    total: number;
    currentUserName: string;
    success: number;
    errors: number;
    skipped: number;
  } | null;
  result: {
    success: number;
    errors: number;
    skipped: number;
    total: number;
    errorDetails: Array<{ userId: string; userName: string; error: string }>;
  } | null;
  isExecuting: boolean;
  onClose: () => void;
}

// Labels for operations
export const OPERATION_LABELS: Record<BulkEditOperationType, string> = {
  changeMembershipType: 'Changer le type d\'abonnement',
  changeMembershipStatus: 'Changer le statut d\'abonnement',
  addTags: 'Ajouter des tags',
  removeTags: 'Retirer des tags',
  replaceTags: 'Remplacer les tags',
  updateStartDate: 'Modifier la date de debut',
  updateExpiryDate: 'Modifier la date d\'expiration',
  addLoyaltyPoints: 'Ajouter des points de fidelite',
  setLoyaltyPoints: 'Definir les points de fidelite',
  blockAccounts: 'Bloquer les comptes',
  unblockAccounts: 'Debloquer les comptes',
  blockCards: 'Bloquer les cartes',
  unblockCards: 'Debloquer les cartes',
};
