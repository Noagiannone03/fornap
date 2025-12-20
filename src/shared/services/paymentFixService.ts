/**
 * Service pour corriger les statuts de paiement
 * Met tous les paiements en "paid"/"completed"
 */

import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const CONTRIBUTIONS_COLLECTION = 'contributions';
const USERS_COLLECTION = 'users';
const PURCHASES_SUBCOLLECTION = 'purchases';

export interface PaymentFixResult {
    contributionsFixed: number;
    purchasesFixed: number;
    usersProcessed: number;
    errors: number;
    logs: string[];
}

/**
 * Corrige tous les statuts de paiement en "paid"/"completed"
 * @param dryRun Si true, ne fait que simuler sans modifier
 * @param onProgress Callback pour suivre la progression
 */
export async function fixAllPaymentStatuses(
    dryRun: boolean = false,
    onProgress?: (log: string) => void
): Promise<PaymentFixResult> {
    const result: PaymentFixResult = {
        contributionsFixed: 0,
        purchasesFixed: 0,
        usersProcessed: 0,
        errors: 0,
        logs: [],
    };

    const addLog = (message: string) => {
        result.logs.push(message);
        console.log(message);
        onProgress?.(message);
    };

    try {
        // === PARTIE 1: Fixer les contributions ===
        addLog('📥 Recuperation des contributions...');

        const contributionsRef = collection(db, CONTRIBUTIONS_COLLECTION);
        const contributionsSnapshot = await getDocs(contributionsRef);

        addLog(`   ${contributionsSnapshot.size} contributions trouvees`);

        for (const docSnap of contributionsSnapshot.docs) {
            const data = docSnap.data();

            // Verifier si deja en paid/completed
            if (data.paymentStatus === 'paid' || data.paymentStatus === 'completed') {
                continue;
            }

            if (dryRun) {
                addLog(`✅ [DRY-RUN] Contribution ${docSnap.id}: ${data.paymentStatus} -> paid`);
            } else {
                try {
                    const contributionRef = doc(db, CONTRIBUTIONS_COLLECTION, docSnap.id);
                    await updateDoc(contributionRef, {
                        paymentStatus: 'paid',
                        paidAt: data.paidAt || Timestamp.now(),
                    });
                    addLog(`✅ Contribution ${docSnap.id}: ${data.paymentStatus} -> paid`);
                } catch (err) {
                    addLog(`❌ Erreur contribution ${docSnap.id}: ${err}`);
                    result.errors++;
                    continue;
                }
            }
            result.contributionsFixed++;
        }

        // === PARTIE 2: Fixer les purchases dans les users ===
        addLog('');
        addLog('📥 Recuperation des utilisateurs...');

        const usersRef = collection(db, USERS_COLLECTION);
        const usersSnapshot = await getDocs(usersRef);

        addLog(`   ${usersSnapshot.size} utilisateurs trouves`);

        for (const userDoc of usersSnapshot.docs) {
            result.usersProcessed++;

            // Recuperer les purchases de cet utilisateur
            const purchasesRef = collection(db, USERS_COLLECTION, userDoc.id, PURCHASES_SUBCOLLECTION);
            const purchasesSnapshot = await getDocs(purchasesRef);

            for (const purchaseDoc of purchasesSnapshot.docs) {
                const purchaseData = purchaseDoc.data();

                // Verifier si deja en completed
                if (purchaseData.paymentStatus === 'completed') {
                    continue;
                }

                if (dryRun) {
                    addLog(`✅ [DRY-RUN] Purchase ${purchaseDoc.id} (user ${userDoc.id}): ${purchaseData.paymentStatus} -> completed`);
                } else {
                    try {
                        const purchaseRef = doc(db, USERS_COLLECTION, userDoc.id, PURCHASES_SUBCOLLECTION, purchaseDoc.id);
                        await updateDoc(purchaseRef, {
                            paymentStatus: 'completed',
                        });
                        addLog(`✅ Purchase ${purchaseDoc.id}: ${purchaseData.paymentStatus} -> completed`);
                    } catch (err) {
                        addLog(`❌ Erreur purchase ${purchaseDoc.id}: ${err}`);
                        result.errors++;
                        continue;
                    }
                }
                result.purchasesFixed++;
            }

            // === PARTIE 3: Fixer le currentMembership.paymentStatus ===
            const userData = userDoc.data();
            if (userData.currentMembership && userData.currentMembership.paymentStatus !== 'paid') {
                if (dryRun) {
                    addLog(`✅ [DRY-RUN] User ${userDoc.id} membership: ${userData.currentMembership.paymentStatus} -> paid`);
                } else {
                    try {
                        const userRef = doc(db, USERS_COLLECTION, userDoc.id);
                        await updateDoc(userRef, {
                            'currentMembership.paymentStatus': 'paid',
                            'currentMembership.status': 'active',
                        });
                    } catch (err) {
                        addLog(`❌ Erreur user membership ${userDoc.id}: ${err}`);
                        result.errors++;
                    }
                }
            }

            // Retirer le tag PENDING_PAYMENT si present
            if (userData.status?.tags?.includes('PENDING_PAYMENT')) {
                if (!dryRun) {
                    try {
                        const userRef = doc(db, USERS_COLLECTION, userDoc.id);
                        const newTags = userData.status.tags.filter((t: string) => t !== 'PENDING_PAYMENT');
                        await updateDoc(userRef, {
                            'status.tags': newTags,
                        });
                    } catch (err) {
                        // Ignore tag errors
                    }
                }
            }
        }

        // Resume
        addLog('');
        addLog('═'.repeat(50));
        addLog('📊 RESUME');
        addLog('═'.repeat(50));
        addLog(`   Contributions fixees: ${result.contributionsFixed}`);
        addLog(`   Purchases fixes: ${result.purchasesFixed}`);
        addLog(`   Users traites: ${result.usersProcessed}`);
        addLog(`   Erreurs: ${result.errors}`);

        if (dryRun && (result.contributionsFixed > 0 || result.purchasesFixed > 0)) {
            addLog('');
            addLog('💡 Executez sans dry-run pour appliquer les corrections');
        }

    } catch (error) {
        addLog(`❌ Erreur fatale: ${error}`);
        throw error;
    }

    return result;
}
