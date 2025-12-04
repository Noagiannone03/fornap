import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  User,
  UserListItem,
  UserStats,
  UserFilters,
  PaginationOptions,
  PaginatedUsers,
  AdminCreateUserData,
  UpdateUserData,
  ActionHistory,
  MembershipHistory,
  ActionType,
  LegacyMember,
  SeparatedUsersList,
} from '../types/user';
import { getMembershipPlanById } from './membershipService';

const USERS_COLLECTION = 'users';
const LEGACY_MEMBERS_COLLECTION = 'members';
const ACTION_HISTORY_SUBCOLLECTION = 'actionHistory';
const MEMBERSHIP_HISTORY_SUBCOLLECTION = 'membershipHistory';

// ============================================================================
// GESTION DES UTILISATEURS
// ============================================================================

/**
 * Récupère un utilisateur par son UID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return {
        ...userDoc.data(),
        uid: userDoc.id,
      } as User;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

/**
 * Récupère un utilisateur par son email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('email', '==', email), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return {
        ...userDoc.data(),
        uid: userDoc.id,
      } as User;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
}

/**
 * Convertit un MembershipPeriod en MembershipType
 * ⚠️ TOUJOURS utiliser cette fonction lors de la création d'un user à partir d'un plan !
 */
export function periodToMembershipType(period: 'month' | 'year' | 'lifetime'): 'monthly' | 'annual' | 'lifetime' {
  switch (period) {
    case 'month':
      return 'monthly';
    case 'year':
      return 'annual';
    case 'lifetime':
      return 'lifetime';
    default:
      throw new Error(`Invalid period: ${period}. Expected: 'month', 'year', or 'lifetime'`);
  }
}

/**
 * Calcule la date d'expiration en fonction du type d'abonnement
 */
function calculateExpiryDate(
  startDate: Date,
  planType: 'monthly' | 'annual' | 'lifetime'
): Date | null {
  if (planType === 'lifetime') {
    return null;
  }

  const expiryDate = new Date(startDate);
  if (planType === 'monthly') {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else if (planType === 'annual') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }

  return expiryDate;
}

/**
 * Valide que le membershipType est standard
 * ⚠️ Empêche la création de users avec des types invalides
 */
function validateMembershipType(planType: any): void {
  const validTypes: Array<'monthly' | 'annual' | 'lifetime'> = ['monthly', 'annual', 'lifetime'];
  if (!validTypes.includes(planType)) {
    throw new Error(
      `❌ INVALID membershipType: "${planType}". ` +
      `Must be one of: 'monthly', 'annual', 'lifetime'. ` +
      `If you are using a MembershipPlan, use periodToMembershipType(plan.period) to convert. ` +
      `See DATA_MODEL.md for details.`
    );
  }
}

/**
 * Crée un nouvel utilisateur (via inscription plateforme)
 */
export async function createUser(
  userData: Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'scanCount' | 'lastScannedAt'>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  try {
    // ⚠️ VALIDATION STRICTE: Empêcher la création de types non-standard
    validateMembershipType(userData.currentMembership.planType);

    const usersRef = collection(db, USERS_COLLECTION);
    const now = Timestamp.now();

    // Utiliser l'UID fourni ou générer un nouvel ID
    const docId = userId || doc(usersRef).id;
    const userDocRef = doc(usersRef, docId);

    const newUser: Omit<User, 'uid'> = {
      ...userData,
      scanCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Enrichir les informations de registration (ne pas inclure les valeurs undefined)
    newUser.registration = {
      ...newUser.registration,
      ...(ipAddress && { ipAddress }),
      ...(userAgent && { userAgent }),
    };

    // Nettoyer les valeurs undefined avant d'envoyer à Firestore
    const cleanedUser = cleanUndefinedFields(newUser);

    // Créer le document avec l'ID pré-généré
    await setDoc(userDocRef, cleanedUser);

    // Créer une entrée dans l'historique d'abonnement
    await addMembershipHistory(docId, {
      planId: userData.currentMembership.planId,
      planName: userData.currentMembership.planName,
      planType: userData.currentMembership.planType,
      status: userData.currentMembership.status,
      startDate: userData.currentMembership.startDate,
      endDate: userData.currentMembership.expiryDate,
      price: userData.currentMembership.price,
      isRenewal: false, // Première inscription
      renewalSource: undefined,
      previousMembershipId: undefined,
      daysBeforeRenewal: undefined,
    });

    // Créer une entrée dans l'historique d'actions
    await addActionHistory(docId, {
      actionType: 'membership_created',
      details: {
        description: `Abonnement ${userData.currentMembership.planName} créé`,
      },
      ipAddress,
      userAgent,
      deviceType: 'web',
    });

    return docId;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Crée un utilisateur manuellement via l'interface admin
 */
export async function createUserByAdmin(
  adminUserId: string,
  userData: AdminCreateUserData
): Promise<string> {
  try {
    // Récupérer les informations du plan
    const plan = await getMembershipPlanById(userData.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const now = Timestamp.now();
    const startDate = new Date(userData.startDate);
    const membershipType = periodToMembershipType(plan.period);
    const expiryDate = calculateExpiryDate(startDate, membershipType);

    const newUserData: Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'scanCount' | 'lastScannedAt'> = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      postalCode: userData.postalCode,
      birthDate: Timestamp.fromDate(new Date(userData.birthDate)),
      phone: userData.phone,

      status: {
        tags: userData.tags,
        isAccountBlocked: userData.isAccountBlocked,
        isCardBlocked: userData.isCardBlocked,
      },

      registration: {
        source: 'admin',
        createdAt: now,
        createdBy: adminUserId,
        ipAddress: 'admin_creation',
      },

      currentMembership: {
        planId: plan.id,
        planName: plan.name,
        planType: membershipType,
        status: userData.paymentStatus === 'paid' ? 'active' : 'pending',
        paymentStatus: userData.paymentStatus,
        startDate: Timestamp.fromDate(startDate),
        expiryDate: expiryDate ? Timestamp.fromDate(expiryDate) : null,
        price: plan.price,
        autoRenew: userData.autoRenew,
      },

      loyaltyPoints: 0,
      extendedProfile: userData.extendedProfile as any,
    };

    const userId = await createUser(newUserData);

    // Logger l'action admin
    await addActionHistory(userId, {
      actionType: 'profile_update',
      details: {
        description: 'Compte créé manuellement par un administrateur',
        updatedBy: adminUserId,
      },
      deviceType: 'web',
      notes: userData.adminNotes,
    });

    return userId;
  } catch (error) {
    console.error('Error creating user by admin:', error);
    throw error;
  }
}

/**
 * Met à jour un utilisateur
 */
export async function updateUser(
  userId: string,
  updates: UpdateUserData,
  adminUserId?: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const now = Timestamp.now();

    // Nettoyer les valeurs undefined avant d'envoyer à Firestore
    const cleanedUpdates = cleanUndefinedFields({
      ...updates,
      updatedAt: now,
    });

    await updateDoc(userRef, cleanedUpdates as any);

    // Logger chaque modification significative
    if (Object.keys(updates).length > 0) {
      await addActionHistory(userId, {
        actionType: 'profile_update',
        details: {
          description: 'Profil mis à jour',
          updatedBy: adminUserId,
        },
        deviceType: 'web',
      });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Supprime définitivement un utilisateur (hard delete)
 * Supprime le document principal ET toutes les sous-collections associées
 */
export async function deleteUser(
  userId: string,
  adminUserId: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    // Vérifier que le document existe avant de le supprimer
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error(`L'utilisateur avec l'ID ${userId} n'existe pas`);
    }

    console.log(`[DELETE USER] Suppression de l'utilisateur ${userId} par admin ${adminUserId}`);

    // 1. Supprimer les sous-collections
    try {
      // Supprimer actionHistory
      const actionHistoryRef = collection(db, USERS_COLLECTION, userId, ACTION_HISTORY_SUBCOLLECTION);
      const actionHistorySnapshot = await getDocs(actionHistoryRef);
      const actionHistoryDeletes = actionHistorySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(actionHistoryDeletes);
      console.log(`[DELETE USER] ${actionHistoryDeletes.length} documents actionHistory supprimés`);

      // Supprimer membershipHistory
      const membershipHistoryRef = collection(db, USERS_COLLECTION, userId, MEMBERSHIP_HISTORY_SUBCOLLECTION);
      const membershipHistorySnapshot = await getDocs(membershipHistoryRef);
      const membershipHistoryDeletes = membershipHistorySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(membershipHistoryDeletes);
      console.log(`[DELETE USER] ${membershipHistoryDeletes.length} documents membershipHistory supprimés`);
    } catch (subcollectionError) {
      // Continuer même si la suppression des sous-collections échoue
      console.warn('[DELETE USER] Erreur lors de la suppression des sous-collections:', subcollectionError);
    }

    // 2. Supprimer le document principal (HARD DELETE)
    await deleteDoc(userRef);
    console.log(`[DELETE USER] Document principal supprimé avec succès`);

  } catch (error) {
    console.error('[DELETE USER] Erreur lors de la suppression de l\'utilisateur:', error);
    throw error;
  }
}

/**
 * Supprime un utilisateur en soft delete (bloque le compte)
 */
export async function softDeleteUser(
  userId: string,
  adminUserId: string
): Promise<void> {
  try {
    await updateUser(
      userId,
      {
        status: {
          isAccountBlocked: true,
          blockedReason: 'Account deleted',
          blockedAt: Timestamp.now(),
          blockedBy: adminUserId,
          tags: [],
          isCardBlocked: true,
        },
      },
      adminUserId
    );
  } catch (error) {
    console.error('Error soft deleting user:', error);
    throw error;
  }
}

// ============================================================================
// GESTION DU BLOCAGE
// ============================================================================

/**
 * Bloque ou débloque un compte utilisateur
 */
export async function toggleAccountBlocked(
  userId: string,
  isBlocked: boolean,
  reason: string,
  adminUserId: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const now = Timestamp.now();

    await updateDoc(userRef, {
      'status.isAccountBlocked': isBlocked,
      'status.blockedReason': isBlocked ? reason : null,
      'status.blockedAt': isBlocked ? now : null,
      'status.blockedBy': isBlocked ? adminUserId : null,
      updatedAt: now,
    });

    await addActionHistory(userId, {
      actionType: isBlocked ? 'card_blocked' : 'card_unblocked',
      details: {
        description: isBlocked
          ? `Compte bloqué: ${reason}`
          : 'Compte débloqué',
        updatedBy: adminUserId,
      },
      deviceType: 'web',
    });
  } catch (error) {
    console.error('Error toggling account blocked:', error);
    throw error;
  }
}

/**
 * Bloque ou débloque une carte utilisateur
 */
export async function toggleCardBlocked(
  userId: string,
  isBlocked: boolean,
  reason: string,
  adminUserId: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const now = Timestamp.now();

    await updateDoc(userRef, {
      'status.isCardBlocked': isBlocked,
      'status.blockedReason': isBlocked ? reason : null,
      'status.blockedAt': isBlocked ? now : null,
      'status.blockedBy': isBlocked ? adminUserId : null,
      updatedAt: now,
    });

    await addActionHistory(userId, {
      actionType: isBlocked ? 'card_blocked' : 'card_unblocked',
      details: {
        description: isBlocked
          ? `Carte bloquée: ${reason}`
          : 'Carte débloquée',
        updatedBy: adminUserId,
      },
      deviceType: 'web',
    });
  } catch (error) {
    console.error('Error toggling card blocked:', error);
    throw error;
  }
}

// ============================================================================
// GESTION DU QR CODE
// ============================================================================

/**
 * Enregistre un scan de QR code
 */
export async function recordQRCodeScan(
  userId: string,
  location?: string,
  scannedBy?: string,
  eventId?: string,
  eventName?: string
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const user = await getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const now = Timestamp.now();

    await updateDoc(userRef, {
      lastScannedAt: now,
      scanCount: (user.scanCount || 0) + 1,
      updatedAt: now,
    });

    await addActionHistory(userId, {
      actionType: eventId ? 'event_checkin' : 'scan',
      details: {
        location,
        scannedBy,
        eventId,
        eventName,
      },
      deviceType: 'scanner',
    });
  } catch (error) {
    console.error('Error recording QR code scan:', error);
    throw error;
  }
}

// ============================================================================
// GESTION DES POINTS DE FIDÉLITÉ
// ============================================================================

/**
 * Ajoute des points de fidélité à un utilisateur
 */
export async function addLoyaltyPoints(
  userId: string,
  points: number,
  reason: string,
  adminUserId?: string
): Promise<number> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = user.loyaltyPoints + points;
    const userRef = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userRef, {
      loyaltyPoints: newBalance,
      updatedAt: Timestamp.now(),
    });

    await addActionHistory(userId, {
      actionType: 'loyalty_earned',
      details: {
        pointsChange: points,
        balanceBefore: user.loyaltyPoints,
        balanceAfter: newBalance,
        reason,
        updatedBy: adminUserId,
      },
      deviceType: 'web',
    });

    return newBalance;
  } catch (error) {
    console.error('Error adding loyalty points:', error);
    throw error;
  }
}

/**
 * Retire des points de fidélité à un utilisateur
 */
export async function spendLoyaltyPoints(
  userId: string,
  points: number,
  reason: string,
  transactionId?: string
): Promise<number> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.loyaltyPoints < points) {
      throw new Error('Insufficient loyalty points');
    }

    const newBalance = user.loyaltyPoints - points;
    const userRef = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userRef, {
      loyaltyPoints: newBalance,
      updatedAt: Timestamp.now(),
    });

    await addActionHistory(userId, {
      actionType: 'loyalty_spent',
      details: {
        pointsChange: -points,
        balanceBefore: user.loyaltyPoints,
        balanceAfter: newBalance,
        reason,
        transactionId,
      },
      deviceType: 'web',
    });

    return newBalance;
  } catch (error) {
    console.error('Error spending loyalty points:', error);
    throw error;
  }
}

// ============================================================================
// HISTORIQUE D'ACTIONS
// ============================================================================

/**
 * Nettoie un objet en retirant les valeurs undefined récursivement
 */
function cleanUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedFields);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedFields(value);
      }
    }
    return cleaned;
  }

  return obj;
}

/**
 * Ajoute une entrée dans l'historique d'actions
 */
export async function addActionHistory(
  userId: string,
  actionData: Omit<ActionHistory, 'id' | 'timestamp'>
): Promise<string> {
  try {
    const actionHistoryRef = collection(
      db,
      USERS_COLLECTION,
      userId,
      ACTION_HISTORY_SUBCOLLECTION
    );

    const actionEntry = cleanUndefinedFields({
      ...actionData,
      timestamp: Timestamp.now(),
    });

    const docRef = await addDoc(actionHistoryRef, actionEntry);
    return docRef.id;
  } catch (error) {
    console.error('Error adding action history:', error);
    throw error;
  }
}

/**
 * Récupère l'historique d'actions d'un utilisateur
 */
export async function getUserActionHistory(
  userId: string,
  limitCount: number = 50,
  actionType?: ActionType
): Promise<ActionHistory[]> {
  try {
    const actionHistoryRef = collection(
      db,
      USERS_COLLECTION,
      userId,
      ACTION_HISTORY_SUBCOLLECTION
    );

    const constraints: QueryConstraint[] = [
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    ];

    if (actionType) {
      constraints.unshift(where('actionType', '==', actionType));
    }

    const q = query(actionHistoryRef, ...constraints);
    const querySnapshot = await getDocs(q);

    const history: ActionHistory[] = [];
    querySnapshot.forEach((doc) => {
      history.push({
        ...doc.data(),
        id: doc.id,
      } as ActionHistory);
    });

    return history;
  } catch (error) {
    console.error('Error fetching action history:', error);
    throw error;
  }
}

// ============================================================================
// HISTORIQUE D'ABONNEMENT
// ============================================================================

/**
 * Ajoute une entrée dans l'historique d'abonnement
 */
export async function addMembershipHistory(
  userId: string,
  historyData: Omit<MembershipHistory, 'id'>
): Promise<string> {
  try {
    const membershipHistoryRef = collection(
      db,
      USERS_COLLECTION,
      userId,
      MEMBERSHIP_HISTORY_SUBCOLLECTION
    );

    // Nettoyer les valeurs undefined avant d'envoyer à Firestore
    const cleanedHistoryData = cleanUndefinedFields(historyData);

    const docRef = await addDoc(membershipHistoryRef, cleanedHistoryData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding membership history:', error);
    throw error;
  }
}

/**
 * Récupère l'historique d'abonnement d'un utilisateur
 */
export async function getUserMembershipHistory(
  userId: string
): Promise<MembershipHistory[]> {
  try {
    const membershipHistoryRef = collection(
      db,
      USERS_COLLECTION,
      userId,
      MEMBERSHIP_HISTORY_SUBCOLLECTION
    );

    const q = query(membershipHistoryRef, orderBy('startDate', 'desc'));
    const querySnapshot = await getDocs(q);

    const history: MembershipHistory[] = [];
    querySnapshot.forEach((doc) => {
      history.push({
        ...doc.data(),
        id: doc.id,
      } as MembershipHistory);
    });

    return history;
  } catch (error) {
    console.error('Error fetching membership history:', error);
    throw error;
  }
}

// ============================================================================
// STATISTIQUES
// ============================================================================

/**
 * Calcule les statistiques d'un utilisateur
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const actionHistory = await getUserActionHistory(userId, 1000);

    const stats: UserStats = {
      totalScans: actionHistory.filter((a) => a.actionType === 'scan').length,
      totalTransactions: actionHistory.filter((a) => a.actionType === 'transaction')
        .length,
      totalSpent: actionHistory
        .filter((a) => a.actionType === 'transaction')
        .reduce((sum, a) => sum + (a.details.amount || 0), 0),
      eventsAttended: actionHistory.filter((a) => a.actionType === 'event_checkin')
        .length,
      loyaltyPointsEarned: actionHistory
        .filter((a) => a.actionType === 'loyalty_earned')
        .reduce(
          (sum, a) => sum + Math.abs(a.details.pointsChange || 0),
          0
        ),
      loyaltyPointsSpent: actionHistory
        .filter((a) => a.actionType === 'loyalty_spent')
        .reduce(
          (sum, a) => sum + Math.abs(a.details.pointsChange || 0),
          0
        ),
      memberSince: user.createdAt,
      lastActivity: actionHistory[0]?.timestamp,
    };

    return stats;
  } catch (error) {
    console.error('Error calculating user stats:', error);
    throw error;
  }
}

// ============================================================================
// LISTE ET FILTRAGE
// ============================================================================

/**
 * Récupère une liste filtrée et paginée d'utilisateurs
 */
export async function getFilteredUsers(
  filters: UserFilters,
  pagination: PaginationOptions
): Promise<PaginatedUsers> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);

    // Construire les contraintes de requête
    const constraints: QueryConstraint[] = [];

    // Note: Firestore a des limitations sur les requêtes complexes
    // Pour des filtres avancés, il faut récupérer tous les documents et filtrer côté client

    // Filtrer par type d'abonnement
    if (filters.membershipType && filters.membershipType.length > 0) {
      // Firestore ne supporte pas 'in' avec plus de 10 éléments
      if (filters.membershipType.length === 1) {
        constraints.push(
          where('currentMembership.planType', '==', filters.membershipType[0])
        );
      }
    }

    // Filtrer par statut d'abonnement
    if (filters.membershipStatus && filters.membershipStatus.length === 1) {
      constraints.push(
        where('currentMembership.status', '==', filters.membershipStatus[0])
      );
    }

    // Filtrer par source d'inscription
    if (filters.registrationSource && filters.registrationSource.length === 1) {
      constraints.push(
        where('registration.source', '==', filters.registrationSource[0])
      );
    }

    // Tri
    const sortField = pagination.sortBy || 'createdAt';
    const sortDirection = pagination.sortOrder || 'desc';
    constraints.push(orderBy(sortField as string, sortDirection));

    // Limitation
    constraints.push(limit(pagination.limit));

    const q = query(usersRef, ...constraints);
    const querySnapshot = await getDocs(q);

    let users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        ...doc.data(),
        uid: doc.id,
      } as User);
    });

    // Filtrage côté client pour les critères complexes
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      users = users.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.phone.includes(filters.search!)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      users = users.filter((user) =>
        filters.tags!.some((tag) => user.status.tags.includes(tag))
      );
    }

    if (filters.isAccountBlocked !== undefined) {
      users = users.filter(
        (user) => user.status.isAccountBlocked === filters.isAccountBlocked
      );
    }

    if (filters.isCardBlocked !== undefined) {
      users = users.filter(
        (user) => user.status.isCardBlocked === filters.isCardBlocked
      );
    }

    if (filters.minLoyaltyPoints !== undefined) {
      users = users.filter(
        (user) => user.loyaltyPoints >= filters.minLoyaltyPoints!
      );
    }

    if (filters.maxLoyaltyPoints !== undefined) {
      users = users.filter(
        (user) => user.loyaltyPoints <= filters.maxLoyaltyPoints!
      );
    }

    if (filters.dateRange) {
      users = users.filter((user) => {
        const createdDate = user.createdAt.toDate();
        return (
          createdDate >= filters.dateRange!.start &&
          createdDate <= filters.dateRange!.end
        );
      });
    }

    // Pagination côté client
    const total = users.length;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      total,
      page: pagination.page,
      totalPages: Math.ceil(total / pagination.limit),
      hasMore: endIndex < total,
    };
  } catch (error) {
    console.error('Error fetching filtered users:', error);
    throw error;
  }
}

/**
 * Récupère tous les utilisateurs SÉPARÉS en deux listes distinctes
 * - legacyMembers : anciens membres non migrés
 * - users : utilisateurs du nouveau système (incluant les migrés)
 */
export async function getAllUsersForListSeparated(): Promise<SeparatedUsersList> {
  try {
    // 1. Récupérer les utilisateurs du nouveau système
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const users: UserListItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as User;

      // Détecter les anomalies
      const hasDataIssue = !data.currentMembership || !data.status;
      const tags = data.status?.tags || [];

      if (hasDataIssue) {
        console.warn(`User ${doc.id} has incomplete data - showing with anomaly flag`);
        if (!tags.includes('DATA_ANOMALY')) {
          tags.push('DATA_ANOMALY');
        }
      }

      users.push({
        uid: doc.id,
        email: data.email || 'no-email@unknown.com',
        firstName: data.firstName || 'Prénom',
        lastName: data.lastName || 'Inconnu',
        membership: {
          type: data.currentMembership?.planType || 'monthly',
          status: data.currentMembership?.status || 'pending',
          planName: data.currentMembership?.planName || '⚠️ Données manquantes',
        },
        loyaltyPoints: data.loyaltyPoints || 0,
        tags: tags,
        createdAt: data.createdAt || Timestamp.now(),
        isAccountBlocked: data.status?.isAccountBlocked || false,
        isCardBlocked: data.status?.isCardBlocked || false,
        registrationSource: data.registration?.source || 'platform',
        isLegacy: false,
        emailStatus: data.emailStatus || {
          membershipCardSent: false,
          membershipCardSentAt: null,
          membershipCardSentCount: 0,
        },
      });
    });

    // 2. Récupérer les anciens membres NON migrés
    const legacyMembers: UserListItem[] = [];
    try {
      const legacyMembersData = await getNonMigratedLegacyMembers();

      // Convertir les anciens membres en UserListItem
      legacyMembersData.forEach((legacy) => {
        const membershipType = determineLegacyMembershipType(legacy);
        const createdAt = legacy.createdAt ? parseTimestamp(legacy.createdAt) : Timestamp.now();
        const endMember = legacy['end-member'] ? parseTimestamp(legacy['end-member']) : null;

        // Déterminer le statut
        let status: 'active' | 'expired' = 'active';
        if (endMember) {
          const endDate = endMember.toDate();
          const today = new Date();
          if (endDate < today) {
            status = 'expired';
          }
        }

        legacyMembers.push({
          uid: legacy.uid,
          email: legacy.email || `legacy-${legacy.uid}@unknown.com`,
          firstName: legacy.firstName || 'Prénom',
          lastName: legacy.lastName || 'Nom',
          membership: {
            type: membershipType,
            status: status,
            planName: legacy.ticketType || legacy['member-type'] || 'Ancien membre',
          },
          loyaltyPoints: 0,
          tags: ['NON_MIGRE'],
          createdAt: createdAt,
          isAccountBlocked: false,
          isCardBlocked: false,
          registrationSource: 'transfer',
          isLegacy: true,
          legacyData: legacy,
        });
      });

      // Trier les anciens membres par date de création
      legacyMembers.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    } catch (legacyError) {
      console.warn('Could not fetch legacy members:', legacyError);
    }

    return {
      legacyMembers,
      users,
    };
  } catch (error) {
    console.error('Error fetching separated users list:', error);
    throw error;
  }
}

/**
 * Récupère tous les utilisateurs (version simplifiée pour liste)
 * @deprecated Utiliser getAllUsersForListSeparated() pour une meilleure UX
 */
export async function getAllUsersForList(): Promise<UserListItem[]> {
  const { legacyMembers, users } = await getAllUsersForListSeparated();
  return [...legacyMembers, ...users];
}

/**
 * Compte le nombre total d'utilisateurs
 */
export async function getUsersCount(): Promise<number> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersRef);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error counting users:', error);
    throw error;
  }
}

/**
 * Recherche efficace d'utilisateurs (Server-side)
 * Utilise des range queries pour email, nom et prénom
 */
export async function searchUsers(searchQuery: string): Promise<UserListItem[]> {
  if (!searchQuery || searchQuery.length < 2) return [];
  
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const qLower = searchQuery.toLowerCase();
    const qCap = searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1).toLowerCase();
    
    // Firestore est sensible à la casse par défaut.
    // Stratégie: On lance quelques requêtes parallèles ciblées.
    // Idéalement, il faudrait un champ "keywords" array en minuscule dans le document pour la recherche.
    
    // 1. Recherche par email (très fiable si exact)
    const emailQuery = query(
      usersRef, 
      where('email', '>=', qLower),
      where('email', '<=', qLower + '\uf8ff'),
      limit(5)
    );

    // 2. Recherche par Nom (Capitalisé)
    const lastNameQuery = query(
      usersRef,
      where('lastName', '>=', qCap),
      where('lastName', '<=', qCap + '\uf8ff'),
      limit(5)
    );

    // 3. Recherche par Prénom (Capitalisé)
    const firstNameQuery = query(
      usersRef,
      where('firstName', '>=', qCap),
      where('firstName', '<=', qCap + '\uf8ff'),
      limit(5)
    );

    const [emailSnap, lastNameSnap, firstNameSnap] = await Promise.all([
      getDocs(emailQuery),
      getDocs(lastNameQuery),
      getDocs(firstNameQuery)
    ]);

    const userMap = new Map<string, UserListItem>();

    const processDoc = (doc: any) => {
      if (userMap.has(doc.id)) return;
      const data = doc.data() as User;
      userMap.set(doc.id, {
        uid: doc.id,
        email: data.email || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        membership: {
          type: data.currentMembership?.planType || 'monthly',
          status: data.currentMembership?.status || 'pending',
          planName: data.currentMembership?.planName || '',
        },
        loyaltyPoints: data.loyaltyPoints || 0,
        tags: data.status?.tags || [],
        createdAt: data.createdAt,
        isAccountBlocked: data.status?.isAccountBlocked || false,
        isCardBlocked: data.status?.isCardBlocked || false,
        registrationSource: data.registration?.source || 'platform',
        isLegacy: false
      });
    };

    emailSnap.forEach(processDoc);
    lastNameSnap.forEach(processDoc);
    firstNameSnap.forEach(processDoc);

    return Array.from(userMap.values()).slice(0, 10); // Max 10 résultats combinés
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Envoie la carte d'adhérent par email à un utilisateur
 * @param userId - ID de l'utilisateur
 * @param forceResend - Force le renvoi même si déjà envoyé
 * @returns Résultat de l'envoi
 */
export async function sendMembershipCard(
  userId: string,
  forceResend: boolean = false
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Appeler l'API Vercel serverless
    const apiUrl = `${import.meta.env.VITE_API_URL || ''}/api/users/send-membership-card`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        forceResend,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send membership card');
    }

    return {
      success: data.success,
      message: data.message || 'Email sent successfully',
    };
  } catch (error: any) {
    console.error('Error sending membership card:', error);
    return {
      success: false,
      message: 'Failed to send membership card',
      error: error.message,
    };
  }
}

/**
 * Type pour le callback de progression de l'envoi massif
 */
export type SendMassiveCardsProgressCallback = (progress: {
  current: number;
  total: number;
  currentUser: string;
  success: number;
  errors: number;
}) => void;

/**
 * Envoie les cartes d'adhérent à tous les utilisateurs
 * @param forceResend - Si true, renvoie même si déjà envoyé
 * @param onProgress - Callback appelé après chaque envoi
 * @returns Résultat de l'envoi massif
 */
export async function sendMembershipCardsToAll(
  forceResend: boolean = false,
  onProgress?: SendMassiveCardsProgressCallback
): Promise<{
  success: number;
  errors: number;
  total: number;
  errorDetails: Array<{ userId: string; userName: string; error: string }>;
}> {
  try {
    // Récupérer tous les utilisateurs (pas les legacy members)
    const usersRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersRef);

    const results = {
      success: 0,
      errors: 0,
      total: querySnapshot.size,
      errorDetails: [] as Array<{ userId: string; userName: string; error: string }>,
    };

    let current = 0;

    // Parcourir tous les utilisateurs
    for (const userDoc of querySnapshot.docs) {
      current++;
      const userData = userDoc.data();
      const userId = userDoc.id;
      const userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email;

      // Appeler le callback de progression
      if (onProgress) {
        onProgress({
          current,
          total: results.total,
          currentUser: userName,
          success: results.success,
          errors: results.errors,
        });
      }

      try {
        // Envoyer la carte d'adhérent
        const result = await sendMembershipCard(userId, forceResend);

        if (result.success) {
          results.success++;
        } else {
          results.errors++;
          results.errorDetails.push({
            userId,
            userName,
            error: result.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        results.errors++;
        results.errorDetails.push({
          userId,
          userName,
          error: error.message || 'Unknown error',
        });
      }

      // Petite pause pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  } catch (error: any) {
    console.error('Error sending membership cards to all users:', error);
    throw error;
  }
}

/**
 * Envoie les cartes d'adhérent uniquement aux utilisateurs qui ne les ont pas encore reçues
 * @param onProgress - Callback appelé après chaque envoi
 * @returns Résultat de l'envoi massif
 */
export async function sendMembershipCardsToUnsent(
  onProgress?: SendMassiveCardsProgressCallback
): Promise<{
  success: number;
  errors: number;
  total: number;
  skipped: number;
  errorDetails: Array<{ userId: string; userName: string; error: string }>;
}> {
  try {
    // Récupérer tous les utilisateurs (pas les legacy members)
    const usersRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersRef);

    // Filtrer les utilisateurs qui n'ont pas reçu leur email
    const unsentUsers = querySnapshot.docs.filter(userDoc => {
      const userData = userDoc.data();
      const emailStatus = userData.emailStatus;
      return !emailStatus || !emailStatus.membershipCardSent;
    });

    const results = {
      success: 0,
      errors: 0,
      total: unsentUsers.length,
      skipped: querySnapshot.size - unsentUsers.length,
      errorDetails: [] as Array<{ userId: string; userName: string; error: string }>,
    };

    let current = 0;

    // Parcourir uniquement les utilisateurs qui n'ont pas reçu
    for (const userDoc of unsentUsers) {
      current++;
      const userData = userDoc.data();
      const userId = userDoc.id;
      const userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email;

      // Appeler le callback de progression
      if (onProgress) {
        onProgress({
          current,
          total: results.total,
          currentUser: userName,
          success: results.success,
          errors: results.errors,
        });
      }

      try {
        // Envoyer la carte d'adhérent (sans force resend)
        const result = await sendMembershipCard(userId, false);

        if (result.success) {
          results.success++;
        } else {
          results.errors++;
          results.errorDetails.push({
            userId,
            userName,
            error: result.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        results.errors++;
        results.errorDetails.push({
          userId,
          userName,
          error: error.message || 'Unknown error',
        });
      }

      // Petite pause pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  } catch (error: any) {
    console.error('Error sending membership cards to unsent users:', error);
    throw error;
  }
}

/**
 * Récupère le statut d'envoi de l'email pour un utilisateur
 */
export async function getEmailStatus(userId: string): Promise<{
  sent: boolean;
  sentAt: Timestamp | null;
  sentCount: number;
} | null> {
  try {
    const user = await getUserById(userId);
    if (!user || !user.emailStatus) {
      return {
        sent: false,
        sentAt: null,
        sentCount: 0,
      };
    }

    return {
      sent: user.emailStatus.membershipCardSent,
      sentAt: user.emailStatus.membershipCardSentAt,
      sentCount: user.emailStatus.membershipCardSentCount,
    };
  } catch (error) {
    console.error('Error getting email status:', error);
    return null;
  }
}

// ============================================================================
// EXPORT DE DONNÉES
// ============================================================================

/**
 * Exporte les données d'un utilisateur (pour RGPD)
 */
export async function exportUserData(userId: string): Promise<any> {
  try {
    const user = await getUserById(userId);
    const actionHistory = await getUserActionHistory(userId, 10000);
    const membershipHistory = await getUserMembershipHistory(userId);
    const stats = await getUserStats(userId);

    return {
      user,
      actionHistory,
      membershipHistory,
      stats,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
}

/**
 * Renouvelle l'abonnement d'un utilisateur
 * @param userId - ID de l'utilisateur
 * @param newPlanId - ID du nouveau plan (peut être le même)
 * @param renewalSource - Source du renouvellement ('auto' ou 'manual')
 * @param paymentMethod - Méthode de paiement
 * @param transactionId - ID de la transaction
 * @returns ID de l'entrée d'historique créée
 */
export async function renewMembership(
  userId: string,
  newPlanId: string,
  renewalSource: 'auto' | 'manual',
  paymentMethod?: string,
  transactionId?: string
): Promise<string> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newPlan = await getMembershipPlanById(newPlanId);
    if (!newPlan) {
      throw new Error('Membership plan not found');
    }

    // Récupérer l'historique pour trouver l'abonnement actuel
    const history = await getUserMembershipHistory(userId);
    const currentMembershipHistoryId = history.length > 0 ? history[0].id : undefined;

    // Calculer les jours avant expiration
    let daysBeforeRenewal: number | undefined;
    if (user.currentMembership.expiryDate) {
      const now = new Date();
      const expiryDate = user.currentMembership.expiryDate.toDate();
      daysBeforeRenewal = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculer les nouvelles dates
    const now = Timestamp.now();
    const startDate = now;
    let expiryDate: Timestamp | null = null;

    if (newPlan.period === 'month') {
      const expiry = new Date(startDate.toDate());
      expiry.setMonth(expiry.getMonth() + 1);
      expiryDate = Timestamp.fromDate(expiry);
    } else if (newPlan.period === 'year') {
      const expiry = new Date(startDate.toDate());
      expiry.setFullYear(expiry.getFullYear() + 1);
      expiryDate = Timestamp.fromDate(expiry);
    }
    // Pour 'lifetime', expiryDate reste null

    // Convertir le type de plan au standard
    const membershipType = periodToMembershipType(newPlan.period);

    // Mettre à jour l'abonnement actuel de l'utilisateur
    await updateUser(userId, {
      currentMembership: {
        ...user.currentMembership,
        planId: newPlan.id,
        planName: newPlan.name,
        planType: membershipType, // ✅ Type standardisé
        status: 'active',
        paymentStatus: 'paid',
        startDate,
        expiryDate,
        price: newPlan.price,
        lastPaymentDate: now,
      },
    });

    // Ajouter une entrée dans l'historique avec les infos de renouvellement
    const historyId = await addMembershipHistory(userId, {
      planId: newPlan.id,
      planName: newPlan.name,
      planType: membershipType, // ✅ Type standardisé
      status: 'active',
      startDate,
      endDate: expiryDate,
      price: newPlan.price,
      paymentMethod,
      transactionId,
      isRenewal: true,
      previousMembershipId: currentMembershipHistoryId,
      renewalSource,
      daysBeforeRenewal,
    });

    // Ajouter une action dans l'historique
    await addActionHistory(userId, {
      actionType: 'membership_renewed',
      details: {
        description: `Abonnement ${newPlan.name} renouvelé (${renewalSource})`,
        amount: newPlan.price,
        transactionId,
      },
      deviceType: 'web',
    });

    return historyId;
  } catch (error) {
    console.error('Error renewing membership:', error);
    throw error;
  }
}

// ============================================================================
// SUPPRESSION EN MASSE
// ============================================================================

/**
 * Supprime tous les documents d'une collection par email
 * Gère les doublons automatiquement
 * @param collectionName - Nom de la collection ('users' ou 'members')
 * @param email - Email à rechercher
 * @returns Nombre de documents supprimés
 */
async function deleteAllDocumentsByEmail(
  collectionName: string,
  email: string
): Promise<number> {
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return 0;
    }

    // Supprimer tous les documents trouvés (y compris les doublons)
    const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
      const docId = docSnapshot.id;

      // Si c'est dans la collection users, supprimer aussi les sous-collections
      if (collectionName === USERS_COLLECTION) {
        try {
          // Supprimer actionHistory
          const actionHistoryRef = collection(db, USERS_COLLECTION, docId, ACTION_HISTORY_SUBCOLLECTION);
          const actionHistorySnapshot = await getDocs(actionHistoryRef);
          await Promise.all(actionHistorySnapshot.docs.map(doc => deleteDoc(doc.ref)));

          // Supprimer membershipHistory
          const membershipHistoryRef = collection(db, USERS_COLLECTION, docId, MEMBERSHIP_HISTORY_SUBCOLLECTION);
          const membershipHistorySnapshot = await getDocs(membershipHistoryRef);
          await Promise.all(membershipHistorySnapshot.docs.map(doc => deleteDoc(doc.ref)));
        } catch (subcollectionError) {
          console.warn(`Erreur lors de la suppression des sous-collections pour ${docId}:`, subcollectionError);
        }
      }

      // Supprimer le document principal
      await deleteDoc(docSnapshot.ref);
    });

    await Promise.all(deletePromises);
    return querySnapshot.size;
  } catch (error) {
    console.error(`Erreur lors de la suppression par email dans ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Supprime en masse des utilisateurs par liste d'emails
 * Gère automatiquement les doublons dans toutes les collections
 * @param emails - Liste d'emails (peut contenir des doublons)
 * @param adminUserId - ID de l'admin qui effectue l'opération
 * @returns Résumé détaillé des suppressions
 */
export async function bulkDeleteUsersByEmails(
  emails: string[],
  adminUserId: string
): Promise<{
  success: boolean;
  totalProcessed: number;
  usersDeleted: number;
  legacyMembersDeleted: number;
  errors: Array<{ email: string; error: string }>;
  details: Array<{ email: string; usersDeleted: number; legacyDeleted: number }>;
}> {
  const errors: Array<{ email: string; error: string }> = [];
  const details: Array<{ email: string; usersDeleted: number; legacyDeleted: number }> = [];
  let totalUsersDeleted = 0;
  let totalLegacyDeleted = 0;

  // Nettoyer et dédupliquer la liste d'emails
  const uniqueEmails = Array.from(
    new Set(
      emails
        .map(email => email.trim().toLowerCase())
        .filter(email => email.length > 0)
    )
  );

  console.log(`[BULK DELETE] Début de la suppression en masse par admin ${adminUserId}. ${uniqueEmails.length} emails uniques à traiter.`);

  for (const email of uniqueEmails) {
    try {
      // Supprimer dans la collection users
      const usersDeleted = await deleteAllDocumentsByEmail(USERS_COLLECTION, email);

      // Supprimer dans la collection members (legacy)
      const legacyDeleted = await deleteAllDocumentsByEmail(LEGACY_MEMBERS_COLLECTION, email);

      totalUsersDeleted += usersDeleted;
      totalLegacyDeleted += legacyDeleted;

      details.push({
        email,
        usersDeleted,
        legacyDeleted,
      });

      console.log(`[BULK DELETE] ${email}: ${usersDeleted} users, ${legacyDeleted} legacy supprimés`);
    } catch (error: any) {
      console.error(`[BULK DELETE] Erreur pour ${email}:`, error);
      errors.push({
        email,
        error: error.message || 'Erreur inconnue',
      });
    }
  }

  console.log(`[BULK DELETE] Terminé. Total: ${totalUsersDeleted} users, ${totalLegacyDeleted} legacy supprimés. ${errors.length} erreurs.`);

  return {
    success: errors.length === 0,
    totalProcessed: uniqueEmails.length,
    usersDeleted: totalUsersDeleted,
    legacyMembersDeleted: totalLegacyDeleted,
    errors,
    details,
  };
}

// ============================================================================
// GESTION DES ANCIENS MEMBRES (Legacy Members)
// ============================================================================

/**
 * Récupère tous les anciens membres de la collection 'members'
 */
export async function getLegacyMembers(): Promise<LegacyMember[]> {
  try {
    const membersRef = collection(db, LEGACY_MEMBERS_COLLECTION);
    const querySnapshot = await getDocs(membersRef);

    const legacyMembers: LegacyMember[] = [];
    querySnapshot.forEach((doc) => {
      legacyMembers.push({
        uid: doc.id,
        ...doc.data(),
      } as LegacyMember);
    });

    return legacyMembers;
  } catch (error) {
    console.error('Error fetching legacy members:', error);
    throw error;
  }
}

/**
 * Récupère tous les UIDs des anciens membres qui ont été migrés
 * OPTIMISATION: Une seule requête au lieu de N requêtes
 */
async function getMigratedLegacyUids(): Promise<Set<string>> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(
      usersRef,
      where('registration.source', '==', 'transfer')
    );
    const querySnapshot = await getDocs(q);

    const migratedUids = new Set<string>();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.registration?.transferredFrom) {
        migratedUids.add(data.registration.transferredFrom);
      }
    });

    return migratedUids;
  } catch (error) {
    console.error('Error fetching migrated legacy UIDs:', error);
    return new Set();
  }
}

/**
 * Récupère uniquement les anciens membres non migrés
 * OPTIMISÉ: 2 requêtes au total au lieu de N+1 requêtes
 */
export async function getNonMigratedLegacyMembers(): Promise<LegacyMember[]> {
  try {
    // 1. Récupérer tous les anciens membres (1 requête)
    const allLegacyMembers = await getLegacyMembers();

    // 2. Récupérer tous les UIDs migrés (1 requête)
    const migratedUids = await getMigratedLegacyUids();

    // 3. Filtrer en mémoire (instantané)
    const nonMigrated = allLegacyMembers.filter(
      (member) => !migratedUids.has(member.uid)
    );

    return nonMigrated;
  } catch (error) {
    console.error('Error fetching non-migrated legacy members:', error);
    throw error;
  }
}

/**
 * Convertit un Timestamp Firestore ou une date en Timestamp
 */
function parseTimestamp(value: any): Timestamp {
  if (!value) {
    return Timestamp.now();
  }

  // Si c'est déjà un Timestamp Firestore
  if (value.toDate && typeof value.toDate === 'function') {
    return value;
  }

  // Si c'est un objet avec seconds et nanoseconds
  if (value.seconds !== undefined) {
    return new Timestamp(value.seconds, value.nanoseconds || 0);
  }

  // Si c'est une date string
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return Timestamp.fromDate(date);
      }
    } catch (e) {
      // Ignore
    }
  }

  // Défaut
  return Timestamp.now();
}

/**
 * Détermine le type d'abonnement à partir des données legacy
 */
function determineLegacyMembershipType(legacy: LegacyMember): 'monthly' | 'annual' | 'lifetime' {
  const memberType = legacy['member-type']?.toLowerCase() || '';
  const ticketType = legacy.ticketType?.toLowerCase() || '';

  if (memberType.includes('annuel') || ticketType.includes('annuel')) {
    return 'annual';
  }
  if (memberType.includes('mensuel') || ticketType.includes('mensuel')) {
    return 'monthly';
  }
  if (memberType.includes('honoraire') || memberType.includes('lifetime')) {
    return 'lifetime';
  }

  // Par défaut, considérer comme annuel
  return 'annual';
}

/**
 * Récupère tous les tags uniques utilisés dans le système
 */
export async function getAllUniqueTags(): Promise<string[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const tagsSet = new Set<string>();

    snapshot.docs.forEach((doc) => {
      const userData = doc.data();
      if (userData.status?.tags && Array.isArray(userData.status.tags)) {
        userData.status.tags.forEach((tag: string) => {
          // Filtrer les tags système automatiques si besoin
          if (!tag.startsWith('DATA_ANOMALY')) {
            tagsSet.add(tag);
          }
        });
      }
    });

    // Convertir le Set en tableau et trier alphabétiquement
    return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Error fetching unique tags:', error);
    return [];
  }
}

/**
 * Migre un ancien membre vers le nouveau système
 */
export async function migrateLegacyMember(
  legacyUid: string,
  adminUserId: string,
  defaultPlanId?: string,
  additionalTags?: string[]
): Promise<string> {
  try {
    // Récupérer l'ancien membre
    const legacyRef = doc(db, LEGACY_MEMBERS_COLLECTION, legacyUid);
    const legacyDoc = await getDoc(legacyRef);

    if (!legacyDoc.exists()) {
      throw new Error('Legacy member not found');
    }

    const legacyData = { uid: legacyDoc.id, ...legacyDoc.data() } as LegacyMember;

    // Vérifier si déjà migré (en cherchant un utilisateur avec ce transferredFrom)
    const usersRef = collection(db, USERS_COLLECTION);
    const checkMigratedQuery = query(
      usersRef,
      where('registration.transferredFrom', '==', legacyUid),
      limit(1)
    );
    const checkSnapshot = await getDocs(checkMigratedQuery);
    if (!checkSnapshot.empty) {
      throw new Error('This member has already been migrated');
    }

    // Déterminer le type d'abonnement
    const membershipType = determineLegacyMembershipType(legacyData);

    // Trouver ou créer un plan approprié
    let planId = defaultPlanId;
    let planName = legacyData.ticketType || 'Abonnement migré';
    let price = 0; // Prix inconnu pour les anciens membres

    // Si pas de plan par défaut fourni, utiliser un ID basé sur le type
    if (!planId) {
      planId = membershipType; // 'monthly', 'annual', ou 'lifetime'

      // Essayer de récupérer le plan
      try {
        const plan = await getMembershipPlanById(planId);
        if (plan) {
          planName = plan.name;
          price = plan.price;
        }
      } catch (e) {
        console.warn(`Plan ${planId} not found, using legacy data`);
      }
    }

    // Préparer les dates
    const now = Timestamp.now();
    const createdAt = legacyData.createdAt ? parseTimestamp(legacyData.createdAt) : now;

    // Gérer la date de fin
    let endMember: Timestamp | null = null;
    if (legacyData['end-member']) {
      endMember = parseTimestamp(legacyData['end-member']);
    } else if (membershipType !== 'lifetime') {
      // Si pas de date de fin et que c'est pas lifetime, calculer une date par défaut
      // Utiliser 1 an après la création pour annual, 1 mois pour monthly
      const createdDate = createdAt.toDate();
      if (membershipType === 'annual') {
        createdDate.setFullYear(createdDate.getFullYear() + 1);
      } else if (membershipType === 'monthly') {
        createdDate.setMonth(createdDate.getMonth() + 1);
      }
      endMember = Timestamp.fromDate(createdDate);
      console.warn(`No end-member found for ${legacyUid}, calculated default: ${createdDate.toLocaleDateString('fr-FR')}`);
    }
    // Si lifetime, endMember reste null (illimité)

    // Déterminer le statut basé sur la date de fin
    let membershipStatus: 'active' | 'expired' = 'active';
    if (endMember) {
      const endDate = endMember.toDate();
      const today = new Date();
      if (endDate < today) {
        membershipStatus = 'expired';
      }
    }

    // Préparer la date de naissance
    let birthDate = now;
    if (legacyData.birthDate && legacyData.birthDate.trim() !== '') {
      try {
        const parsedDate = new Date(legacyData.birthDate);
        if (!isNaN(parsedDate.getTime())) {
          birthDate = Timestamp.fromDate(parsedDate);
        }
      } catch (e) {
        console.warn('Failed to parse birthDate, using current date');
      }
    }

    // Préparer les tags avec le member-type original si disponible
    const tags: string[] = ['MIGRATED_FROM_LEGACY'];
    if (legacyData['member-type']) {
      tags.push(`LEGACY_TYPE:${legacyData['member-type']}`);
    }
    // Ajouter les tags personnalisés fournis
    if (additionalTags && additionalTags.length > 0) {
      tags.push(...additionalTags);
    }

    // Créer le nouvel utilisateur
    const newUserData: Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'scanCount' | 'lastScannedAt'> = {
      email: legacyData.email || `legacy-${legacyUid}@fornap.local`,
      firstName: legacyData.firstName || 'Prénom',
      lastName: legacyData.lastName || 'Inconnu',
      postalCode: legacyData.postalCode || '00000',
      birthDate,
      phone: legacyData.phone || '',

      status: {
        tags,
        isAccountBlocked: false,
        isCardBlocked: false,
      },

      registration: {
        source: 'transfer',
        createdAt: createdAt,
        transferredFrom: legacyUid,
        createdBy: adminUserId,
        legacyMemberType: legacyData['member-type'], // Conserver le type original (ex: "4nap-festival")
        legacyTicketType: legacyData.ticketType, // Conserver le type de ticket original
      },

      currentMembership: {
        planId,
        planName,
        planType: membershipType,
        status: membershipStatus,
        paymentStatus: 'paid', // Considérer comme payé car ancien système
        startDate: createdAt,
        expiryDate: endMember, // ✅ Date de fin d'abonnement conservée
        price,
        autoRenew: false,
      },

      loyaltyPoints: 0,
    };

    // Créer l'utilisateur
    const newUserId = await createUser(newUserData, undefined, 'legacy_migration', 'admin');

    // Logger la migration avec toutes les infos
    const endDateDisplay = endMember
      ? endMember.toDate().toLocaleDateString('fr-FR')
      : membershipType === 'lifetime'
        ? 'Illimité (lifetime)'
        : 'Non définie';

    const migrationDetails = [
      `Legacy ID: ${legacyUid}`,
      `Member Type: ${legacyData['member-type'] || 'N/A'}`,
      `Ticket Type: ${legacyData.ticketType || 'N/A'}`,
      `Membership Type: ${membershipType}`,
      `Status: ${membershipStatus}`,
      `End Date: ${endDateDisplay}`,
      `Original end-member: ${legacyData['end-member'] ? 'Présent' : 'Absent'}`,
    ].join(' | ');

    await addActionHistory(newUserId, {
      actionType: 'profile_update',
      details: {
        description: `Compte migré depuis l'ancien système`,
        updatedBy: adminUserId,
      },
      deviceType: 'web',
      notes: `Migration depuis collection 'members'. ${migrationDetails}`,
    });

    // ✅ NOUVEAU: Supprimer automatiquement tous les doublons dans l'ancienne collection
    // Rechercher et supprimer tous les documents legacy avec le même email
    if (legacyData.email) {
      try {
        console.log(`[MIGRATION] Recherche de doublons pour l'email: ${legacyData.email}`);
        const legacyMembersRef = collection(db, LEGACY_MEMBERS_COLLECTION);
        const duplicatesQuery = query(
          legacyMembersRef,
          where('email', '==', legacyData.email)
        );
        const duplicatesSnapshot = await getDocs(duplicatesQuery);

        if (duplicatesSnapshot.size > 0) {
          console.log(`[MIGRATION] ${duplicatesSnapshot.size} doublons trouvés dans 'members' pour ${legacyData.email}`);

          // Supprimer tous les documents trouvés (y compris l'original)
          const deletePromises = duplicatesSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);

          console.log(`[MIGRATION] ${duplicatesSnapshot.size} documents legacy supprimés pour ${legacyData.email}`);
        } else {
          console.log(`[MIGRATION] Aucun doublon trouvé pour ${legacyData.email}`);
        }
      } catch (cleanupError) {
        // Ne pas bloquer la migration si le nettoyage échoue
        console.error('[MIGRATION] Erreur lors du nettoyage des doublons:', cleanupError);
        console.warn('[MIGRATION] La migration a réussi mais le nettoyage des doublons a échoué');
      }
    }

    return newUserId;
  } catch (error) {
    console.error('Error migrating legacy member:', error);
    throw error;
  }
}
