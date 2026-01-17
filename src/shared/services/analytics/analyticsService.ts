import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { OverviewKPIs } from '../../types/user';
import { getUsers } from './usersDataCache';

const ANALYTICS_CACHE_DOC = 'analytics/summary';

/**
 * Convertit une date Firestore Timestamp ou Date en objet Date JavaScript
 */
function toDate(value: any): Date | null {
  if (!value) return null;

  // Si c'est deja un objet Date
  if (value instanceof Date) return value;

  // Si c'est un Timestamp Firestore avec la methode toDate()
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }

  // Si c'est un objet avec seconds et nanoseconds (Timestamp Firestore)
  if (value.seconds !== undefined) {
    return new Date(value.seconds * 1000);
  }

  // Si c'est une string, essayer de la parser
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Normalise le type de plan pour gerer les variations
 */
function normalizePlanType(planType: any): 'monthly' | 'annual' | 'lifetime' | null {
  if (!planType || planType === 'null' || planType === 'undefined') return null;

  const type = String(planType).toLowerCase().trim();

  if (type === 'monthly' || type === 'month') return 'monthly';
  if (type === 'annual' || type === 'year' || type === 'yearly') return 'annual';
  if (type === 'lifetime') return 'lifetime';

  return null;
}

/**
 * Calcule l'age a partir d'une date de naissance
 */
function calculateAge(birthDate: any): number {
  const date = toDate(birthDate);
  if (!date) return 0;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }

  return age;
}

/**
 * Recupere les KPIs caches s'ils sont recents (< 1 heure)
 */
async function getCachedKPIs(): Promise<OverviewKPIs | null> {
  try {
    const [col, docId] = ANALYTICS_CACHE_DOC.split('/');
    const docRef = doc(db, col, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const updatedAt = data.updatedAt?.toDate();
      const now = new Date();

      // Si le cache a moins de 1 heure
      if (updatedAt && (now.getTime() - updatedAt.getTime()) < 60 * 60 * 1000) {
        return data.kpis as OverviewKPIs;
      }
    }
    return null;
  } catch (e) {
    console.warn('Failed to fetch cached KPIs', e);
    return null;
  }
}

/**
 * Sauvegarde les KPIs dans le cache Firestore
 */
async function cacheKPIs(kpis: OverviewKPIs): Promise<void> {
  try {
    const [col, docId] = ANALYTICS_CACHE_DOC.split('/');
    const docRef = doc(db, col, docId);
    await setDoc(docRef, {
      kpis,
      updatedAt: Timestamp.now()
    });
  } catch (e) {
    console.warn('Failed to cache KPIs', e);
  }
}

/**
 * Calcule tous les KPIs en un seul passage sur les donnees users cachees
 * OPTIMISE: Plus de requetes imbriquees, tout est calcule depuis le cache
 */
function calculateAllKPIsFromUsers(users: Array<{ id: string; data: DocumentData }>): OverviewKPIs {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let totalMembers = 0;
  let activeMembers = 0;
  let newThisWeek = 0;
  let newThisMonth = 0;
  let newPreviousWeek = 0;
  let newPreviousMonth = 0;

  // Financial KPIs
  let totalRevenue = 0;
  let mrr = 0;

  // Age calculation
  let totalAge = 0;
  let ageCount = 0;

  // Renewal rate calculation
  let eligibleForRenewal = 0;
  let renewed = 0;

  for (const user of users) {
    const data = user.data;
    const createdAt = toDate(data.createdAt);
    const membership = data.currentMembership;

    totalMembers++;

    // Skip users without membership
    if (!membership) continue;

    const status = membership.status;
    const paymentStatus = membership.paymentStatus;
    const normalizedType = normalizePlanType(membership.planType);

    // Active members & financial
    if (status === 'active' && paymentStatus === 'paid') {
      activeMembers++;
      totalRevenue += membership.price || 0;

      // MRR calculation
      if (normalizedType === 'monthly') {
        mrr += membership.price || 0;
      } else if (normalizedType === 'annual') {
        mrr += (membership.price || 0) / 12;
      }
    }

    // New members tracking
    if (createdAt) {
      if (createdAt >= oneWeekAgo) newThisWeek++;
      if (createdAt >= oneMonthAgo) newThisMonth++;
      if (createdAt >= twoWeeksAgo && createdAt < oneWeekAgo) newPreviousWeek++;
      if (createdAt >= twoMonthsAgo && createdAt < oneMonthAgo) newPreviousMonth++;
    }

    // Age calculation
    if (data.birthDate) {
      const age = calculateAge(data.birthDate);
      if (age > 0 && age < 120) {
        totalAge += age;
        ageCount++;
      }
    }

    // Renewal rate (simplified - users who have renewed at least once)
    if (data.membershipHistory && Array.isArray(data.membershipHistory)) {
      if (data.membershipHistory.length > 0) {
        eligibleForRenewal++;
        if (data.membershipHistory.some((h: any) => h.isRenewal)) {
          renewed++;
        }
      }
    }
  }

  const activityRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;
  const membersTrend = newPreviousWeek > 0 ? ((newThisWeek - newPreviousWeek) / newPreviousWeek) * 100 : 0;
  const averageAge = ageCount > 0 ? totalAge / ageCount : 0;
  const renewalRate = eligibleForRenewal > 0 ? (renewed / eligibleForRenewal) * 100 : 0;

  return {
    totalMembers,
    activeMembers,
    activityRate: Math.round(activityRate * 10) / 10,
    renewalRate: Math.round(renewalRate * 10) / 10,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageAge: Math.round(averageAge * 10) / 10,
    newThisWeek,
    newThisMonth,
    trends: {
      members: Math.round(membersTrend * 10) / 10,
      revenue: 0,
      activeMembers: 0,
      renewalRate: 0,
    },
  };
}

/**
 * Recupere tous les KPIs pour le dashboard principal
 * OPTIMISE: Utilise le cache de donnees users partage
 * 
 * @param forceRefresh Si true, ignore le cache et force le recalcul
 */
export async function getOverviewKPIs(forceRefresh = false): Promise<OverviewKPIs> {
  try {
    // 1. Essayer le cache Firestore (sauf si force)
    if (!forceRefresh) {
      const cached = await getCachedKPIs();
      if (cached) {
        console.log('[OverviewKPIs] Returning Firestore cached KPIs');
        return cached;
      }
    }

    console.log('[OverviewKPIs] Calculating from users cache...');

    // 2. Utiliser le cache de donnees users partage
    const users = await getUsers(forceRefresh);

    // 3. Calculer tous les KPIs en un seul passage
    const result = calculateAllKPIsFromUsers(users);

    // 4. Mettre a jour le cache Firestore (en arriere-plan)
    cacheKPIs(result);

    return result;
  } catch (error) {
    console.error('Error getting overview KPIs:', error);
    throw error;
  }
}

/**
 * Fonction dediee a la recherche pour recuperer les stats tres rapidement (uniquement via cache)
 */
export async function getStatsForSearch(): Promise<OverviewKPIs | null> {
  return getCachedKPIs();
}

/**
 * Export de toutes les fonctions analytics
 */
export * from './membershipAnalytics';
export * from './demographicAnalytics';
export * from './engagementAnalytics';
export * from './financialAnalytics';
export * from './exportService';
export * from './usersDataCache';
