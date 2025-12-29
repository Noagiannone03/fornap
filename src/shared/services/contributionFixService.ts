/**
 * Service de correction des contributions
 * Verifie que chaque contribution avec membership a un document user associe
 * et que les achats sont bien dans la sous-collection purchases
 */

import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { MembershipType } from '../types/user';

const CONTRIBUTIONS_COLLECTION = 'contributions';
const USERS_COLLECTION = 'users';
const PURCHASES_SUBCOLLECTION = 'purchases';

// Date d'introduction du bug (23 decembre 2025)
const BUG_START_DATE = new Date('2025-12-23T00:00:00');

// Mapping des forfaits vers les types de membership (copie de crowdfunding)
const PASS_MEMBERSHIP_MAP: Record<string, { isMember: boolean; membershipType: MembershipType | null }> = {
  'Don libre': { isMember: false, membershipType: null },
  'PASS Love': { isMember: true, membershipType: 'monthly' },
  'PASS PIONNIER': { isMember: true, membershipType: 'annual' },
  'PASS SUMMER': { isMember: true, membershipType: 'annual' },
  'PACK WINTER': { isMember: true, membershipType: 'annual' },
  'PACK PARTY HARDER': { isMember: true, membershipType: 'annual' },
  'PACK AMBASSADEUR': { isMember: true, membershipType: 'annual' },
  'MEETING PASS': { isMember: true, membershipType: 'annual' },
  'COWORK PASS': { isMember: true, membershipType: 'annual' },
  'MANUFACTURE PASS': { isMember: true, membershipType: 'annual' },
  'PRIVATE PASS': { isMember: true, membershipType: 'annual' },
  'LES BÂTISSEURS du FORT': { isMember: true, membershipType: 'annual' },
};

// Noms de forfaits bugges qui auraient du creer un user
const BUGGED_PASS_NAMES = [
  '20€ - PACK PARTY HARDER - edition limitee',
];

export interface ContributionFixResult {
  totalContributions: number;
  usersCreated: number;
  purchasesAdded: number;
  alreadyOk: number;
  skipped: number;
  errors: number;
  logs: string[];
}

interface ContributionData {
  id: string;
  itemName: string;
  amount: number;
  type: 'donation' | 'pass';
  contributor: {
    email: string;
    nom: string;
    prenom: string;
    naissance?: string;
    codePostal?: string;
    telephone?: string;
    pseudo?: string;
  };
  isMember?: boolean;
  membershipType?: MembershipType | null;
  paymentId: string;
  paymentStatus: string;
  createdAt: Timestamp;
  paidAt?: Timestamp;
  userAgent?: string;
  ipAddress?: string;
}

function getMembershipInfo(itemName: string): { isMember: boolean; membershipType: MembershipType | null } {
  // Verifier d'abord les noms bugges
  if (BUGGED_PASS_NAMES.includes(itemName)) {
    return { isMember: true, membershipType: 'annual' };
  }
  return PASS_MEMBERSHIP_MAP[itemName] || { isMember: false, membershipType: null };
}

function shouldHaveUser(contribution: ContributionData): boolean {
  // Les dons libres et tips ne creent pas d'user
  const itemName = contribution.itemName.toLowerCase();
  if (itemName.includes('don libre') || itemName.includes('don supplementaire') || itemName.includes('tip')) {
    return false;
  }

  // Verifier via le mapping
  const info = getMembershipInfo(contribution.itemName);
  return info.isMember;
}

function calculateExpiryDate(startDate: Date, membershipType: MembershipType): Timestamp | null {
  if (!membershipType) return null;

  const expiryDate = new Date(startDate);
  if (membershipType === 'monthly') {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else if (membershipType === 'annual') {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }
  return Timestamp.fromDate(expiryDate);
}

function generatePlanId(passName: string, membershipType: MembershipType): string {
  if (membershipType === 'monthly') {
    return 'crowdfunding_monthly_2eur';
  } else if (membershipType === 'annual') {
    const cleanName = passName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return `crowdfunding_annual_${cleanName}`;
  }
  return 'crowdfunding_donation';
}

async function getUserByEmail(email: string): Promise<{ id: string } | null> {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where('email', '==', email.toLowerCase()), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Essayer aussi avec l'email original (casse differente)
    const q2 = query(usersRef, where('email', '==', email), limit(1));
    const snapshot2 = await getDocs(q2);
    if (snapshot2.empty) {
      return null;
    }
    return { id: snapshot2.docs[0].id };
  }

  return { id: snapshot.docs[0].id };
}

async function checkPurchaseExists(userId: string, contributionId: string): Promise<boolean> {
  const purchasesRef = collection(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION);
  const q = query(purchasesRef, where('contributionId', '==', contributionId), limit(1));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

async function createUserFromContribution(
  contribution: ContributionData,
  dryRun: boolean
): Promise<string | null> {
  const membershipInfo = getMembershipInfo(contribution.itemName);
  if (!membershipInfo.isMember || !membershipInfo.membershipType) {
    return null;
  }

  const now = Timestamp.now();
  const contributionDate = contribution.paidAt || contribution.createdAt;
  const startDate = contributionDate.toDate();
  const expiryDate = calculateExpiryDate(startDate, membershipInfo.membershipType);
  const planId = generatePlanId(contribution.itemName, membershipInfo.membershipType);

  // Preparer la date de naissance
  let birthDate = now;
  if (contribution.contributor.naissance) {
    try {
      const parsedDate = new Date(contribution.contributor.naissance);
      if (!isNaN(parsedDate.getTime())) {
        birthDate = Timestamp.fromDate(parsedDate);
      }
    } catch (e) {
      // Ignore
    }
  }

  const userData = {
    // Informations de base
    email: contribution.contributor.email,
    firstName: contribution.contributor.prenom,
    lastName: contribution.contributor.nom,
    postalCode: contribution.contributor.codePostal || '',
    birthDate,
    phone: contribution.contributor.telephone || '',

    // Statut
    status: {
      tags: ['CROWDFUNDING', 'NEW_MEMBER', 'FIXED_BY_SCRIPT'],
      isAccountBlocked: false,
      isCardBlocked: false,
    },

    // Origine du compte - ne pas inclure les champs undefined
    registration: {
      source: 'crowdfunding' as const,
      createdAt: contributionDate,
      crowdfundingContributionId: contribution.id,
      ...(contribution.ipAddress ? { ipAddress: contribution.ipAddress } : {}),
      ...(contribution.userAgent ? { userAgent: contribution.userAgent } : {}),
    },

    // Abonnement actuel
    currentMembership: {
      planId,
      planName: contribution.itemName,
      planType: membershipInfo.membershipType,
      status: 'active' as const,
      paymentStatus: 'paid' as const,
      startDate: contributionDate,
      expiryDate,
      price: contribution.amount,
      autoRenew: false,
    },

    // Points de fidelite
    loyaltyPoints: 0,

    // Timestamps
    createdAt: contributionDate,
    updatedAt: now,
  };

  if (dryRun) {
    return 'DRY_RUN_USER_ID';
  }

  // Creer le document utilisateur
  const usersRef = collection(db, USERS_COLLECTION);
  const newUserDoc = doc(usersRef);
  await setDoc(newUserDoc, userData);

  // Creer la sous-collection membershipHistory
  const membershipHistoryRef = collection(db, USERS_COLLECTION, newUserDoc.id, 'membershipHistory');
  await addDoc(membershipHistoryRef, {
    planId,
    planName: contribution.itemName,
    planType: membershipInfo.membershipType,
    status: 'active',
    startDate: contributionDate,
    endDate: expiryDate,
    price: contribution.amount,
    isRenewal: false,
  });

  // Creer la sous-collection actionHistory
  const actionHistoryRef = collection(db, USERS_COLLECTION, newUserDoc.id, 'actionHistory');
  await addDoc(actionHistoryRef, {
    actionType: 'membership_created',
    details: {
      description: `Abonnement ${contribution.itemName} cree via crowdfunding (corrige par script)`,
      amount: contribution.amount,
      contributionId: contribution.id,
    },
    timestamp: now,
    deviceType: 'web',
  });

  return newUserDoc.id;
}

async function createPurchase(
  userId: string,
  contribution: ContributionData,
  dryRun: boolean
): Promise<string | null> {
  if (dryRun) {
    return 'DRY_RUN_PURCHASE_ID';
  }

  const purchasesRef = collection(db, USERS_COLLECTION, userId, PURCHASES_SUBCOLLECTION);
  const now = Timestamp.now();

  const purchaseData = {
    type: contribution.type === 'pass' ? 'crowdfunding' : 'donation',
    source: 'crowdfunding',
    itemName: contribution.itemName,
    amount: contribution.amount,
    paymentId: contribution.paymentId,
    paymentStatus: contribution.paymentStatus === 'completed' ? 'completed' : 'pending',
    contributionId: contribution.id,
    purchasedAt: contribution.paidAt || contribution.createdAt,
    createdAt: now,
  };

  const docRef = await addDoc(purchasesRef, purchaseData);
  return docRef.id;
}

/**
 * Verifie et corrige les contributions avec membership manquant
 * @param dryRun Si true, ne fait que simuler sans modifier
 * @param onProgress Callback pour suivre la progression
 */
export async function fixContributionsWithMissingUsers(
  dryRun: boolean = true,
  onProgress?: (current: number, total: number, log: string) => void
): Promise<ContributionFixResult> {
  const result: ContributionFixResult = {
    totalContributions: 0,
    usersCreated: 0,
    purchasesAdded: 0,
    alreadyOk: 0,
    skipped: 0,
    errors: 0,
    logs: [],
  };

  const addLog = (message: string) => {
    result.logs.push(message);
    console.log(message);
  };

  try {
    addLog('═'.repeat(60));
    addLog('🔍 VERIFICATION DES CONTRIBUTIONS');
    addLog('═'.repeat(60));
    addLog(`Mode: ${dryRun ? 'SIMULATION (Dry Run)' : 'EXECUTION'}`);
    addLog(`Date debut du bug: ${BUG_START_DATE.toLocaleDateString('fr-FR')}`);
    addLog('');

    addLog('📥 Recuperation des contributions...');
    const contributionsRef = collection(db, CONTRIBUTIONS_COLLECTION);
    const snapshot = await getDocs(contributionsRef);

    addLog(`   ${snapshot.size} contributions totales trouvees`);

    // Filtrer les contributions depuis la date du bug
    const contributions: ContributionData[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as any;
      const contribution: ContributionData = {
        id: docSnap.id,
        ...data,
      };

      // Verifier la date
      const contributionDate = (contribution.paidAt || contribution.createdAt)?.toDate?.();
      if (!contributionDate || contributionDate < BUG_START_DATE) {
        continue; // Skip les contributions avant le bug
      }

      // Verifier que ca devrait avoir un user
      if (!shouldHaveUser(contribution)) {
        continue;
      }

      contributions.push(contribution);
    }

    result.totalContributions = contributions.length;
    addLog(`   ${result.totalContributions} contributions a verifier (depuis le ${BUG_START_DATE.toLocaleDateString('fr-FR')}, avec membership)`);
    addLog('');

    if (result.totalContributions === 0) {
      addLog('✅ Aucune contribution a verifier');
      return result;
    }

    let processed = 0;

    for (const contribution of contributions) {
      processed++;
      const email = contribution.contributor?.email;
      const itemName = contribution.itemName;
      const progress = `[${processed}/${contributions.length}]`;

      onProgress?.(processed, contributions.length, `${progress} Traitement de ${email}...`);

      if (!email) {
        addLog(`${progress} ⚠️ [${contribution.id}] Pas d'email, skip`);
        result.errors++;
        continue;
      }

      addLog(`${progress} 📧 ${email} - ${itemName} (${contribution.amount}€)`);

      // Chercher si l'utilisateur existe
      const existingUser = await getUserByEmail(email);

      if (!existingUser) {
        // USER N'EXISTE PAS -> Le creer
        addLog(`   ❌ User non trouve -> Creation...`);

        try {
          const userId = await createUserFromContribution(contribution, dryRun);
          if (userId) {
            addLog(`   ✅ ${dryRun ? '[DRY-RUN] Creerait' : 'Cree'} user: ${userId}`);
            result.usersCreated++;

            // Aussi creer le purchase
            const purchaseId = await createPurchase(userId === 'DRY_RUN_USER_ID' ? 'temp' : userId, contribution, dryRun);
            if (purchaseId) {
              addLog(`   ✅ ${dryRun ? '[DRY-RUN] Creerait' : 'Cree'} purchase: ${purchaseId}`);
              result.purchasesAdded++;
            }
          }
        } catch (err) {
          addLog(`   ❌ Erreur creation user: ${err}`);
          result.errors++;
        }
      } else {
        // USER EXISTE -> Verifier si le purchase existe
        const purchaseExists = await checkPurchaseExists(existingUser.id, contribution.id);

        if (purchaseExists) {
          addLog(`   ✅ User existe + purchase OK`);
          result.alreadyOk++;
        } else {
          // Purchase manquant -> L'ajouter
          addLog(`   ⚠️ User existe mais purchase manquant -> Ajout...`);

          try {
            const purchaseId = await createPurchase(existingUser.id, contribution, dryRun);
            if (purchaseId) {
              addLog(`   ✅ ${dryRun ? '[DRY-RUN] Creerait' : 'Cree'} purchase: ${purchaseId}`);
              result.purchasesAdded++;
            }
          } catch (err) {
            addLog(`   ❌ Erreur creation purchase: ${err}`);
            result.errors++;
          }
        }
      }

      addLog('');
    }

    addLog('═'.repeat(60));
    addLog('📊 RESUME');
    addLog('═'.repeat(60));
    addLog(`   Total contributions verifiees: ${result.totalContributions}`);
    addLog(`   ✅ Deja OK (user + purchase): ${result.alreadyOk}`);
    addLog(`   👤 Users crees: ${result.usersCreated}`);
    addLog(`   🛒 Purchases ajoutes: ${result.purchasesAdded}`);
    addLog(`   ⏭️ Ignores (dons): ${result.skipped}`);
    addLog(`   ❌ Erreurs: ${result.errors}`);

    if (dryRun && (result.usersCreated > 0 || result.purchasesAdded > 0)) {
      addLog('');
      addLog('💡 Executez sans dry-run pour appliquer les corrections');
    }

  } catch (error) {
    addLog(`❌ Erreur fatale: ${error}`);
    throw error;
  }

  return result;
}
