import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type {
  Contribution,
  ContributionKPIs,
  ContributionEvolutionData,
  ItemStatistics,
  ContributionGeographicData,
  ContributorDemographics,
  RecentContribution,
} from '../../types/contribution';

const CONTRIBUTIONS_COLLECTION = 'contributions';

/**
 * Convertit une date Firestore Timestamp en objet Date JavaScript
 */
function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (value.seconds !== undefined) {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Calcule l'âge à partir d'une date de naissance
 */
function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Récupère toutes les contributions
 */
export async function getAllContributions(): Promise<Contribution[]> {
  try {
    const contributionsRef = collection(db, CONTRIBUTIONS_COLLECTION);
    const snapshot = await getDocs(contributionsRef);

    const contributions: Contribution[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      contributions.push({
        id: doc.id,
        ...data,
      } as Contribution);
    });

    return contributions;
  } catch (error) {
    console.error('Error getting contributions:', error);
    throw error;
  }
}

/**
 * Calcule les KPIs des contributions
 */
export async function getContributionKPIs(): Promise<ContributionKPIs> {
  try {
    const contributions = await getAllContributions();

    let totalAmount = 0;
    let memberConversions = 0;
    let passCount = 0;
    let donationCount = 0;
    let monthlyPassCount = 0;
    let annualPassCount = 0;

    contributions.forEach((contrib) => {
      if (contrib.paymentStatus === 'completed') {
        totalAmount += contrib.amount || 0;

        // Compter les conversions vers adhésion
        if (contrib.isMember) {
          memberConversions++;
        }

        // Compter par type
        if (contrib.type === 'pass') {
          passCount++;
          // Distinguer mensuel vs annuel
          if (contrib.membershipType === 'monthly') {
            monthlyPassCount++;
          } else if (contrib.membershipType === 'annual') {
            annualPassCount++;
          }
        } else if (contrib.type === 'donation') {
          donationCount++;
        }
      }
    });

    const totalContributions = contributions.filter(c => c.paymentStatus === 'completed').length;
    const averageAmount = totalContributions > 0 ? totalAmount / totalContributions : 0;
    const conversionRate = totalContributions > 0 ? (memberConversions / totalContributions) * 100 : 0;

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalContributions,
      averageAmount: Math.round(averageAmount * 100) / 100,
      memberConversions,
      conversionRate: Math.round(conversionRate * 10) / 10,
      passCount,
      donationCount,
      monthlyPassCount,
      annualPassCount,
    };
  } catch (error) {
    console.error('Error getting contribution KPIs:', error);
    throw error;
  }
}

/**
 * Récupère l'évolution des contributions dans le temps
 */
export async function getContributionEvolution(
  startDate: Date,
  endDate: Date
): Promise<ContributionEvolutionData[]> {
  try {
    const contributions = await getAllContributions();

    // Map pour stocker les données par mois
    const monthlyData = new Map<
      string,
      {
        totalAmount: number;
        totalCount: number;
        passAmount: number;
        donationAmount: number;
        passCount: number;
        donationCount: number;
        memberConversions: number;
      }
    >();

    contributions.forEach((contrib) => {
      if (contrib.paymentStatus !== 'completed') return;

      const contribDate = toDate(contrib.paidAt);
      if (!contribDate || contribDate < startDate || contribDate > endDate) return;

      const monthKey = `${contribDate.getFullYear()}-${String(contribDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          totalAmount: 0,
          totalCount: 0,
          passAmount: 0,
          donationAmount: 0,
          passCount: 0,
          donationCount: 0,
          memberConversions: 0,
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      const amount = contrib.amount || 0;

      monthData.totalAmount += amount;
      monthData.totalCount++;

      if (contrib.isMember) {
        monthData.memberConversions++;
      }

      if (contrib.type === 'pass') {
        monthData.passAmount += amount;
        monthData.passCount++;
      } else if (contrib.type === 'donation') {
        monthData.donationAmount += amount;
        monthData.donationCount++;
      }
    });

    // Convertir en tableau et trier
    const result: ContributionEvolutionData[] = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        totalCount: data.totalCount,
        passAmount: Math.round(data.passAmount * 100) / 100,
        donationAmount: Math.round(data.donationAmount * 100) / 100,
        passCount: data.passCount,
        donationCount: data.donationCount,
        memberConversions: data.memberConversions,
      }));

    return result;
  } catch (error) {
    console.error('Error getting contribution evolution:', error);
    throw error;
  }
}

/**
 * Récupère les statistiques par type d'item/forfait
 */
export async function getItemStatistics(): Promise<ItemStatistics[]> {
  try {
    const contributions = await getAllContributions();
    const completedContributions = contributions.filter(c => c.paymentStatus === 'completed');

    // Map pour agréger par itemName
    const itemsMap = new Map<
      string,
      {
        count: number;
        totalAmount: number;
      }
    >();

    let grandTotal = 0;

    completedContributions.forEach((contrib) => {
      const itemName = contrib.itemName || 'Non spécifié';
      const amount = contrib.amount || 0;

      if (!itemsMap.has(itemName)) {
        itemsMap.set(itemName, {
          count: 0,
          totalAmount: 0,
        });
      }

      const item = itemsMap.get(itemName)!;
      item.count++;
      item.totalAmount += amount;
      grandTotal += amount;
    });

    // Convertir en tableau et calculer les pourcentages
    const result: ItemStatistics[] = Array.from(itemsMap.entries())
      .map(([itemName, data]) => ({
        itemName,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        percentage: grandTotal > 0 ? Math.round((data.totalAmount / grandTotal) * 1000) / 10 : 0,
        averageAmount: Math.round((data.totalAmount / data.count) * 100) / 100,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return result;
  } catch (error) {
    console.error('Error getting item statistics:', error);
    throw error;
  }
}

/**
 * Récupère la distribution géographique des contributions
 */
export async function getContributionGeographicData(): Promise<ContributionGeographicData> {
  try {
    const contributions = await getAllContributions();
    const completedContributions = contributions.filter(c => c.paymentStatus === 'completed');

    // Map pour agréger par code postal
    const postalCodesMap = new Map<
      string,
      {
        count: number;
        totalAmount: number;
      }
    >();

    completedContributions.forEach((contrib) => {
      const postalCode = contrib.contributor.codePostal || 'Non spécifié';

      if (!postalCodesMap.has(postalCode)) {
        postalCodesMap.set(postalCode, {
          count: 0,
          totalAmount: 0,
        });
      }

      const postal = postalCodesMap.get(postalCode)!;
      postal.count++;
      postal.totalAmount += contrib.amount || 0;
    });

    const totalContributions = completedContributions.length;

    // Convertir en tableau et trier par nombre de contributions
    const topPostalCodes = Array.from(postalCodesMap.entries())
      .map(([postalCode, data]) => ({
        postalCode,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        percentage: totalContributions > 0 ? Math.round((data.count / totalContributions) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    return {
      totalPostalCodes: postalCodesMap.size,
      topPostalCodes,
    };
  } catch (error) {
    console.error('Error getting geographic data:', error);
    throw error;
  }
}

/**
 * Récupère les données démographiques des contributeurs
 */
export async function getContributorDemographics(): Promise<ContributorDemographics> {
  try {
    const contributions = await getAllContributions();
    const completedContributions = contributions.filter(c => c.paymentStatus === 'completed');

    const ages: number[] = [];
    const ageRanges = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '66+': 0,
    };

    completedContributions.forEach((contrib) => {
      const birthDate = contrib.contributor.naissance;
      if (birthDate) {
        const age = calculateAge(birthDate);
        ages.push(age);

        // Catégoriser par tranche d'âge
        if (age >= 18 && age <= 25) ageRanges['18-25']++;
        else if (age >= 26 && age <= 35) ageRanges['26-35']++;
        else if (age >= 36 && age <= 45) ageRanges['36-45']++;
        else if (age >= 46 && age <= 55) ageRanges['46-55']++;
        else if (age >= 56 && age <= 65) ageRanges['56-65']++;
        else if (age >= 66) ageRanges['66+']++;
      }
    });

    const averageAge = ages.length > 0
      ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
      : 0;

    return {
      averageAge,
      byAgeRange: ageRanges,
    };
  } catch (error) {
    console.error('Error getting contributor demographics:', error);
    throw error;
  }
}

/**
 * Récupère les dernières contributions récentes
 */
export async function getRecentContributions(limitCount: number = 10): Promise<RecentContribution[]> {
  try {
    const contributionsRef = collection(db, CONTRIBUTIONS_COLLECTION);
    const q = query(
      contributionsRef,
      where('paymentStatus', '==', 'completed'),
      orderBy('paidAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    const recentContributions: RecentContribution[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      recentContributions.push({
        id: doc.id,
        contributorName: `${data.contributor?.prenom || ''} ${data.contributor?.nom || ''}`.trim(),
        contributorPseudo: data.contributor?.pseudo || '',
        contributorEmail: data.contributor?.email || '',
        amount: data.amount || 0,
        itemName: data.itemName || 'Non spécifié',
        type: data.type || 'donation',
        paidAt: data.paidAt,
        isMember: data.isMember || false,
      });
    });

    return recentContributions;
  } catch (error) {
    console.error('Error getting recent contributions:', error);
    throw error;
  }
}

/**
 * Exporte les contributions au format CSV
 */
export async function exportContributionsCSV(
  startDate: Date,
  endDate: Date,
  includePersonalInfo: boolean = true
): Promise<void> {
  try {
    const contributions = await getAllContributions();

    const filteredContributions = contributions.filter((contrib) => {
      const contribDate = toDate(contrib.paidAt);
      return (
        contribDate &&
        contribDate >= startDate &&
        contribDate <= endDate &&
        contrib.paymentStatus === 'completed'
      );
    });

    // Préparer les données CSV
    const headers = includePersonalInfo
      ? ['Date', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Code Postal', 'Article', 'Montant', 'Type', 'Membre', 'Commentaire']
      : ['Date', 'Article', 'Montant', 'Type', 'Membre', 'Code Postal'];

    const rows = filteredContributions.map((contrib) => {
      const date = toDate(contrib.paidAt);
      const formattedDate = date ? date.toLocaleDateString('fr-FR') : '';

      if (includePersonalInfo) {
        return [
          formattedDate,
          contrib.contributor.nom || '',
          contrib.contributor.prenom || '',
          contrib.contributor.email || '',
          contrib.contributor.telephone || '',
          contrib.contributor.codePostal || '',
          contrib.itemName || '',
          contrib.amount?.toString() || '0',
          contrib.type || '',
          contrib.isMember ? 'Oui' : 'Non',
          contrib.contributor.commentaire || '',
        ];
      } else {
        return [
          formattedDate,
          contrib.itemName || '',
          contrib.amount?.toString() || '0',
          contrib.type || '',
          contrib.isMember ? 'Oui' : 'Non',
          contrib.contributor.codePostal || '',
        ];
      }
    });

    // Créer le CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Télécharger le fichier
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const fileName = `contributions_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting contributions CSV:', error);
    throw error;
  }
}
