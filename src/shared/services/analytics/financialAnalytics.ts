import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { FinancialKPIs, RevenueEvolutionData, TransactionData } from '../../types/user';
import { getUserMembershipHistory } from '../userService';

const USERS_COLLECTION = 'users';

/**
 * Calcule les KPIs financiers
 */
export async function getFinancialKPIs(): Promise<FinancialKPIs> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    let totalRevenue = 0;
    let mrr = 0; // Monthly Recurring Revenue
    let activeUsers = 0;
    const revenueByType = { monthly: 0, annual: 0, lifetime: 0 };

    // Calculer le churn (utilisateurs qui ont annulé ou expiré dans le dernier mois)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    let churnedUsers = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const membership = data.currentMembership;

      // Revenu total (tous les paiements)
      if (membership.paymentStatus === 'paid') {
        totalRevenue += membership.price || 0;

        // Répartition par type
        if (membership.planType === 'monthly') {
          revenueByType.monthly += membership.price || 0;
        } else if (membership.planType === 'annual') {
          revenueByType.annual += membership.price || 0;
        } else if (membership.planType === 'lifetime') {
          revenueByType.lifetime += membership.price || 0;
        }
      }

      // MRR : calculer le revenu mensuel récurrent
      if (membership.status === 'active' && membership.paymentStatus === 'paid') {
        activeUsers++;

        if (membership.planType === 'monthly') {
          mrr += membership.price || 0;
        } else if (membership.planType === 'annual') {
          // Diviser le prix annuel par 12
          mrr += (membership.price || 0) / 12;
        }
        // Lifetime ne compte pas dans le MRR (paiement unique)
      }

      // Churn : utilisateurs qui ont annulé ou expiré récemment
      if (
        (membership.status === 'expired' || membership.status === 'cancelled') &&
        membership.expiryDate
      ) {
        const expiryDate = membership.expiryDate.toDate();
        if (expiryDate >= oneMonthAgo) {
          churnedUsers++;
        }
      }
    });

    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // ARPU (Average Revenue Per User)
    const arpu = activeUsers > 0 ? totalRevenue / activeUsers : 0;

    // Churn Rate (en pourcentage)
    const churnRate = snapshot.size > 0 ? (churnedUsers / snapshot.size) * 100 : 0;

    // LTV (Lifetime Value) = ARPU / Churn Rate (formule simplifiée)
    // Si churn rate est très faible, on cap le LTV à une valeur raisonnable
    let ltv = 0;
    if (churnRate > 0) {
      ltv = (arpu / churnRate) * 100;
      // Cap à 10x ARPU pour éviter des valeurs irréalistes
      ltv = Math.min(ltv, arpu * 10);
    } else if (activeUsers > 0) {
      // Si pas de churn, LTV = ARPU * durée de vie estimée (ex: 36 mois)
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

    // Parcourir tous les utilisateurs et leur historique
    for (const userDoc of snapshot.docs) {
      const history = await getUserMembershipHistory(userDoc.id);

      for (const entry of history) {
        const entryDate = entry.startDate.toDate();

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

          // Répartir par type
          if (entry.planType === 'monthly') monthData.monthly += revenue;
          else if (entry.planType === 'annual') monthData.annual += revenue;
          else if (entry.planType === 'lifetime') monthData.lifetime += revenue;

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

    // Parcourir tous les utilisateurs
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const history = await getUserMembershipHistory(userDoc.id);

      for (const entry of history) {
        const entryDate = entry.startDate.toDate();

        // Vérifier si l'entrée est dans la période
        if (entryDate >= startDate && entryDate <= endDate && entry.status !== 'pending') {
          transactions.push({
            id: entry.id,
            date: entry.startDate,
            userId: userDoc.id,
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
    transactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());

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
