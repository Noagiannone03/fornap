import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type {
  RenewalRateData,
  ExpirationData,
  MembershipTimelineEvent,
  MembersEvolutionData,
  MembershipDistribution,
} from '../../types/user';
import { getUserMembershipHistory } from '../userService';

const USERS_COLLECTION = 'users';

/**
 * Normalise le type de plan pour gérer les variations
 * @param planType - Le type de plan brut de la base de données
 * @returns Le type normalisé ('monthly', 'annual', 'lifetime') ou null
 */
function normalizePlanType(planType: any): 'monthly' | 'annual' | 'lifetime' | null {
  if (!planType || planType === 'null' || planType === 'undefined') return null;

  const type = String(planType).toLowerCase().trim();

  // Mapping des variations
  if (type === 'monthly' || type === 'month') return 'monthly';
  if (type === 'annual' || type === 'year' || type === 'yearly') return 'annual';
  if (type === 'lifetime' || type === 'honoraire' || type === 'honorary') return 'lifetime';

  return null;
}

/**
 * Convertit une date Firestore Timestamp ou Date en objet Date JavaScript
 */
function toDate(value: any): Date | null {
  if (!value) return null;

  // Si c'est déjà un objet Date
  if (value instanceof Date) return value;

  // Si c'est un Timestamp Firestore avec la méthode toDate()
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
 * Calcule le taux de renouvellement global et par type
 * @param periodMonths - Nombre de mois à analyser (par défaut 12)
 */
export async function getRenewalRate(
  periodMonths: number = 12
): Promise<RenewalRateData> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const usersSnapshot = await getDocs(usersRef);

    let totalRenewals = 0;
    let totalExpirations = 0;
    let monthlyRenewals = 0;
    let monthlyExpirations = 0;
    let annualRenewals = 0;
    let annualExpirations = 0;

    // Map pour stocker l'évolution mensuelle
    const monthlyEvolution = new Map<string, { renewals: number; expirations: number }>();

    for (const userDoc of usersSnapshot.docs) {
      const history = await getUserMembershipHistory(userDoc.id);

      for (const entry of history) {
        // Vérifier si l'entrée est dans la période analysée
        const entryDate = toDate(entry.startDate);
        if (!entryDate) continue; // Skip si la conversion échoue

        const monthsAgo = (new Date().getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

        if (monthsAgo <= periodMonths) {
          const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyEvolution.has(monthKey)) {
            monthlyEvolution.set(monthKey, { renewals: 0, expirations: 0 });
          }

          if (entry.isRenewal) {
            totalRenewals++;
            monthlyEvolution.get(monthKey)!.renewals++;

            const normalizedType = normalizePlanType(entry.planType);
            if (normalizedType === 'monthly') monthlyRenewals++;
            else if (normalizedType === 'annual') annualRenewals++;
          }

          // Compter les expirations (statut expired ou cancelled)
          if (entry.status === 'expired' || entry.status === 'cancelled') {
            totalExpirations++;
            monthlyEvolution.get(monthKey)!.expirations++;

            const normalizedType = normalizePlanType(entry.planType);
            if (normalizedType === 'monthly') monthlyExpirations++;
            else if (normalizedType === 'annual') annualExpirations++;
          }
        }
      }
    }

    // Calculer les taux
    const overallRate = totalExpirations > 0 ? (totalRenewals / totalExpirations) * 100 : 0;
    const monthlyRate = monthlyExpirations > 0 ? (monthlyRenewals / monthlyExpirations) * 100 : 0;
    const annualRate = annualExpirations > 0 ? (annualRenewals / annualExpirations) * 100 : 0;

    // Créer l'évolution mensuelle
    const evolution = Array.from(monthlyEvolution.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        rate: data.expirations > 0 ? (data.renewals / data.expirations) * 100 : 0,
      }));

    return {
      overall: Math.round(overallRate * 10) / 10,
      byType: {
        monthly: Math.round(monthlyRate * 10) / 10,
        annual: Math.round(annualRate * 10) / 10,
      },
      evolution,
    };
  } catch (error) {
    console.error('Error calculating renewal rate:', error);
    throw error;
  }
}

/**
 * Récupère les abonnements qui vont expirer dans les X prochains jours
 * @param daysAhead - Nombre de jours à l'avance (par défaut 30)
 */
export async function getUpcomingExpirations(
  daysAhead: number = 30
): Promise<ExpirationData[]> {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(
      usersRef,
      where('currentMembership.status', '==', 'active'),
      where('currentMembership.expiryDate', '<=', Timestamp.fromDate(futureDate)),
      where('currentMembership.expiryDate', '>=', Timestamp.now())
    );

    const snapshot = await getDocs(q);

    // Grouper par date et type
    const expirationMap = new Map<string, Map<string, { count: number; revenue: number }>>();

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Vérifier que currentMembership et expiryDate existent
      if (!data.currentMembership?.expiryDate) return;

      const expiryDate = toDate(data.currentMembership.expiryDate);
      if (!expiryDate) return; // Skip si la conversion échoue

      const dateKey = expiryDate.toISOString().split('T')[0];
      const membershipType = data.currentMembership.planType;
      const price = data.currentMembership.price || 0;

      if (!expirationMap.has(dateKey)) {
        expirationMap.set(dateKey, new Map());
      }

      const dateData = expirationMap.get(dateKey)!;

      if (!dateData.has(membershipType)) {
        dateData.set(membershipType, { count: 0, revenue: 0 });
      }

      const typeData = dateData.get(membershipType)!;
      typeData.count++;
      typeData.revenue += price;
    });

    // Convertir en tableau
    const result: ExpirationData[] = [];
    expirationMap.forEach((types, date) => {
      types.forEach((data, type) => {
        result.push({
          date,
          count: data.count,
          estimatedRevenueLoss: data.revenue,
          membershipType: type as 'monthly' | 'annual' | 'lifetime',
        });
      });
    });

    // Trier par date
    result.sort((a, b) => a.date.localeCompare(b.date));

    return result;
  } catch (error) {
    console.error('Error getting upcoming expirations:', error);
    throw error;
  }
}

/**
 * Récupère la timeline complète d'un membre
 * @param userId - ID de l'utilisateur
 */
export async function getMembershipTimeline(
  userId: string
): Promise<MembershipTimelineEvent[]> {
  try {
    const history = await getUserMembershipHistory(userId);

    const timeline: MembershipTimelineEvent[] = history.map((entry) => {
      let type: 'created' | 'renewed' | 'cancelled' | 'expired' = 'created';

      if (entry.isRenewal) {
        type = 'renewed';
      } else if (entry.status === 'cancelled') {
        type = 'cancelled';
      } else if (entry.status === 'expired') {
        type = 'expired';
      }

      return {
        date: entry.startDate,
        type,
        planName: entry.planName,
        price: entry.price,
        isRenewal: entry.isRenewal,
      };
    });

    // Trier par date décroissante
    timeline.sort((a, b) => {
      const dateA = a.date?.toMillis ? a.date.toMillis() : 0;
      const dateB = b.date?.toMillis ? b.date.toMillis() : 0;
      return dateB - dateA;
    });

    return timeline;
  } catch (error) {
    console.error('Error getting membership timeline:', error);
    throw error;
  }
}

/**
 * Récupère l'évolution du nombre de membres dans le temps
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @param groupBy - Grouper par jour, semaine ou mois
 */
export async function getMembersEvolution(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'month'
): Promise<MembersEvolutionData[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(
      usersRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);

    // Map pour stocker les données par période
    const dataMap = new Map<string, { monthly: number; annual: number; lifetime: number }>();

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Vérifier que createdAt et currentMembership existent
      const createdAt = toDate(data.createdAt);
      if (!createdAt || !data.currentMembership?.planType) return;

      let periodKey: string;

      switch (groupBy) {
        case 'day':
          periodKey = createdAt.toISOString().split('T')[0];
          break;
        case 'week':
          const weekNum = Math.ceil(
            (createdAt.getTime() - new Date(createdAt.getFullYear(), 0, 1).getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          );
          periodKey = `${createdAt.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          break;
        case 'month':
        default:
          periodKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!dataMap.has(periodKey)) {
        dataMap.set(periodKey, { monthly: 0, annual: 0, lifetime: 0 });
      }

      const periodData = dataMap.get(periodKey)!;
      const membershipType = normalizePlanType(data.currentMembership.planType);

      if (membershipType === 'monthly') periodData.monthly++;
      else if (membershipType === 'annual') periodData.annual++;
      else if (membershipType === 'lifetime') periodData.lifetime++;
    });

    // Convertir en tableau et calculer les totaux
    const result: MembersEvolutionData[] = Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        monthly: data.monthly,
        annual: data.annual,
        lifetime: data.lifetime,
        total: data.monthly + data.annual + data.lifetime,
      }));

    return result;
  } catch (error) {
    console.error('Error getting members evolution:', error);
    throw error;
  }
}

/**
 * Récupère la distribution des abonnements
 */
export async function getMembershipDistribution(): Promise<MembershipDistribution> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const byType = { monthly: 0, annual: 0, lifetime: 0 };
    const byStatus = { active: 0, expired: 0, pending: 0, cancelled: 0 };

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Vérifier que currentMembership existe
      if (!data.currentMembership) {
        return;
      }

      const rawPlanType = data.currentMembership.planType;
      const membershipType = normalizePlanType(rawPlanType);
      const status = data.currentMembership.status;

      // Compter par type (utiliser le type normalisé)
      if (membershipType === 'monthly') byType.monthly++;
      else if (membershipType === 'annual') byType.annual++;
      else if (membershipType === 'lifetime') byType.lifetime++;

      // Compter par statut
      if (status === 'active') byStatus.active++;
      else if (status === 'expired') byStatus.expired++;
      else if (status === 'pending') byStatus.pending++;
      else if (status === 'cancelled') byStatus.cancelled++;
    });

    return { byType, byStatus };
  } catch (error) {
    console.error('Error getting membership distribution:', error);
    throw error;
  }
}
