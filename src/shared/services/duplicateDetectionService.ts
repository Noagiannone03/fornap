import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    addDoc,
    query,
    orderBy,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
    User,
    UserListItem,
    CurrentMembership,
    UserStatus,
    RegistrationInfo,
    ExtendedProfile,
    ActionHistory,
    MembershipHistory,
    Purchase,
} from '../types/user';

const USERS_COLLECTION = 'users';
const ACTION_HISTORY_SUBCOLLECTION = 'actionHistory';
const MEMBERSHIP_HISTORY_SUBCOLLECTION = 'membershipHistory';
const PURCHASES_SUBCOLLECTION = 'purchases';

// ============================================================================
// TYPES
// ============================================================================

export interface DuplicateGroup {
    email: string;
    users: UserListItem[];
}

export interface UserMergeData {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    postalCode: string;
    birthDate?: Timestamp | null;
    createdAt?: Timestamp | null;
    currentMembership: CurrentMembership;
    loyaltyPoints: number;
    status: UserStatus;
    registration: RegistrationInfo;
    extendedProfile?: ExtendedProfile;
    // Achats sélectionnés: IDs des achats à conserver du compte gardé
    purchaseIdsToKeep: string[];
    // Achats sélectionnés: IDs des achats à transférer depuis le compte supprimé
    purchaseIdsToTransfer: string[];
}

export interface FullUserDetails {
    user: User;
    purchases: Purchase[];
    actionHistory: ActionHistory[];
    membershipHistory: MembershipHistory[];
}

// ============================================================================
// DETECTION DES DOUBLONS
// ============================================================================

/**
 * Detecte tous les utilisateurs ayant le meme email
 * Retourne uniquement les groupes avec 2+ utilisateurs
 */
export async function findDuplicateUsers(): Promise<DuplicateGroup[]> {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const querySnapshot = await getDocs(usersRef);

        // Grouper par email (en minuscules pour comparaison)
        const emailGroups = new Map<string, UserListItem[]>();

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as User;
            const email = (data.email || '').toLowerCase().trim();

            // Ignorer les utilisateurs deja fusionnes (soft deleted)
            if (data.isMergedDuplicate === true) {
                return;
            }

            if (!email || email.includes('unknown') || email.includes('legacy')) {
                return; // Ignorer les emails invalides
            }

            const userListItem: UserListItem = {
                uid: docSnap.id,
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
                createdAt: data.createdAt || Timestamp.now(),
                isAccountBlocked: data.status?.isAccountBlocked || false,
                isCardBlocked: data.status?.isCardBlocked || false,
                registrationSource: data.registration?.source || 'platform',
                isLegacy: false,
                emailStatus: data.emailStatus,
            };

            if (!emailGroups.has(email)) {
                emailGroups.set(email, []);
            }
            emailGroups.get(email)!.push(userListItem);
        });

        // Filtrer pour ne garder que les doublons (2+ utilisateurs)
        const duplicates: DuplicateGroup[] = [];
        emailGroups.forEach((users, email) => {
            if (users.length >= 2) {
                // Trier par date de creation (plus ancien en premier)
                users.sort((a, b) => {
                    const aTime = a.createdAt?.seconds || 0;
                    const bTime = b.createdAt?.seconds || 0;
                    return aTime - bTime;
                });
                duplicates.push({ email, users });
            }
        });

        console.log(`Found ${duplicates.length} duplicate groups`);
        return duplicates;
    } catch (error) {
        console.error('Error finding duplicate users:', error);
        throw error;
    }
}

// ============================================================================
// RECUPERATION DES DETAILS COMPLETS
// ============================================================================

/**
 * Recupere les details complets d'un utilisateur incluant les sous-collections
 */
export async function getFullUserDetails(userId: string): Promise<FullUserDetails | null> {
    try {
        // 1. Recuperer le document utilisateur principal
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return null;
        }

        const user = { ...userDoc.data(), uid: userDoc.id } as User;

        // 2. Recuperer les achats
        const purchasesRef = collection(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION);
        const purchasesQuery = query(purchasesRef, orderBy('purchasedAt', 'desc'));
        const purchasesSnapshot = await getDocs(purchasesQuery);
        const purchases: Purchase[] = [];
        purchasesSnapshot.forEach((docSnap) => {
            purchases.push({ ...docSnap.data(), id: docSnap.id } as Purchase);
        });

        // 3. Recuperer l'historique d'actions
        const actionHistoryRef = collection(db, USERS_COLLECTION, userId, ACTION_HISTORY_SUBCOLLECTION);
        const actionHistoryQuery = query(actionHistoryRef, orderBy('timestamp', 'desc'));
        const actionHistorySnapshot = await getDocs(actionHistoryQuery);
        const actionHistory: ActionHistory[] = [];
        actionHistorySnapshot.forEach((docSnap) => {
            actionHistory.push({ ...docSnap.data(), id: docSnap.id } as ActionHistory);
        });

        // 4. Recuperer l'historique d'abonnement
        const membershipHistoryRef = collection(db, USERS_COLLECTION, userId, MEMBERSHIP_HISTORY_SUBCOLLECTION);
        const membershipHistoryQuery = query(membershipHistoryRef, orderBy('startDate', 'desc'));
        const membershipHistorySnapshot = await getDocs(membershipHistoryQuery);
        const membershipHistory: MembershipHistory[] = [];
        membershipHistorySnapshot.forEach((docSnap) => {
            membershipHistory.push({ ...docSnap.data(), id: docSnap.id } as MembershipHistory);
        });

        return {
            user,
            purchases,
            actionHistory,
            membershipHistory,
        };
    } catch (error) {
        console.error('Error getting full user details:', error);
        throw error;
    }
}

// ============================================================================
// FUSION DES UTILISATEURS
// ============================================================================

/**
 * Fusionne deux utilisateurs en un seul
 * Au lieu de supprimer le doublon, on le marque comme "fusionne" avec une reference vers l'utilisateur conserve.
 * Cela permet aux scans QR de rediriger vers le bon utilisateur.
 * 
 * @param keepUserId - ID de l'utilisateur a conserver
 * @param deleteUserId - ID de l'utilisateur a marquer comme fusionne
 * @param mergeData - Donnees fusionnees a appliquer
 * @param adminUserId - ID de l'admin qui effectue la fusion
 */
export async function mergeUsers(
    keepUserId: string,
    deleteUserId: string,
    mergeData: UserMergeData,
    adminUserId: string
): Promise<void> {
    try {
        console.log(`Merging user ${deleteUserId} into ${keepUserId}`);

        // 1. Mettre a jour l'utilisateur conserve avec les donnees fusionnees
        const keepUserRef = doc(db, USERS_COLLECTION, keepUserId);

        // Nettoyer les champs undefined
        const cleanMergeData: Record<string, any> = {
            email: mergeData.email,
            firstName: mergeData.firstName,
            lastName: mergeData.lastName,
            phone: mergeData.phone,
            postalCode: mergeData.postalCode,
            currentMembership: mergeData.currentMembership,
            loyaltyPoints: mergeData.loyaltyPoints,
            status: mergeData.status,
            registration: mergeData.registration,
            updatedAt: Timestamp.now(),
        };

        if (mergeData.birthDate) {
            cleanMergeData.birthDate = mergeData.birthDate;
        }

        if (mergeData.createdAt) {
            cleanMergeData.createdAt = mergeData.createdAt;
        }

        if (mergeData.extendedProfile) {
            cleanMergeData.extendedProfile = mergeData.extendedProfile;
        }

        await updateDoc(keepUserRef, cleanMergeData);

        // 2. Gérer les achats du compte gardé (supprimer ceux non sélectionnés)
        await deleteUnselectedPurchases(keepUserId, mergeData.purchaseIdsToKeep);

        // 3. Transférer uniquement les achats sélectionnés du compte supprimé
        await transferSelectedPurchases(deleteUserId, keepUserId, mergeData.purchaseIdsToTransfer);

        // 4. Transférer l'historique (toujours tout transférer pour garder la trace)
        await transferHistorySubcollections(deleteUserId, keepUserId);

        // 5. Ajouter une entree dans l'historique d'actions du compte conserve
        const actionHistoryRef = collection(db, USERS_COLLECTION, keepUserId, ACTION_HISTORY_SUBCOLLECTION);
        await addDoc(actionHistoryRef, {
            actionType: 'profile_update',
            details: {
                fieldUpdated: 'account_merge',
                oldValue: deleteUserId,
                newValue: keepUserId,
                updatedBy: adminUserId,
                reason: `Fusion de compte doublon (${deleteUserId}) vers ce compte`,
            },
            timestamp: Timestamp.now(),
            notes: `Compte ${deleteUserId} fusionne par admin ${adminUserId}`,
        });

        // 6. SOFT DELETE: Marquer le doublon comme fusionne au lieu de le supprimer
        // Cela permet aux scans QR de rediriger vers le bon utilisateur
        await softDeleteMergedUser(deleteUserId, keepUserId, adminUserId);

        console.log(`Successfully merged user ${deleteUserId} into ${keepUserId}`);
    } catch (error) {
        console.error('Error merging users:', error);
        throw error;
    }
}

/**
 * Marque un utilisateur comme fusionne (soft delete)
 * Garde une reference vers l'utilisateur cible pour les redirections de scan QR
 */
async function softDeleteMergedUser(
    mergedUserId: string,
    targetUserId: string,
    adminUserId: string
): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, mergedUserId);

    // Supprimer les sous-collections du doublon (deja transferees)
    await deleteUserSubcollections(mergedUserId);

    // Mettre a jour le document avec les infos de fusion (soft delete)
    await updateDoc(userRef, {
        // Marquer comme doublon fusionne
        isMergedDuplicate: true,
        mergedIntoUserId: targetUserId,
        mergedAt: Timestamp.now(),
        mergedBy: adminUserId,
        // Bloquer le compte
        'status.isAccountBlocked': true,
        'status.isCardBlocked': true,
        'status.blockedReason': `Compte fusionne vers ${targetUserId}`,
        'status.blockedAt': Timestamp.now(),
        // Mettre a jour le timestamp
        updatedAt: Timestamp.now(),
    });
}

/**
 * Supprime uniquement les sous-collections d'un utilisateur (pas le document principal)
 */
async function deleteUserSubcollections(userId: string): Promise<void> {
    const subcollections = [
        PURCHASES_SUBCOLLECTION,
        ACTION_HISTORY_SUBCOLLECTION,
        MEMBERSHIP_HISTORY_SUBCOLLECTION,
    ];

    for (const subcollection of subcollections) {
        const subcollectionRef = collection(db, USERS_COLLECTION, userId, subcollection);
        const snapshot = await getDocs(subcollectionRef);

        if (snapshot.empty) continue;

        const batch = writeBatch(db);
        let count = 0;

        for (const docSnap of snapshot.docs) {
            batch.delete(docSnap.ref);
            count++;

            if (count >= 450) {
                await batch.commit();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
        }
    }
}

/**
 * Supprime les achats non sélectionnés du compte gardé
 */
async function deleteUnselectedPurchases(userId: string, selectedPurchaseIds: string[]): Promise<void> {
    const purchasesRef = collection(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION);
    const snapshot = await getDocs(purchasesRef);

    if (snapshot.empty) return;

    const selectedSet = new Set(selectedPurchaseIds);
    const batch = writeBatch(db);
    let count = 0;

    for (const docSnap of snapshot.docs) {
        // Supprimer seulement si non sélectionné
        if (!selectedSet.has(docSnap.id)) {
            batch.delete(docSnap.ref);
            count++;

            if (count >= 450) {
                await batch.commit();
                count = 0;
            }
        }
    }

    if (count > 0) {
        await batch.commit();
    }
}

/**
 * Transfère uniquement les achats sélectionnés du compte source vers le compte cible
 */
async function transferSelectedPurchases(
    fromUserId: string,
    toUserId: string,
    selectedPurchaseIds: string[]
): Promise<void> {
    if (selectedPurchaseIds.length === 0) return;

    const selectedSet = new Set(selectedPurchaseIds);
    const purchasesRef = collection(db, USERS_COLLECTION, fromUserId, PURCHASES_SUBCOLLECTION);
    const snapshot = await getDocs(purchasesRef);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    let count = 0;

    for (const docSnap of snapshot.docs) {
        // Transférer seulement si sélectionné
        if (selectedSet.has(docSnap.id)) {
            const newDocRef = doc(db, USERS_COLLECTION, toUserId, PURCHASES_SUBCOLLECTION, docSnap.id);
            batch.set(newDocRef, {
                ...docSnap.data(),
                mergedFrom: fromUserId,
                mergedAt: Timestamp.now(),
            });
            count++;

            if (count >= 450) {
                await batch.commit();
                count = 0;
            }
        }
    }

    if (count > 0) {
        await batch.commit();
    }
}

/**
 * Transfère l'historique d'actions et d'abonnement (sans les achats)
 */
async function transferHistorySubcollections(fromUserId: string, toUserId: string): Promise<void> {
    const batch = writeBatch(db);
    let operationCount = 0;
    const MAX_BATCH_SIZE = 450;

    const commitBatchIfNeeded = async () => {
        if (operationCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            operationCount = 0;
        }
    };

    // Transférer l'historique d'actions
    const actionHistoryRef = collection(db, USERS_COLLECTION, fromUserId, ACTION_HISTORY_SUBCOLLECTION);
    const actionHistorySnapshot = await getDocs(actionHistoryRef);

    for (const docSnap of actionHistorySnapshot.docs) {
        const newDocRef = doc(db, USERS_COLLECTION, toUserId, ACTION_HISTORY_SUBCOLLECTION, docSnap.id);
        batch.set(newDocRef, {
            ...docSnap.data(),
            mergedFrom: fromUserId,
            mergedAt: Timestamp.now(),
        });
        operationCount++;
        await commitBatchIfNeeded();
    }

    // Transférer l'historique d'abonnement
    const membershipHistoryRef = collection(db, USERS_COLLECTION, fromUserId, MEMBERSHIP_HISTORY_SUBCOLLECTION);
    const membershipHistorySnapshot = await getDocs(membershipHistoryRef);

    for (const docSnap of membershipHistorySnapshot.docs) {
        const newDocRef = doc(db, USERS_COLLECTION, toUserId, MEMBERSHIP_HISTORY_SUBCOLLECTION, docSnap.id);
        batch.set(newDocRef, {
            ...docSnap.data(),
            mergedFrom: fromUserId,
            mergedAt: Timestamp.now(),
        });
        operationCount++;
        await commitBatchIfNeeded();
    }

    if (operationCount > 0) {
        await batch.commit();
    }
}
