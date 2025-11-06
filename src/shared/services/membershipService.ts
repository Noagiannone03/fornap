import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  MembershipPlan,
  MembershipPlanInput,
  MembershipPlanStats,
  MembershipPlanWithStats,
} from '../types/membership';

const COLLECTION_NAME = 'membershipPlans';

/**
 * Récupère toutes les formules d'abonnement
 * @param onlyActive - Si true, ne retourne que les formules actives
 */
export async function getAllMembershipPlans(
  onlyActive: boolean = false
): Promise<MembershipPlan[]> {
  try {
    const plansRef = collection(db, COLLECTION_NAME);
    // On récupère tous les documents et on filtre/trie côté client
    // pour éviter d'avoir besoin d'un index composite
    const q = query(plansRef);

    const querySnapshot = await getDocs(q);
    const plans: MembershipPlan[] = [];

    querySnapshot.forEach((doc) => {
      const planData = {
        ...doc.data(),
        id: doc.id,
      } as MembershipPlan;

      // Filtrer côté client si onlyActive est true
      if (!onlyActive || planData.isActive) {
        plans.push(planData);
      }
    });

    // Trier par ordre côté client
    plans.sort((a, b) => a.order - b.order);

    return plans;
  } catch (error) {
    console.error('Error fetching membership plans:', error);
    throw error;
  }
}

/**
 * Récupère une formule d'abonnement par son ID
 */
export async function getMembershipPlanById(
  planId: string
): Promise<MembershipPlan | null> {
  try {
    const planRef = doc(db, COLLECTION_NAME, planId);
    const planDoc = await getDoc(planRef);

    if (planDoc.exists()) {
      return {
        ...planDoc.data(),
        id: planDoc.id,
      } as MembershipPlan;
    }

    return null;
  } catch (error) {
    console.error('Error fetching membership plan:', error);
    throw error;
  }
}

/**
 * Crée une nouvelle formule d'abonnement
 */
export async function createMembershipPlan(
  planInput: MembershipPlanInput
): Promise<string> {
  try {
    const plansRef = collection(db, COLLECTION_NAME);
    const now = Timestamp.now();

    const planData = {
      ...planInput,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(plansRef, planData);

    // Mettre à jour le document avec son propre ID
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
  } catch (error) {
    console.error('Error creating membership plan:', error);
    throw error;
  }
}

/**
 * Met à jour une formule d'abonnement existante
 */
export async function updateMembershipPlan(
  planId: string,
  planInput: Partial<MembershipPlanInput>
): Promise<void> {
  try {
    const planRef = doc(db, COLLECTION_NAME, planId);
    const now = Timestamp.now();

    await updateDoc(planRef, {
      ...planInput,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error updating membership plan:', error);
    throw error;
  }
}

/**
 * Supprime une formule d'abonnement
 * ATTENTION: Vérifier qu'aucun utilisateur n'a cette formule avant de supprimer
 */
export async function deleteMembershipPlan(planId: string): Promise<void> {
  try {
    const planRef = doc(db, COLLECTION_NAME, planId);
    await deleteDoc(planRef);
  } catch (error) {
    console.error('Error deleting membership plan:', error);
    throw error;
  }
}

/**
 * Active ou désactive une formule d'abonnement
 */
export async function toggleMembershipPlanActive(
  planId: string,
  isActive: boolean
): Promise<void> {
  try {
    await updateMembershipPlan(planId, { isActive });
  } catch (error) {
    console.error('Error toggling membership plan active status:', error);
    throw error;
  }
}

/**
 * Marque une formule comme principale (recommandée)
 * Démarque automatiquement les autres formules
 */
export async function setMembershipPlanAsPrimary(planId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    const plansRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await getDocs(plansRef);

    // Démarquer toutes les formules
    querySnapshot.forEach((document) => {
      const docRef = doc(db, COLLECTION_NAME, document.id);
      batch.update(docRef, { isPrimary: document.id === planId });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error setting membership plan as primary:', error);
    throw error;
  }
}

/**
 * Réorganise l'ordre des formules
 */
export async function reorderMembershipPlans(
  planIds: string[]
): Promise<void> {
  try {
    const batch = writeBatch(db);

    planIds.forEach((planId, index) => {
      const planRef = doc(db, COLLECTION_NAME, planId);
      batch.update(planRef, { order: index + 1 });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error reordering membership plans:', error);
    throw error;
  }
}

/**
 * Récupère les statistiques pour toutes les formules
 * Compte le nombre d'utilisateurs par formule
 */
export async function getMembershipPlansStats(): Promise<
  Map<string, MembershipPlanStats>
> {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);

    const statsMap = new Map<string, MembershipPlanStats>();

    querySnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const membership = userData.membership;

      if (membership && membership.type) {
        const planId = membership.type;

        if (!statsMap.has(planId)) {
          statsMap.set(planId, {
            planId,
            subscriberCount: 0,
            totalRevenue: 0,
            activeSubscribers: 0,
            pendingSubscribers: 0,
            expiredSubscribers: 0,
          });
        }

        const stats = statsMap.get(planId)!;
        stats.subscriberCount++;

        switch (membership.status) {
          case 'active':
            stats.activeSubscribers++;
            break;
          case 'pending':
            stats.pendingSubscribers++;
            break;
          case 'expired':
            stats.expiredSubscribers++;
            break;
        }
      }
    });

    // Calculer le revenu total pour chaque formule
    const plans = await getAllMembershipPlans();
    plans.forEach((plan) => {
      const stats = statsMap.get(plan.id);
      if (stats) {
        stats.totalRevenue = stats.activeSubscribers * plan.price;
      }
    });

    return statsMap;
  } catch (error) {
    console.error('Error fetching membership plans stats:', error);
    throw error;
  }
}

/**
 * Récupère toutes les formules avec leurs statistiques
 */
export async function getMembershipPlansWithStats(
  onlyActive: boolean = false
): Promise<MembershipPlanWithStats[]> {
  try {
    const [plans, statsMap] = await Promise.all([
      getAllMembershipPlans(onlyActive),
      getMembershipPlansStats(),
    ]);

    return plans.map((plan) => ({
      ...plan,
      stats: statsMap.get(plan.id),
    }));
  } catch (error) {
    console.error('Error fetching membership plans with stats:', error);
    throw error;
  }
}

/**
 * Initialise la collection avec les données par défaut
 * À utiliser uniquement lors de la première configuration
 */
export async function initializeMembershipPlans(): Promise<void> {
  try {
    // Vérifier si des plans existent déjà
    const existingPlans = await getAllMembershipPlans();
    if (existingPlans.length > 0) {
      console.warn('Membership plans already exist. Skipping initialization.');
      return;
    }

    const defaultPlans: MembershipPlanInput[] = [
      {
        id: 'monthly',
        name: 'Membre Mensuel',
        description: 'Abonnement mensuel flexible',
        price: 15,
        period: 'month',
        features: [
          'Accès prioritaire aux événements',
          'Accès au lieu et aux installations',
          'Promotions exclusives sur le shop',
          'Newsletter mensuelle',
          'Support communautaire',
        ],
        isActive: true,
        isPrimary: false,
        order: 1,
      },
      {
        id: 'annual',
        name: 'Membre Annuel',
        description: 'Abonnement annuel - 2 mois offerts',
        price: 150,
        period: 'year',
        features: [
          'Tous les avantages du Membre Mensuel',
          'Programme de fidélité actif',
          'Cumul de points sur tous les achats',
          'Réductions progressives',
          'Accès aux exclusivités et avant-premières',
          'Événements VIP réservés aux membres annuels',
          '2 mois offerts (économie de 30€)',
        ],
        isActive: true,
        isPrimary: true,
        order: 2,
      },
      {
        id: 'honorary',
        name: "Membre d'Honneur",
        description: 'Adhésion à vie sans renouvellement',
        price: 500,
        period: 'lifetime',
        features: [
          'Tous les avantages du Membre Annuel',
          'Adhésion à vie sans renouvellement',
          'Statut VIP permanent',
          'Accès illimité aux événements premium',
          'Invitations exclusives partenaires',
          'Carte membre physique personnalisée',
          'Badge spécial sur votre profil',
          'Participation aux décisions communautaires',
        ],
        isActive: true,
        isPrimary: false,
        order: 3,
      },
    ];

    // Créer tous les plans par défaut
    await Promise.all(
      defaultPlans.map((plan) => createMembershipPlan(plan))
    );

    console.log('Membership plans initialized successfully');
  } catch (error) {
    console.error('Error initializing membership plans:', error);
    throw error;
  }
}
