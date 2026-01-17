import { doc, setDoc, getDoc, Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { FinancialKPIs, RevenueEvolutionData, TransactionData } from '../../types/user';
import { getUserMembershipHistory } from '../userService';
import { getUsers, type CachedUser } from './usersDataCache';

const FINANCIAL_CACHE_DOC = 'analytics/financial';
const USERS_COLLECTION = 'users';

/**
 * Normalise le type de plan pour gerer les variations
 * @param planType - Le type de plan brut de la base de donnees
 * @returns Le type normalise ('monthly', 'annual', 'lifetime') ou null
 */
function normalizePlanType(planType: any): 'monthly' | 'annual' | 'lifetime' | null {
  if (!planType || planType === 'null' || planType === 'undefined') return null;

  const type = String(planType).toLowerCase().trim();

  // Mapping des variations
  if (type === 'monthly' || type === 'month') return 'monthly';
  if (type === 'annual' || type === 'year' || type === 'yearly') return 'annual';
  if (type === 'lifetime') return 'lifetime';

  return null;
}

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
 * Recupere les KPIs financiers caches s'ils sont recents (< 1 heure)
 */
async function getCachedFinancialKPIs(): Promise<FinancialKPIs | null> {
  try {
    const [col, docId] = FINANCIAL_CACHE_DOC.split('/');
    const docRef = doc(db, col, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const updatedAt = data.updatedAt?.toDate();
      const now = new Date();

      if (updatedAt && (now.getTime() - updatedAt.getTime()) < 60 * 60 * 1000) {
        return data.kpis as FinancialKPIs;
      }
    }
    return null;
  } catch (e) {
    console.warn('Failed to fetch cached financial KPIs', e);
    return null;
  }
}

/**
 * Sauvegarde les KPIs financiers dans le cache
 */
async function cacheFinancialKPIs(kpis: FinancialKPIs): Promise<void> {
  try {
    const [col, docId] = FINANCIAL_CACHE_DOC.split('/');
    const docRef = doc(db, col, docId);
    await setDoc(docRef, {
      kpis,
      updatedAt: Timestamp.now()
    });
  } catch (e) {
    console.warn('Failed to cache financial KPIs', e);
  }
}

/**
 * Calcule les KPIs financiers depuis les donnees users
 */
function calculateFinancialKPIsFromUsers(users: CachedUser[]): FinancialKPIs {
  let totalRevenue = 0;
  let mrr = 0;
  let activeUsers = 0;
  const revenueByType = { monthly: 0, annual: 0, lifetime: 0 };

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  let churnedUsers = 0;

  for (const user of users) {
    const data = user.data;
    const membership = data.currentMembership;

    if (!membership) continue;

    if (membership.paymentStatus === 'paid') {
      totalRevenue += membership.price || 0;

      const normalizedType = normalizePlanType(membership.planType);
      if (normalizedType === 'monthly') {
        revenueByType.monthly += membership.price || 0;
      } else if (normalizedType === 'annual') {
        revenueByType.annual += membership.price || 0;
      } else if (normalizedType === 'lifetime') {
        revenueByType.lifetime += membership.price || 0;
      }
    }

    if (membership.status === 'active' && membership.paymentStatus === 'paid') {
      activeUsers++;

      const normalizedType = normalizePlanType(membership.planType);
      if (normalizedType === 'monthly') {
        mrr += membership.price || 0;
      } else if (normalizedType === 'annual') {
        mrr += (membership.price || 0) / 12;
      }
    }

    if (
      (membership.status === 'expired' || membership.status === 'cancelled') &&
      membership.expiryDate
    ) {
      const expiryDate = toDate(membership.expiryDate);
      if (expiryDate && expiryDate >= oneMonthAgo) {
        churnedUsers++;
      }
    }
  }

  const arr = mrr * 12;
  const arpu = activeUsers > 0 ? totalRevenue / activeUsers : 0;
  const churnRate = users.length > 0 ? (churnedUsers / users.length) * 100 : 0;

  let ltv = 0;
  if (churnRate > 0) {
    ltv = (arpu / churnRate) * 100;
    ltv = Math.min(ltv, arpu * 10);
  } else if (activeUsers > 0) {
    ltv = arpu * 3;
  }

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    arpu: Math.round(arpu * 100) / 100,
    ltv: Math.round(ltv * 100) / 100,
    churnRate: Math.round(churnRate * 10) / 10,
    revenueByType: {
      monthly: Math.round(revenueByType.monthly * 100) / 100,
      annual: Math.round(revenueByType.annual * 100) / 100,
      lifetime: Math.round(revenueByType.lifetime * 100) / 100,
    },
  };
}

/**
 * Calcule les KPIs financiers
 * OPTIMISE: Utilise le cache de donnees users partage
 */
export async function getFinancialKPIs(forceRefresh = false): Promise<FinancialKPIs> {
  try {
    // Essayer le cache Firestore d'abord
    if (!forceRefresh) {
      const cached = await getCachedFinancialKPIs();
      if (cached) {
        console.log('[FinancialKPIs] Returning cached KPIs');
        return cached;
      }
    }

    console.log('[FinancialKPIs] Calculating from users cache...');

    // Utiliser le cache de donnees users partage
    const users = await getUsers(forceRefresh);

    // Calculer les KPIs depuis les donnees cachees
    const result = calculateFinancialKPIsFromUsers(users);

    // Mettre a jour le cache Firestore en arriere-plan
    cacheFinancialKPIs(result);

    return result;
  } catch (error) {
    console.error('Error getting financial KPIs:', error);
    throw error;
  }
}

/**
 * Récupère l'évolution du revenu dans le temps
 */
export async function getRevenueEvolution(
  startDate: Date,
  endDate: Date
): Promise<RevenueEvolutionData[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    // Map pour stocker les données par mois
    const monthlyData = new Map<
      string,
      {
        totalRevenue: number;
        monthly: number;
        annual: number;
        lifetime: number;
        newMembers: number;
        renewals: number;
      }
    >();

    // Récupérer tous les historiques en parallèle
    const historyPromises = snapshot.docs.map(userDoc =>
      getUserMembershipHistory(userDoc.id)
    );
    const allHistories = await Promise.all(historyPromises);

    // Parcourir tous les historiques
    for (const history of allHistories) {
      for (const entry of history) {
        const entryDate = toDate(entry.startDate);
        if (!entryDate) continue; // Skip si la conversion échoue

        // Vérifier si l'entrée est dans la période
        if (entryDate >= startDate && entryDate <= endDate) {
          const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, {
              totalRevenue: 0,
              monthly: 0,
              annual: 0,
              lifetime: 0,
              newMembers: 0,
              renewals: 0,
            });
          }

          const monthData = monthlyData.get(monthKey)!;

          // Ajouter le revenu
          const revenue = entry.price || 0;
          monthData.totalRevenue += revenue;

          // Répartir par type (normaliser)
          const normalizedType = normalizePlanType(entry.planType);
          if (normalizedType === 'monthly') monthData.monthly += revenue;
          else if (normalizedType === 'annual') monthData.annual += revenue;
          else if (normalizedType === 'lifetime') monthData.lifetime += revenue;

          // Compter nouveaux membres vs renouvellements
          if (entry.isRenewal) {
            monthData.renewals++;
          } else {
            monthData.newMembers++;
          }
        }
      }
    }

    // Convertir en tableau et trier
    const result: RevenueEvolutionData[] = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        totalRevenue: Math.round(data.totalRevenue * 100) / 100,
        monthly: Math.round(data.monthly * 100) / 100,
        annual: Math.round(data.annual * 100) / 100,
        lifetime: Math.round(data.lifetime * 100) / 100,
        newMembers: data.newMembers,
        renewals: data.renewals,
      }));

    return result;
  } catch (error) {
    console.error('Error getting revenue evolution:', error);
    throw error;
  }
}

/**
 * Récupère toutes les transactions pour une période donnée
 * Utilisé pour les exports comptables
 */
export async function getTransactionsForPeriod(
  startDate: Date,
  endDate: Date
): Promise<TransactionData[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const transactions: TransactionData[] = [];

    // Récupérer tous les historiques en parallèle
    const historyPromises = snapshot.docs.map(userDoc =>
      getUserMembershipHistory(userDoc.id).then(history => ({
        userId: userDoc.id,
        userData: userDoc.data(),
        history
      }))
    );
    const allHistories = await Promise.all(historyPromises);

    // Parcourir tous les historiques
    for (const { userId, userData, history } of allHistories) {
      for (const entry of history) {
        const entryDate = toDate(entry.startDate);
        if (!entryDate) continue; // Skip si la conversion échoue

        // Vérifier si l'entrée est dans la période
        if (entryDate >= startDate && entryDate <= endDate && entry.status !== 'pending') {
          transactions.push({
            id: entry.id,
            date: entry.startDate,
            userId: userId,
            userName: `${userData.firstName} ${userData.lastName}`,
            userEmail: userData.email,
            membershipType: entry.planType,
            planName: entry.planName,
            amount: entry.price || 0,
            paymentMethod: entry.paymentMethod || 'N/A',
            transactionId: entry.transactionId || 'N/A',
            isRenewal: entry.isRenewal,
          });
        }
      }
    }

    // Trier par date décroissante
    transactions.sort((a, b) => {
      const dateA = a.date?.toMillis ? a.date.toMillis() : 0;
      const dateB = b.date?.toMillis ? b.date.toMillis() : 0;
      return dateB - dateA;
    });

    return transactions;
  } catch (error) {
    console.error('Error getting transactions for period:', error);
    throw error;
  }
}

/**
 * Calcule les KPIs financiers avec comparaison de période
 */
export async function getFinancialKPIsWithComparison(
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  previousPeriodStart: Date,
  previousPeriodEnd: Date
): Promise<{
  current: FinancialKPIs;
  previous: FinancialKPIs;
  trends: {
    totalRevenue: number;
    mrr: number;
    arr: number;
    arpu: number;
    churnRate: number;
  };
}> {
  try {
    // Récupérer les données des deux périodes
    const currentRevenue = await getRevenueEvolution(currentPeriodStart, currentPeriodEnd);
    const previousRevenue = await getRevenueEvolution(previousPeriodStart, previousPeriodEnd);

    // Calculer les KPIs actuels
    const current = await getFinancialKPIs();

    // Pour les KPIs précédents, on fait une estimation basée sur les revenus
    const previousTotal = previousRevenue.reduce((sum, month) => sum + month.totalRevenue, 0);
    const currentTotal = currentRevenue.reduce((sum, month) => sum + month.totalRevenue, 0);

    // Calculer les tendances (pourcentage de changement)
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      current,
      previous: {
        ...current,
        totalRevenue: previousTotal,
      },
      trends: {
        totalRevenue: Math.round(calculateTrend(currentTotal, previousTotal) * 10) / 10,
        mrr: 0, // Difficile à calculer rétroactivement sans données historiques
        arr: 0,
        arpu: 0,
        churnRate: 0,
      },
    };
  } catch (error) {
    console.error('Error getting financial KPIs with comparison:', error);
    throw error;
  }
}
