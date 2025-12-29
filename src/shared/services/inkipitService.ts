/**
 * Service de gestion de l'événement Inkipit (Soirée PACK PARTY HARDER)
 * Solution temporaire pour gérer les participants du crowdfunding
 */

import {
    collection,
    collectionGroup,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    query,
    where,
    Timestamp,
    addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const USERS_COLLECTION = 'users';
const PURCHASES_SUBCOLLECTION = 'purchases';
const ACTION_HISTORY_SUBCOLLECTION = 'actionHistory';

// Les deux variantes de nom utilisées dans le crowdfunding
// - ParticipationPage.vue utilise 'PACK PARTY HARDER'
// - InkipitPage.vue utilise '20€ - PACK PARTY HARDER - edition limitee'
const INKIPIT_ITEM_NAMES = [
    'PACK PARTY HARDER',
    '20€ - PACK PARTY HARDER - edition limitee',
];

// ============================================================================
// Types
// ============================================================================

export interface InkipitParticipant {
    // User info
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    birthDate?: Timestamp;
    postalCode?: string;

    // Purchase info
    purchaseId: string;
    contributionId?: string;
    amount: number;
    purchasedAt: Timestamp;
    paymentId?: string;
    paymentStatus: string;

    // Scan status (Inkipit specific)
    inkipitScanned: boolean;
    inkipitScannedAt?: Timestamp;
    inkipitScannedBy?: string;

    // Cancellation
    cancelled: boolean;
    cancelledAt?: Timestamp;
    cancelledBy?: string;
    cancellationReason?: string;

    // Membership
    hasActiveSubscription: boolean;
    membershipType?: string;
    membershipExpiry?: Timestamp;
}

export interface InkipitStats {
    totalSold: number;
    totalScanned: number;
    totalCancelled: number;
    totalRevenue: number;
    scanRate: number;
}

export type InkipitScanResultStatus =
    | 'SUCCESS'
    | 'USER_NOT_FOUND'
    | 'NO_TICKET'
    | 'TICKET_CANCELLED'
    | 'ALREADY_SCANNED'
    | 'SUBSCRIPTION_INACTIVE'
    | 'INVALID_QR';

export interface InkipitScanResult {
    status: InkipitScanResultStatus;
    message: string;
    participant?: InkipitParticipant;
    scannedAt?: Timestamp;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Vérifie si un abonnement est actif
 */
function isSubscriptionActive(userData: any): boolean {
    if (!userData.currentMembership) return false;
    if (userData.currentMembership.status !== 'active') return false;
    if (!userData.currentMembership.expiryDate) return true; // Lifetime ou pas d'expiration

    const expiry = userData.currentMembership.expiryDate;
    let expiryDate: Date;

    if (expiry.toDate) {
        expiryDate = expiry.toDate();
    } else if (expiry.seconds) {
        expiryDate = new Date(expiry.seconds * 1000);
    } else {
        expiryDate = new Date(expiry);
    }

    return expiryDate > new Date();
}

/**
 * Convertit un Timestamp Firestore en Date de manière sécurisée
 */
function toTimestamp(value: any): Timestamp | undefined {
    if (!value) return undefined;
    if (value instanceof Timestamp) return value;
    if (value.toDate) return value;
    if (value.seconds) return new Timestamp(value.seconds, value.nanoseconds || 0);
    return undefined;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Récupère tous les participants Inkipit (achats PACK PARTY HARDER)
 * Utilise Collection Group Query pour une performance optimale (pas besoin de scanner tous les users)
 * 
 * IMPORTANT: Nécessite un index Firestore sur la collection group 'purchases':
 * - Collection Group: purchases
 * - Field: itemName (Ascending)
 * 
 * Si l'index n'existe pas, Firestore affichera un lien pour le créer dans la console.
 */
export async function getInkipitParticipants(): Promise<InkipitParticipant[]> {
    const participants: InkipitParticipant[] = [];

    try {
        // Cache pour éviter de fetch le même user plusieurs fois
        const userCache = new Map<string, any>();

        // Faire une requête pour chaque variante de nom
        // (Firestore ne supporte pas 'in' sur collectionGroup avec plusieurs valeurs efficacement)
        for (const itemName of INKIPIT_ITEM_NAMES) {
            const purchasesQuery = query(
                collectionGroup(db, PURCHASES_SUBCOLLECTION),
                where('itemName', '==', itemName)
            );

            const purchasesSnapshot = await getDocs(purchasesQuery);
            console.log(`🔍 Trouvé ${purchasesSnapshot.docs.length} achats "${itemName}"`);

            for (const purchaseDoc of purchasesSnapshot.docs) {
                const purchaseData = purchaseDoc.data();

                // Extraire l'userId du path: users/{userId}/purchases/{purchaseId}
                const pathParts = purchaseDoc.ref.path.split('/');
                const userId = pathParts[1]; // users/[userId]/purchases/...

                // Récupérer les données user (avec cache)
                let userData = userCache.get(userId);
                if (!userData) {
                    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
                    if (userDoc.exists()) {
                        userData = userDoc.data();
                        userCache.set(userId, userData);
                    } else {
                        console.warn(`⚠️ User ${userId} non trouvé pour l'achat ${purchaseDoc.id}`);
                        continue;
                    }
                }

                participants.push({
                    userId,
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    phone: userData.phone,
                    birthDate: toTimestamp(userData.birthDate),
                    postalCode: userData.postalCode,

                    purchaseId: purchaseDoc.id,
                    contributionId: purchaseData.contributionId,
                    amount: purchaseData.amount || 20,
                    purchasedAt: toTimestamp(purchaseData.purchasedAt || purchaseData.createdAt) || Timestamp.now(),
                    paymentId: purchaseData.paymentId,
                    paymentStatus: purchaseData.paymentStatus || 'completed',

                    inkipitScanned: purchaseData.inkipitScanned || false,
                    inkipitScannedAt: toTimestamp(purchaseData.inkipitScannedAt),
                    inkipitScannedBy: purchaseData.inkipitScannedBy,

                    cancelled: purchaseData.paymentStatus === 'cancelled' || purchaseData.cancelled || false,
                    cancelledAt: toTimestamp(purchaseData.cancelledAt),
                    cancelledBy: purchaseData.cancelledBy,
                    cancellationReason: purchaseData.cancellationReason,

                    hasActiveSubscription: isSubscriptionActive(userData),
                    membershipType: userData.currentMembership?.planType,
                    membershipExpiry: toTimestamp(userData.currentMembership?.expiryDate),
                });
            }
        }

        // Trier par date d'achat (plus récent en premier)
        participants.sort((a, b) => {
            const dateA = a.purchasedAt?.toDate?.() || new Date(0);
            const dateB = b.purchasedAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        console.log(`✅ ${participants.length} participants Inkipit chargés au total`);
        return participants;
    } catch (error: any) {
        // Si l'erreur est liée à un index manquant, Firestore fournit un lien pour le créer
        if (error.message?.includes('index')) {
            console.error('❌ Index Firestore manquant. Suivez le lien dans l\'erreur pour le créer:', error.message);
        }
        console.error('❌ Erreur lors de la récupération des participants Inkipit:', error);
        throw error;
    }
}

/**
 * Récupère le billet Inkipit d'un utilisateur spécifique
 */
export async function getInkipitTicket(userId: string): Promise<InkipitParticipant | null> {
    try {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
        if (!userDoc.exists()) return null;

        const userData = userDoc.data();
        const purchasesRef = collection(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION);
        // Essayer de trouver un achat avec l'une des variantes du nom
        let purchasesSnap = await getDocs(query(purchasesRef, where('itemName', '==', INKIPIT_ITEM_NAMES[0])));
        if (purchasesSnap.empty) {
            purchasesSnap = await getDocs(query(purchasesRef, where('itemName', '==', INKIPIT_ITEM_NAMES[1])));
        }

        if (purchasesSnap.empty) return null;

        const purchaseDoc = purchasesSnap.docs[0];
        const purchaseData = purchaseDoc.data();

        return {
            userId,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: userData.phone,
            birthDate: toTimestamp(userData.birthDate),
            postalCode: userData.postalCode,

            purchaseId: purchaseDoc.id,
            contributionId: purchaseData.contributionId,
            amount: purchaseData.amount || 20,
            purchasedAt: toTimestamp(purchaseData.purchasedAt || purchaseData.createdAt) || Timestamp.now(),
            paymentId: purchaseData.paymentId,
            paymentStatus: purchaseData.paymentStatus || 'completed',

            inkipitScanned: purchaseData.inkipitScanned || false,
            inkipitScannedAt: toTimestamp(purchaseData.inkipitScannedAt),
            inkipitScannedBy: purchaseData.inkipitScannedBy,

            cancelled: purchaseData.paymentStatus === 'cancelled' || purchaseData.cancelled || false,
            cancelledAt: toTimestamp(purchaseData.cancelledAt),
            cancelledBy: purchaseData.cancelledBy,
            cancellationReason: purchaseData.cancellationReason,

            hasActiveSubscription: isSubscriptionActive(userData),
            membershipType: userData.currentMembership?.planType,
            membershipExpiry: toTimestamp(userData.currentMembership?.expiryDate),
        };
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du billet Inkipit:', error);
        throw error;
    }
}

/**
 * Scanner/Check-in un participant Inkipit
 * Appelé depuis le scanner QR existant en mode EVENT_WITH_TICKET
 */
export async function scanInkipitTicket(
    userId: string,
    scannerId: string
): Promise<InkipitScanResult> {
    try {
        // 1. Récupérer le user
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
        if (!userDoc.exists()) {
            return {
                status: 'USER_NOT_FOUND',
                message: 'Utilisateur introuvable dans la base de données',
            };
        }
        const userData = userDoc.data();

        // 2. Vérifier l'abonnement actif
        if (!isSubscriptionActive(userData)) {
            return {
                status: 'SUBSCRIPTION_INACTIVE',
                message: 'Abonnement inactif ou expiré',
            };
        }

        // 3. Chercher le billet PACK PARTY HARDER
        const purchasesRef = collection(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION);
        // Essayer de trouver un achat avec l'une des variantes du nom
        let purchasesSnap = await getDocs(query(purchasesRef, where('itemName', '==', INKIPIT_ITEM_NAMES[0])));
        if (purchasesSnap.empty) {
            purchasesSnap = await getDocs(query(purchasesRef, where('itemName', '==', INKIPIT_ITEM_NAMES[1])));
        }

        if (purchasesSnap.empty) {
            return {
                status: 'NO_TICKET',
                message: `Pas de billet PACK PARTY HARDER pour cet utilisateur`,
            };
        }

        const purchaseDoc = purchasesSnap.docs[0];
        const purchaseData = purchaseDoc.data();

        // 4. Vérifier annulation
        if (purchaseData.paymentStatus === 'cancelled' || purchaseData.cancelled) {
            return {
                status: 'TICKET_CANCELLED',
                message: `Billet annulé${purchaseData.cancellationReason ? `: ${purchaseData.cancellationReason}` : ''}`,
            };
        }

        // 5. Vérifier déjà scanné
        if (purchaseData.inkipitScanned) {
            const scannedAt = toTimestamp(purchaseData.inkipitScannedAt);
            return {
                status: 'ALREADY_SCANNED',
                message: `Déjà scanné le ${scannedAt?.toDate().toLocaleString('fr-FR') || 'date inconnue'}`,
                scannedAt,
            };
        }

        // 6. Marquer comme scanné
        const now = Timestamp.now();
        await updateDoc(doc(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION, purchaseDoc.id), {
            inkipitScanned: true,
            inkipitScannedAt: now,
            inkipitScannedBy: scannerId,
        });

        // 7. Ajouter à l'historique d'actions
        try {
            const actionHistoryRef = collection(db, USERS_COLLECTION, userId, ACTION_HISTORY_SUBCOLLECTION);
            await addDoc(actionHistoryRef, {
                actionType: 'event_checkin',
                details: {
                    eventName: 'Soirée Inkipit',
                    itemName: purchaseData.itemName,
                    purchaseId: purchaseDoc.id,
                    description: `Check-in Soirée Inkipit (${purchaseData.itemName})`,
                },
                performedBy: scannerId,
                timestamp: now,
                deviceType: 'scanner',
            });
        } catch (err) {
            console.warn('⚠️ Impossible d\'ajouter l\'action dans l\'historique:', err);
        }

        console.log(`✅ Scan Inkipit réussi pour ${userData.firstName} ${userData.lastName}`);

        // 8. Retourner le succès avec les infos du participant
        return {
            status: 'SUCCESS',
            message: `Bienvenue ${userData.firstName} ! Accès autorisé.`,
            scannedAt: now,
            participant: {
                userId,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || '',
                phone: userData.phone,
                purchaseId: purchaseDoc.id,
                amount: purchaseData.amount || 20,
                purchasedAt: toTimestamp(purchaseData.purchasedAt) || now,
                paymentStatus: purchaseData.paymentStatus,
                inkipitScanned: true,
                inkipitScannedAt: now,
                inkipitScannedBy: scannerId,
                cancelled: false,
                hasActiveSubscription: true,
                membershipType: userData.currentMembership?.planType,
            },
        };
    } catch (error: any) {
        console.error('❌ Erreur lors du scan Inkipit:', error);
        return {
            status: 'INVALID_QR',
            message: `Erreur: ${error.message || 'Erreur inconnue'}`,
        };
    }
}

/**
 * Annuler le scan d'un participant (enlever le check-in)
 */
export async function unscanInkipitTicket(
    userId: string,
    purchaseId: string,
    adminId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const purchaseRef = doc(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION, purchaseId);
        const purchaseSnap = await getDoc(purchaseRef);

        if (!purchaseSnap.exists()) {
            return { success: false, error: 'Billet non trouvé' };
        }

        const purchaseData = purchaseSnap.data();
        if (!purchaseData.inkipitScanned) {
            return { success: false, error: 'Ce billet n\'a pas été scanné' };
        }

        // Supprimer le scan
        await updateDoc(purchaseRef, {
            inkipitScanned: false,
            inkipitScannedAt: null,
            inkipitScannedBy: null,
        });

        // Ajouter à l'historique
        const now = Timestamp.now();
        const actionHistoryRef = collection(db, USERS_COLLECTION, userId, ACTION_HISTORY_SUBCOLLECTION);
        await addDoc(actionHistoryRef, {
            actionType: 'event_unscan',
            details: {
                eventName: 'Soirée Inkipit',
                itemName: purchaseData.itemName,
                purchaseId,
                reason: reason || 'Scan annulé par admin',
                description: `Annulation check-in Soirée Inkipit`,
            },
            performedBy: adminId,
            timestamp: now,
        });

        console.log(`✅ Scan Inkipit annulé pour user ${userId}`);
        return { success: true };
    } catch (error: any) {
        console.error('❌ Erreur lors de l\'annulation du scan:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Récupère les statistiques de l'événement Inkipit
 */
export async function getInkipitStats(): Promise<InkipitStats> {
    try {
        const participants = await getInkipitParticipants();

        const active = participants.filter((p) => !p.cancelled);
        const scanned = active.filter((p) => p.inkipitScanned);
        const cancelled = participants.filter((p) => p.cancelled);

        return {
            totalSold: active.length,
            totalScanned: scanned.length,
            totalCancelled: cancelled.length,
            totalRevenue: active.reduce((sum, p) => sum + p.amount, 0),
            scanRate: active.length > 0 ? (scanned.length / active.length) * 100 : 0,
        };
    } catch (error) {
        console.error('❌ Erreur lors du calcul des stats Inkipit:', error);
        return {
            totalSold: 0,
            totalScanned: 0,
            totalCancelled: 0,
            totalRevenue: 0,
            scanRate: 0,
        };
    }
}
