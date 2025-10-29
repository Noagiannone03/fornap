import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { OverviewKPIs } from '../../types/user';
import { getFinancialKPIs } from './financialAnalytics';
import { getRenewalRate } from './membershipAnalytics';
import { getAgeDistribution } from './demographicAnalytics';

const USERS_COLLECTION = 'users';

/**
 * Récupère tous les KPIs pour le dashboard principal
 */
export async function getOverviewKPIs(): Promise<OverviewKPIs> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    // Calculs de base
    const totalMembers = snapshot.size;
    let activeMembers = 0;
    let newThisWeek = 0;
    let newThisMonth = 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Données pour calculer les tendances (période précédente)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    let newPreviousWeek = 0;
    let newPreviousMonth = 0;
    let activeMembersPrevious = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate();
      const membershipStatus = data.currentMembership.status;
      const membershipPayment = data.currentMembership.paymentStatus;

      // Membres actifs
      if (membershipStatus === 'active' && membershipPayment === 'paid') {
        activeMembers++;
      }

      // Nouveaux cette semaine
      if (createdAt && createdAt >= oneWeekAgo) {
        newThisWeek++;
      }

      // Nouveaux ce mois
      if (createdAt && createdAt >= oneMonthAgo) {
        newThisMonth++;
      }

      // Pour les tendances
      if (createdAt && createdAt >= twoWeeksAgo && createdAt < oneWeekAgo) {
        newPreviousWeek++;
      }

      if (createdAt && createdAt >= twoMonthsAgo && createdAt < oneMonthAgo) {
        newPreviousMonth++;
      }
    });

    // Récupérer les données financières
    const financialKPIs = await getFinancialKPIs();

    // Récupérer le taux de renouvellement
    const renewalData = await getRenewalRate(12);

    // Récupérer l'âge moyen
    const ageData = await getAgeDistribution();

    // Calcul du taux d'activité
    const activityRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

    // Calculer les tendances (% de changement)
    const membersTrend =
      newPreviousWeek > 0 ? ((newThisWeek - newPreviousWeek) / newPreviousWeek) * 100 : 0;

    const revenueTrend = 0; // Difficile à calculer sans données historiques complètes

    const activeMembersTrend = 0; // Idem

    return {
      totalMembers,
      activeMembers,
      activityRate: Math.round(activityRate * 10) / 10,
      renewalRate: renewalData.overall,
      mrr: financialKPIs.mrr,
      arr: financialKPIs.arr,
      totalRevenue: financialKPIs.totalRevenue,
      averageAge: ageData.averageAge,
      newThisWeek,
      newThisMonth,
      trends: {
        members: Math.round(membersTrend * 10) / 10,
        revenue: revenueTrend,
        activeMembers: activeMembersTrend,
        renewalRate: 0, // Nécessite historique
      },
    };
  } catch (error) {
    console.error('Error getting overview KPIs:', error);
    throw error;
  }
}

/**
 * Export de toutes les fonctions analytics
 */
export * from './membershipAnalytics';
export * from './demographicAnalytics';
export * from './engagementAnalytics';
export * from './financialAnalytics';
export * from './exportService';
