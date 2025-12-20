/**
 * Service d'annulation des achats
 * Permet d'annuler un achat et de liberer le stock
 */

import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Purchase } from '../types/user';

const USERS_COLLECTION = 'users';
const PURCHASES_SUBCOLLECTION = 'purchases';
const ACTION_HISTORY_SUBCOLLECTION = 'actionHistory';
const CONTRIBUTIONS_COLLECTION = 'contributions';

export interface CancelPurchaseResult {
    success: boolean;
    purchaseId: string;
    contributionDeleted: boolean;
    error?: string;
}

/**
 * Annule un achat
 * - Met le statut du purchase a "cancelled"
 * - Supprime la contribution correspondante (libere le stock)
 * - Ajoute une action dans l'historique
 */
export async function cancelPurchase(
    userId: string,
    purchaseId: string,
    adminId: string,
    reason?: string
): Promise<CancelPurchaseResult> {
    try {
        // 1. Recuperer le purchase
        const purchaseRef = doc(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION, purchaseId);
        const purchaseSnap = await getDoc(purchaseRef);

        if (!purchaseSnap.exists()) {
            return {
                success: false,
                purchaseId,
                contributionDeleted: false,
                error: 'Achat non trouve',
            };
        }

        const purchase = { id: purchaseSnap.id, ...purchaseSnap.data() } as Purchase;

        // Verifier si deja annule
        if (purchase.paymentStatus === 'cancelled') {
            return {
                success: false,
                purchaseId,
                contributionDeleted: false,
                error: 'Achat deja annule',
            };
        }

        // 2. Mettre a jour le purchase en cancelled
        const now = Timestamp.now();
        await updateDoc(purchaseRef, {
            paymentStatus: 'cancelled',
            cancelledAt: now,
            cancelledBy: adminId,
            cancellationReason: reason || 'Annule par admin',
        });

        // 3. Supprimer la contribution correspondante (si elle existe)
        let contributionDeleted = false;
        if (purchase.contributionId) {
            try {
                const contributionRef = doc(db, CONTRIBUTIONS_COLLECTION, purchase.contributionId);
                const contributionSnap = await getDoc(contributionRef);

                if (contributionSnap.exists()) {
                    await deleteDoc(contributionRef);
                    contributionDeleted = true;
                    console.log(`✅ Contribution ${purchase.contributionId} supprimee (stock libere)`);
                }
            } catch (err) {
                console.warn('⚠️ Impossible de supprimer la contribution:', err);
            }
        }

        // 4. Ajouter une action dans l'historique
        try {
            const actionHistoryRef = collection(db, USERS_COLLECTION, userId, ACTION_HISTORY_SUBCOLLECTION);
            await addDoc(actionHistoryRef, {
                actionType: 'purchase_cancelled',
                details: {
                    purchaseId,
                    itemName: purchase.itemName,
                    amount: purchase.amount,
                    reason: reason || 'Annule par admin',
                    contributionDeleted,
                },
                performedBy: adminId,
                timestamp: now,
            });
        } catch (err) {
            console.warn('⚠️ Impossible d\'ajouter l\'action dans l\'historique:', err);
        }

        console.log(`✅ Achat ${purchaseId} annule pour user ${userId}`);

        return {
            success: true,
            purchaseId,
            contributionDeleted,
        };
    } catch (error: any) {
        console.error('❌ Erreur lors de l\'annulation:', error);
        return {
            success: false,
            purchaseId,
            contributionDeleted: false,
            error: error.message || 'Erreur inconnue',
        };
    }
}

/**
 * Verifie si un achat peut etre annule
 */
export function canCancelPurchase(purchase: Purchase): { canCancel: boolean; reason?: string } {
    if (purchase.paymentStatus === 'cancelled') {
        return { canCancel: false, reason: 'Deja annule' };
    }
    if (purchase.paymentStatus === 'refunded') {
        return { canCancel: false, reason: 'Deja rembourse' };
    }
    return { canCancel: true };
}
