/**
 * Service de migration des achats
 * Lie les contributions existantes aux utilisateurs par email
 */

import { collection, getDocs, addDoc, query, where, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const CONTRIBUTIONS_COLLECTION = 'contributions';
const USERS_COLLECTION = 'users';
const PURCHASES_SUBCOLLECTION = 'purchases';

export interface MigrationResult {
    totalContributions: number;
    matched: number;
    notFound: number;
    alreadyMigrated: number;
    errors: number;
    logs: string[];
}

async function getUserByEmail(email: string): Promise<{ id: string } | null> {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    return { id: snapshot.docs[0].id };
}

async function checkPurchaseExists(userId: string, contributionId: string): Promise<boolean> {
    const purchasesRef = collection(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION);
    const q = query(purchasesRef, where('contributionId', '==', contributionId), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

async function createPurchase(
    userId: string,
    contribution: {
        id: string;
        itemName: string;
        amount: number;
        type: string;
        paymentId?: string;
        paymentStatus?: string;
        createdAt: any;
        paidAt?: any;
    }
): Promise<string> {
    const purchasesRef = collection(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION);

    const purchaseData = {
        type: contribution.type === 'pass' ? 'crowdfunding' : 'donation',
        source: 'crowdfunding',
        itemName: contribution.itemName,
        amount: contribution.amount,
        paymentId: contribution.paymentId || contribution.id, // Fallback to contribution ID
        paymentStatus: contribution.paymentStatus === 'completed' ? 'completed' : 'pending',
        contributionId: contribution.id,
        purchasedAt: contribution.paidAt || contribution.createdAt,
        createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(purchasesRef, purchaseData);
    return docRef.id;
}

/**
 * Migre les contributions existantes vers les purchases des utilisateurs
 * @param dryRun Si true, ne fait que simuler sans creer les purchases
 * @param onProgress Callback pour suivre la progression
 */
export async function migrateContributionsToPurchases(
    dryRun: boolean = false,
    onProgress?: (current: number, total: number, log: string) => void
): Promise<MigrationResult> {
    const result: MigrationResult = {
        totalContributions: 0,
        matched: 0,
        notFound: 0,
        alreadyMigrated: 0,
        errors: 0,
        logs: [],
    };

    const addLog = (message: string) => {
        result.logs.push(message);
        console.log(message);
    };

    try {
        addLog('📥 Recuperation des contributions...');

        const contributionsRef = collection(db, CONTRIBUTIONS_COLLECTION);
        const snapshot = await getDocs(contributionsRef);

        result.totalContributions = snapshot.size;
        addLog(`   ${result.totalContributions} contributions trouvees`);

        if (result.totalContributions === 0) {
            addLog('ℹ️ Aucune contribution a migrer');
            return result;
        }

        let processed = 0;

        for (const doc of snapshot.docs) {
            const contribution = { id: doc.id, ...doc.data() } as any;
            const email = contribution.contributor?.email;

            processed++;
            onProgress?.(processed, result.totalContributions, `Traitement de ${email || 'N/A'}...`);

            if (!email) {
                addLog(`⚠️ [${contribution.id}] Pas d'email, skip`);
                result.errors++;
                continue;
            }

            // Trouver l'utilisateur par email
            const user = await getUserByEmail(email);

            if (!user) {
                addLog(`❌ [${contribution.id}] User non trouve: ${email}`);
                result.notFound++;
                continue;
            }

            // Verifier si deja migre
            const exists = await checkPurchaseExists(user.id, contribution.id);
            if (exists) {
                addLog(`⏭️ [${contribution.id}] Deja migre: ${email}`);
                result.alreadyMigrated++;
                continue;
            }

            // Creer le purchase
            if (dryRun) {
                addLog(`✅ [DRY-RUN] Creerait purchase pour: ${email} (${contribution.itemName} - ${contribution.amount}€)`);
            } else {
                try {
                    const purchaseId = await createPurchase(user.id, contribution);
                    addLog(`✅ Purchase ${purchaseId} cree pour: ${email} (${contribution.itemName} - ${contribution.amount}€)`);
                } catch (err) {
                    addLog(`❌ Erreur pour ${email}: ${err}`);
                    result.errors++;
                    continue;
                }
            }

            result.matched++;
        }

        addLog('');
        addLog('═'.repeat(50));
        addLog('📊 RESUME');
        addLog('═'.repeat(50));
        addLog(`   Total contributions: ${result.totalContributions}`);
        addLog(`   ✅ Migres: ${result.matched}`);
        addLog(`   ⏭️ Deja migres: ${result.alreadyMigrated}`);
        addLog(`   ❌ Users non trouves: ${result.notFound}`);
        addLog(`   ⚠️ Erreurs: ${result.errors}`);

        if (dryRun && result.matched > 0) {
            addLog('');
            addLog('💡 Executez sans dry-run pour creer les purchases');
        }

    } catch (error) {
        addLog(`❌ Erreur fatale: ${error}`);
        throw error;
    }

    return result;
}
