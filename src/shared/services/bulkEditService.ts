import {
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types/user';
import type {
  AdvancedUserFilters,
  BulkEditOperationType,
  BulkEditSession,
  BulkEditProgress,
  BulkEditResult,
} from '../types/bulkEdit';
import {
  getUserById,
  updateUser,
  toggleAccountBlocked,
  toggleCardBlocked,
  addLoyaltyPoints,
  addActionHistory,
} from './userService';

const USERS_COLLECTION = 'users';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcule l'age a partir de la date de naissance
 */
function calculateAge(birthDate: Timestamp): number {
  const birth = birthDate.toDate();
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Verifie si un utilisateur correspond aux filtres avances
 * Reutilise le pattern de campaignService.userMatchesFilters
 */
export function userMatchesAdvancedFilters(user: User, filters: AdvancedUserFilters): boolean {
  // Filtre par liste d'emails (prioritaire - si une liste est fournie, l'utilisateur doit y figurer)
  if (filters.emailList && filters.emailList.length > 0) {
    const userEmail = user.email?.toLowerCase().trim();
    if (!userEmail || !filters.emailList.includes(userEmail)) {
      return false;
    }
  }

  // Filtre de recherche textuelle
  if (filters.search && filters.search.trim()) {
    const searchLower = filters.search.toLowerCase().trim();
    const matchesSearch =
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchLower);
    if (!matchesSearch) {
      return false;
    }
  }

  // Filtre de membership type
  if (filters.membershipTypes && filters.membershipTypes.length > 0) {
    if (!filters.membershipTypes.includes(user.currentMembership.planType)) {
      return false;
    }
  }

  // Filtre de membership status
  if (filters.membershipStatus && filters.membershipStatus.length > 0) {
    if (!filters.membershipStatus.includes(user.currentMembership.status)) {
      return false;
    }
  }

  // Filtre de tags (include) - l'utilisateur doit avoir AU MOINS UN des tags
  if (filters.includeTags && filters.includeTags.length > 0) {
    const hasTag = filters.includeTags.some(tag => user.status.tags.includes(tag));
    if (!hasTag) {
      return false;
    }
  }

  // Filtre de tags (exclude) - l'utilisateur ne doit avoir AUCUN de ces tags
  if (filters.excludeTags && filters.excludeTags.length > 0) {
    const hasExcludedTag = filters.excludeTags.some(tag => user.status.tags.includes(tag));
    if (hasExcludedTag) {
      return false;
    }
  }

  // Filtre d'age
  if (filters.ageRange && (filters.ageRange.min !== undefined || filters.ageRange.max !== undefined)) {
    if (!user.birthDate) {
      return false;
    }
    const age = calculateAge(user.birthDate);
    if (filters.ageRange.min !== undefined && age < filters.ageRange.min) {
      return false;
    }
    if (filters.ageRange.max !== undefined && age > filters.ageRange.max) {
      return false;
    }
  }

  // Filtre de codes postaux
  if (filters.postalCodes && filters.postalCodes.length > 0) {
    const normalizedPostalCodes = filters.postalCodes.map(p => p.trim()).filter(p => p);
    if (normalizedPostalCodes.length > 0 && !normalizedPostalCodes.includes(user.postalCode)) {
      return false;
    }
  }

  // Filtre de source d'inscription
  if (filters.registrationSources && filters.registrationSources.length > 0) {
    if (!filters.registrationSources.includes(user.registration.source)) {
      return false;
    }
  }

  // Filtre de date d'inscription
  if (filters.registrationDateRange) {
    const registrationDate = user.registration.createdAt.toDate();
    if (filters.registrationDateRange.start && registrationDate < filters.registrationDateRange.start) {
      return false;
    }
    if (filters.registrationDateRange.end && registrationDate > filters.registrationDateRange.end) {
      return false;
    }
  }

  // Filtre de date d'expiration
  if (filters.expiryDateRange) {
    if (!user.currentMembership.expiryDate) {
      // Si pas de date d'expiration (lifetime), exclure si on filtre par date
      return false;
    }
    const expiryDate = user.currentMembership.expiryDate.toDate();
    if (filters.expiryDateRange.start && expiryDate < filters.expiryDateRange.start) {
      return false;
    }
    if (filters.expiryDateRange.end && expiryDate > filters.expiryDateRange.end) {
      return false;
    }
  }

  // Filtre de points de fidelite
  if (filters.loyaltyPointsRange) {
    if (filters.loyaltyPointsRange.min !== undefined && user.loyaltyPoints < filters.loyaltyPointsRange.min) {
      return false;
    }
    if (filters.loyaltyPointsRange.max !== undefined && user.loyaltyPoints > filters.loyaltyPointsRange.max) {
      return false;
    }
  }

  // Filtre de blocage compte
  if (filters.accountBlockedStatus && filters.accountBlockedStatus !== 'all') {
    const isBlocked = user.status.isAccountBlocked;
    if (filters.accountBlockedStatus === 'blocked' && !isBlocked) {
      return false;
    }
    if (filters.accountBlockedStatus === 'not_blocked' && isBlocked) {
      return false;
    }
  }

  // Filtre de blocage carte
  if (filters.cardBlockedStatus && filters.cardBlockedStatus !== 'all') {
    const isBlocked = user.status.isCardBlocked;
    if (filters.cardBlockedStatus === 'blocked' && !isBlocked) {
      return false;
    }
    if (filters.cardBlockedStatus === 'not_blocked' && isBlocked) {
      return false;
    }
  }

  // Filtre d'envoi d'email
  if (filters.emailSentStatus && filters.emailSentStatus !== 'all') {
    const hasSent = user.emailStatus?.membershipCardSent || false;
    if (filters.emailSentStatus === 'sent' && !hasSent) {
      return false;
    }
    if (filters.emailSentStatus === 'not_sent' && hasSent) {
      return false;
    }
  }

  // Filtre d'exclusion manuelle
  if (filters.excludedUserIds && filters.excludedUserIds.length > 0) {
    if (filters.excludedUserIds.includes(user.uid)) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Recupere tous les utilisateurs du systeme
 */
async function getAllUsers(): Promise<User[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersRef);

    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id,
    })) as User[];
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Recupere les utilisateurs filtres pour la modification en masse
 */
export async function getFilteredUsersForBulkEdit(
  filters: AdvancedUserFilters
): Promise<User[]> {
  try {
    const allUsers = await getAllUsers();
    return allUsers.filter(user => userMatchesAdvancedFilters(user, filters));
  } catch (error) {
    console.error('Error getting filtered users for bulk edit:', error);
    throw error;
  }
}

/**
 * Estime le nombre d'utilisateurs cibles par les filtres
 */
export async function estimateBulkEditTargets(
  filters: AdvancedUserFilters
): Promise<number> {
  try {
    const filteredUsers = await getFilteredUsersForBulkEdit(filters);
    return filteredUsers.length;
  } catch (error) {
    console.error('Error estimating bulk edit targets:', error);
    throw error;
  }
}

/**
 * Execute les modifications en masse
 */
export async function executeBulkEdit(
  session: BulkEditSession,
  adminUserId: string,
  onProgress?: (progress: BulkEditProgress) => void
): Promise<BulkEditResult> {
  const results: BulkEditResult = {
    success: 0,
    errors: 0,
    skipped: 0,
    total: session.targetUserIds.length,
    errorDetails: [],
    executedAt: Timestamp.now(),
    executedBy: adminUserId,
  };

  console.log(`[BULK EDIT] Debut de la modification en masse pour ${session.targetUserIds.length} utilisateurs`);
  console.log(`[BULK EDIT] Operations: ${session.operations.join(', ')}`);
  console.log(`[BULK EDIT] Raison: ${session.reason}`);

  let current = 0;

  for (const userId of session.targetUserIds) {
    current++;

    try {
      // Recuperer l'utilisateur actuel
      const user = await getUserById(userId);
      if (!user) {
        results.skipped++;
        console.warn(`[BULK EDIT] Utilisateur ${userId} non trouve, ignore`);
        continue;
      }

      const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;

      // Callback de progression
      if (onProgress) {
        onProgress({
          current,
          total: results.total,
          currentUserName: userName,
          success: results.success,
          errors: results.errors,
          skipped: results.skipped,
        });
      }

      // Appliquer les operations
      await applyBulkEditOperations(user, session, adminUserId);

      results.success++;
      console.log(`[BULK EDIT] Succes pour ${userName} (${userId})`);
    } catch (error: any) {
      results.errors++;
      const user = await getUserById(userId).catch(() => null);
      const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : userId;

      results.errorDetails.push({
        userId,
        userName,
        error: error.message || 'Erreur inconnue',
      });
      console.error(`[BULK EDIT] Erreur pour ${userId}:`, error);
    }

    // Petite pause pour ne pas surcharger
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[BULK EDIT] Termine. Succes: ${results.success}, Erreurs: ${results.errors}, Ignores: ${results.skipped}`);

  return results;
}

/**
 * Applique les operations de modification sur un utilisateur
 */
async function applyBulkEditOperations(
  user: User,
  session: BulkEditSession,
  adminUserId: string
): Promise<void> {
  const { operations, data, reason } = session;
  const updateData: Record<string, any> = {};
  const actionDescriptions: string[] = [];

  for (const operation of operations) {
    switch (operation) {
      case 'changeMembershipType':
        if (data.membershipType) {
          updateData['currentMembership.planType'] = data.membershipType;
          actionDescriptions.push(`Type abonnement: ${data.membershipType}`);
        }
        break;

      case 'changeMembershipStatus':
        if (data.membershipStatus) {
          updateData['currentMembership.status'] = data.membershipStatus;
          actionDescriptions.push(`Statut abonnement: ${data.membershipStatus}`);
        }
        break;

      case 'addTags':
        if (data.tagsToAdd && data.tagsToAdd.length > 0) {
          const currentTags = user.status.tags || [];
          const mergedTags = Array.from(new Set([...currentTags, ...data.tagsToAdd]));
          updateData['status.tags'] = mergedTags;
          actionDescriptions.push(`Tags ajoutes: ${data.tagsToAdd.join(', ')}`);
        }
        break;

      case 'removeTags':
        if (data.tagsToRemove && data.tagsToRemove.length > 0) {
          const currentTags = user.status.tags || [];
          const filteredTags = currentTags.filter(tag => !data.tagsToRemove!.includes(tag));
          updateData['status.tags'] = filteredTags;
          actionDescriptions.push(`Tags retires: ${data.tagsToRemove.join(', ')}`);
        }
        break;

      case 'replaceTags':
        if (data.tagsToReplace) {
          updateData['status.tags'] = data.tagsToReplace;
          actionDescriptions.push(`Tags remplaces par: ${data.tagsToReplace.join(', ')}`);
        }
        break;

      case 'updateStartDate':
        if (data.startDate) {
          updateData['currentMembership.startDate'] = Timestamp.fromDate(data.startDate);
          actionDescriptions.push(`Date debut: ${data.startDate.toLocaleDateString('fr-FR')}`);
        }
        break;

      case 'updateExpiryDate':
        if (data.expiryDate) {
          updateData['currentMembership.expiryDate'] = Timestamp.fromDate(data.expiryDate);
          actionDescriptions.push(`Date expiration: ${data.expiryDate.toLocaleDateString('fr-FR')}`);
        }
        break;

      case 'addLoyaltyPoints':
        if (data.loyaltyPointsToAdd !== undefined && data.loyaltyPointsToAdd !== 0) {
          await addLoyaltyPoints(
            user.uid,
            data.loyaltyPointsToAdd,
            `Modification en masse: ${reason}`,
            adminUserId
          );
          actionDescriptions.push(`Points fidelite ajoutes: ${data.loyaltyPointsToAdd}`);
        }
        break;

      case 'setLoyaltyPoints':
        if (data.loyaltyPointsToSet !== undefined) {
          updateData['loyaltyPoints'] = data.loyaltyPointsToSet;
          actionDescriptions.push(`Points fidelite definis a: ${data.loyaltyPointsToSet}`);
        }
        break;

      case 'blockAccounts':
        if (!user.status.isAccountBlocked) {
          await toggleAccountBlocked(
            user.uid,
            true,
            data.blockReason || `Modification en masse: ${reason}`,
            adminUserId
          );
          actionDescriptions.push('Compte bloque');
        }
        break;

      case 'unblockAccounts':
        if (user.status.isAccountBlocked) {
          await toggleAccountBlocked(
            user.uid,
            false,
            '',
            adminUserId
          );
          actionDescriptions.push('Compte debloque');
        }
        break;

      case 'blockCards':
        if (!user.status.isCardBlocked) {
          await toggleCardBlocked(
            user.uid,
            true,
            data.blockReason || `Modification en masse: ${reason}`,
            adminUserId
          );
          actionDescriptions.push('Carte bloquee');
        }
        break;

      case 'unblockCards':
        if (user.status.isCardBlocked) {
          await toggleCardBlocked(
            user.uid,
            false,
            '',
            adminUserId
          );
          actionDescriptions.push('Carte debloquee');
        }
        break;
    }
  }

  // Appliquer les mises a jour directes
  if (Object.keys(updateData).length > 0) {
    await updateUser(user.uid, updateData as any, adminUserId);
  }

  // Logger l'action
  if (actionDescriptions.length > 0) {
    await addActionHistory(user.uid, {
      actionType: 'profile_update',
      details: {
        description: `Modification en masse: ${actionDescriptions.join(', ')}`,
        updatedBy: adminUserId,
      },
      deviceType: 'web',
      notes: `Modification en masse - Raison: ${reason}`,
    });
  }
}

/**
 * Determine les operations actives a partir des donnees
 */
export function getActiveOperations(
  data: BulkEditSession['data']
): BulkEditOperationType[] {
  const operations: BulkEditOperationType[] = [];

  if (data.membershipType) {
    operations.push('changeMembershipType');
  }
  if (data.membershipStatus) {
    operations.push('changeMembershipStatus');
  }
  if (data.tagsToAdd && data.tagsToAdd.length > 0) {
    operations.push('addTags');
  }
  if (data.tagsToRemove && data.tagsToRemove.length > 0) {
    operations.push('removeTags');
  }
  if (data.tagsToReplace && data.tagsToReplace.length > 0) {
    operations.push('replaceTags');
  }
  if (data.startDate) {
    operations.push('updateStartDate');
  }
  if (data.expiryDate) {
    operations.push('updateExpiryDate');
  }
  if (data.loyaltyPointsToAdd !== undefined && data.loyaltyPointsToAdd !== 0) {
    operations.push('addLoyaltyPoints');
  }
  if (data.loyaltyPointsToSet !== undefined) {
    operations.push('setLoyaltyPoints');
  }

  return operations;
}
