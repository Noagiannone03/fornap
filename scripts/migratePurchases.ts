/**
 * Migration Script: Link Existing Contributions to Users
 * ========================================================
 * 
 * This script:
 * 1. Fetches all documents from the `contributions` collection
 * 2. For each contribution, finds the corresponding user by email
 * 3. Creates a purchase entry in that user's `purchases` subcollection
 * 4. Logs results (matched, not found, already migrated)
 * 
 * Usage:
 *   npx ts-node scripts/migratePurchases.ts [--dry-run]
 * 
 * Options:
 *   --dry-run   Preview what would be migrated without making changes
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    // You need to set the path to your service account key file
    // or use environment variables for production
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (serviceAccountPath) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(serviceAccountPath);
        initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        // For local development, use the default credentials
        initializeApp();
    }
}

const db = getFirestore();

interface ContributionDoc {
    id: string;
    itemName: string;
    amount: number;
    type: 'donation' | 'pass';
    contributor: {
        email: string;
        nom: string;
        prenom: string;
        pseudo?: string;
        codePostal?: string;
        telephone?: string;
        naissance?: string;
        commentaire?: string;
    };
    isMember: boolean;
    membershipType: 'monthly' | 'annual' | null;
    paymentId: string;
    paymentStatus: string;
    createdAt: Timestamp;
    paidAt?: Timestamp;
    userAgent?: string;
    ipAddress?: string;
}

interface MigrationResult {
    totalContributions: number;
    matched: number;
    notFound: number;
    alreadyMigrated: number;
    errors: number;
    details: {
        contributionId: string;
        email: string;
        status: 'matched' | 'not_found' | 'already_migrated' | 'error';
        userId?: string;
        error?: string;
    }[];
}

async function getUserByEmail(email: string): Promise<{ id: string } | null> {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
        return null;
    }

    return { id: snapshot.docs[0].id };
}

async function checkPurchaseExists(userId: string, contributionId: string): Promise<boolean> {
    const purchasesRef = db.collection('users').doc(userId).collection('purchases');
    const snapshot = await purchasesRef.where('contributionId', '==', contributionId).limit(1).get();
    return !snapshot.empty;
}

async function createPurchase(
    userId: string,
    contribution: ContributionDoc
): Promise<string> {
    const purchasesRef = db.collection('users').doc(userId).collection('purchases');

    const purchaseData = {
        type: contribution.type === 'pass' ? 'crowdfunding' : 'donation',
        source: 'crowdfunding',
        itemName: contribution.itemName,
        amount: contribution.amount,
        paymentId: contribution.paymentId,
        paymentStatus: contribution.paymentStatus === 'completed' ? 'completed' : 'pending',
        contributionId: contribution.id,
        purchasedAt: contribution.paidAt || contribution.createdAt,
        createdAt: Timestamp.now(),
    };

    const docRef = await purchasesRef.add(purchaseData);
    return docRef.id;
}

async function migrateContributionsToPurchases(dryRun: boolean = false): Promise<MigrationResult> {
    console.log('='.repeat(60));
    console.log(dryRun ? '🔍 DRY RUN MODE - No changes will be made' : '🚀 MIGRATION MODE - Creating purchases');
    console.log('='.repeat(60));
    console.log('');

    const result: MigrationResult = {
        totalContributions: 0,
        matched: 0,
        notFound: 0,
        alreadyMigrated: 0,
        errors: 0,
        details: [],
    };

    try {
        // Fetch all contributions
        console.log('📥 Fetching contributions...');
        const contributionsRef = db.collection('contributions');
        const snapshot = await contributionsRef.get();

        result.totalContributions = snapshot.size;
        console.log(`   Found ${result.totalContributions} contributions`);
        console.log('');

        // Process each contribution
        for (const doc of snapshot.docs) {
            const contribution = { id: doc.id, ...doc.data() } as ContributionDoc;
            const email = contribution.contributor?.email;

            if (!email) {
                console.log(`⚠️  [${contribution.id}] No email found, skipping`);
                result.errors++;
                result.details.push({
                    contributionId: contribution.id,
                    email: 'N/A',
                    status: 'error',
                    error: 'No email in contribution',
                });
                continue;
            }

            // Find user by email
            const user = await getUserByEmail(email);

            if (!user) {
                console.log(`❌ [${contribution.id}] User not found for: ${email}`);
                result.notFound++;
                result.details.push({
                    contributionId: contribution.id,
                    email,
                    status: 'not_found',
                });
                continue;
            }

            // Check if already migrated
            const exists = await checkPurchaseExists(user.id, contribution.id);
            if (exists) {
                console.log(`⏭️  [${contribution.id}] Already migrated for: ${email}`);
                result.alreadyMigrated++;
                result.details.push({
                    contributionId: contribution.id,
                    email,
                    status: 'already_migrated',
                    userId: user.id,
                });
                continue;
            }

            // Create purchase
            if (dryRun) {
                console.log(`✅ [${contribution.id}] Would create purchase for: ${email} (${contribution.itemName} - ${contribution.amount}€)`);
            } else {
                try {
                    const purchaseId = await createPurchase(user.id, contribution);
                    console.log(`✅ [${contribution.id}] Created purchase ${purchaseId} for: ${email} (${contribution.itemName} - ${contribution.amount}€)`);
                } catch (err) {
                    console.error(`❌ [${contribution.id}] Error creating purchase for ${email}:`, err);
                    result.errors++;
                    result.details.push({
                        contributionId: contribution.id,
                        email,
                        status: 'error',
                        userId: user.id,
                        error: String(err),
                    });
                    continue;
                }
            }

            result.matched++;
            result.details.push({
                contributionId: contribution.id,
                email,
                status: 'matched',
                userId: user.id,
            });
        }

    } catch (error) {
        console.error('Fatal error during migration:', error);
        throw error;
    }

    // Print summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Total contributions:  ${result.totalContributions}`);
    console.log(`   ✅ Matched/Created:   ${result.matched}`);
    console.log(`   ⏭️  Already migrated:  ${result.alreadyMigrated}`);
    console.log(`   ❌ Users not found:   ${result.notFound}`);
    console.log(`   ⚠️  Errors:            ${result.errors}`);
    console.log('='.repeat(60));

    if (dryRun && result.matched > 0) {
        console.log('');
        console.log('💡 Run without --dry-run to create these purchases');
    }

    return result;
}

// Main execution
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

migrateContributionsToPurchases(isDryRun)
    .then((result) => {
        console.log('');
        console.log('Migration complete!');
        process.exit(result.errors > 0 ? 1 : 0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
