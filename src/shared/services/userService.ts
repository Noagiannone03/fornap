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
  startAfter,
  Timestamp,
  writeBatch,
  DocumentSnapshot,
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
  ActionDetails,
  DeviceType,
} from '../types/user';
import { getMembershipPlanById } from './membershipService';

const USERS_COLLECTION = 'users';
const ACTION_HISTORY_SUBCOLLECTION = 'actionHistory';
const MEMBERSHIP_HISTORY_SUBCOLLECTION = 'membershipHistory';

// ============================================================================
// GÉNÉRATION DE QR CODE
// ============================================================================

/**
 * Génère un code QR unique pour un utilisateur
 * Format: FORNAP-{userId}-{timestamp}-{random}
 */
export function generateQRCode(userId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `FORNAP-${userId}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Vérifie si un code QR existe déjà
 */
export async function qrCodeExists(qrCode: string): Promise<boolean> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('qrCode.code', '==', qrCode));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking QR code existence:', error);
    throw error;
  }
}

/**
 * Génère un code QR unique (vérifie l'unicité)
 */
export async function generateUniqueQRCode(userId: string): Promise<string> {
  let qrCode = generateQRCode(userId);
  let attempts = 0;
  const maxAttempts = 10;

  while (await qrCodeExists(qrCode) && attempts < maxAttempts) {
    qrCode = generateQRCode(userId);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique QR code after maximum attempts');
  }

  return qrCode;
}

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
 * Récupère un utilisateur par son code QR
 */
export async function getUserByQRCode(qrCode: string): Promise<User | null> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('qrCode.code', '==', qrCode), limit(1));
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
    console.error('Error fetching user by QR code:', error);
    throw error;
  }
}

/**
 * Convertit un MembershipPeriod en MembershipType
 */
function periodToMembershipType(period: 'month' | 'year' | 'lifetime'): 'monthly' | 'annual' | 'lifetime' {
  switch (period) {
    case 'month':
      return 'monthly';
    case 'year':
      return 'annual';
    case 'lifetime':
      return 'lifetime';
    default:
      return 'monthly';
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
 * Crée un nouvel utilisateur (via inscription plateforme)
 */
export async function createUser(
  userData: Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'qrCode'>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const now = Timestamp.now();

    // Utiliser l'UID fourni ou générer un nouvel ID
    const docId = userId || doc(usersRef).id;
    const userDocRef = doc(usersRef, docId);

    // Générer le QR code
    const qrCode = await generateUniqueQRCode(docId);

    const newUser: Omit<User, 'uid'> = {
      ...userData,
      qrCode: {
        code: qrCode,
        generatedAt: now,
        scanCount: 0,
      },
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
      id: '',
      planId: userData.currentMembership.planId,
      planName: userData.currentMembership.planName,
      planType: userData.currentMembership.planType,
      status: userData.currentMembership.status,
      startDate: userData.currentMembership.startDate,
      endDate: userData.currentMembership.expiryDate,
      price: userData.currentMembership.price,
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

    const newUserData: Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'qrCode'> = {
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
      extendedProfile: userData.extendedProfile,
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
 * Supprime un utilisateur (soft delete recommandé)
 */
export async function deleteUser(
  userId: string,
  adminUserId: string
): Promise<void> {
  try {
    // Recommandé: Soft delete plutôt que hard delete
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

    // Pour un hard delete:
    // const userRef = doc(db, USERS_COLLECTION, userId);
    // await deleteDoc(userRef);
  } catch (error) {
    console.error('Error deleting user:', error);
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
 * Régénère le QR code d'un utilisateur
 */
export async function regenerateQRCode(
  userId: string,
  adminUserId?: string
): Promise<string> {
  try {
    const newQRCode = await generateUniqueQRCode(userId);
    const userRef = doc(db, USERS_COLLECTION, userId);
    const now = Timestamp.now();

    await updateDoc(userRef, {
      'qrCode.code': newQRCode,
      'qrCode.generatedAt': now,
      'qrCode.scanCount': 0,
      updatedAt: now,
    });

    await addActionHistory(userId, {
      actionType: 'profile_update',
      details: {
        description: 'QR code régénéré',
        updatedBy: adminUserId,
      },
      deviceType: 'web',
    });

    return newQRCode;
  } catch (error) {
    console.error('Error regenerating QR code:', error);
    throw error;
  }
}

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
      'qrCode.lastScannedAt': now,
      'qrCode.scanCount': user.qrCode.scanCount + 1,
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
 * Récupère tous les utilisateurs (version simplifiée pour liste)
 */
export async function getAllUsersForList(): Promise<UserListItem[]> {
  try {
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
        // Ajouter un tag "DATA_ANOMALY" pour identifier ces utilisateurs
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
      });
    });

    return users;
  } catch (error) {
    console.error('Error fetching all users for list:', error);
    throw error;
  }
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
