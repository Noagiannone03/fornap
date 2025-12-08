import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type {
  AgeDistributionData,
  GeographicData,
  ProfessionalData,
} from '../../types/user';

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
 * Calcule l'âge d'un utilisateur à partir de sa date de naissance
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Détermine la tranche d'âge
 */
function getAgeRange(age: number): keyof AgeDistributionData['byRange'] {
  if (age >= 18 && age <= 25) return '18-25';
  if (age >= 26 && age <= 35) return '26-35';
  if (age >= 36 && age <= 45) return '36-45';
  if (age >= 46 && age <= 55) return '46-55';
  if (age >= 56 && age <= 65) return '56-65';
  return '66+';
}

/**
 * Analyse la distribution des âges
 */
export async function getAgeDistribution(): Promise<AgeDistributionData> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const ages: number[] = [];
    const byRange = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '66+': 0,
    };

    const byRangeAndType: AgeDistributionData['byRangeAndType'] = {
      '18-25': { monthly: 0, annual: 0, lifetime: 0 },
      '26-35': { monthly: 0, annual: 0, lifetime: 0 },
      '36-45': { monthly: 0, annual: 0, lifetime: 0 },
      '46-55': { monthly: 0, annual: 0, lifetime: 0 },
      '56-65': { monthly: 0, annual: 0, lifetime: 0 },
      '66+': { monthly: 0, annual: 0, lifetime: 0 },
    };

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.birthDate) {
        const birthDate = toDate(data.birthDate);
        if (!birthDate) return; // Skip si la conversion échoue

        const age = calculateAge(birthDate);
        ages.push(age);

        const range = getAgeRange(age);
        byRange[range]++;

        // Vérifier que currentMembership existe
        if (data.currentMembership?.planType) {
          const membershipType = normalizePlanType(data.currentMembership.planType);
          if (membershipType === 'monthly') byRangeAndType[range].monthly++;
          else if (membershipType === 'annual') byRangeAndType[range].annual++;
          else if (membershipType === 'lifetime') byRangeAndType[range].lifetime++;
        }
      }
    });

    // Calculer moyenne et médiane
    let averageAge = 0;
    let medianAge = 0;

    if (ages.length > 0) {
      averageAge = Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length);

      const sortedAges = ages.sort((a, b) => a - b);
      const mid = Math.floor(sortedAges.length / 2);
      medianAge =
        sortedAges.length % 2 === 0
          ? Math.round((sortedAges[mid - 1] + sortedAges[mid]) / 2)
          : sortedAges[mid];
    }

    return {
      averageAge,
      medianAge,
      byRange,
      byRangeAndType,
    };
  } catch (error) {
    console.error('Error getting age distribution:', error);
    throw error;
  }
}

/**
 * Analyse la distribution géographique
 */
export async function getGeographicDistribution(): Promise<GeographicData> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const postalCodeMap = new Map<
      string,
      { monthly: number; annual: number; lifetime: number }
    >();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const postalCode = data.postalCode;

      // Vérifier que currentMembership existe
      if (!data.currentMembership?.planType || !postalCode) return;

      const membershipType = normalizePlanType(data.currentMembership.planType);

      if (!postalCodeMap.has(postalCode)) {
        postalCodeMap.set(postalCode, { monthly: 0, annual: 0, lifetime: 0 });
      }

      const codeData = postalCodeMap.get(postalCode)!;

      if (membershipType === 'monthly') codeData.monthly++;
      else if (membershipType === 'annual') codeData.annual++;
      else if (membershipType === 'lifetime') codeData.lifetime++;
    });

    // Calculer les totaux et pourcentages
    const totalUsers = snapshot.size;
    const topPostalCodes = Array.from(postalCodeMap.entries())
      .map(([postalCode, byType]) => {
        const count = byType.monthly + byType.annual + byType.lifetime;
        return {
          postalCode,
          count,
          percentage: Math.round((count / totalUsers) * 1000) / 10,
          byType,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20

    return {
      totalPostalCodes: postalCodeMap.size,
      topPostalCodes,
    };
  } catch (error) {
    console.error('Error getting geographic distribution:', error);
    throw error;
  }
}

/**
 * Analyse la distribution professionnelle (uniquement profils étendus)
 */
export async function getProfessionalDistribution(): Promise<ProfessionalData> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const byStatus = {
      salaried: 0,
      independent: 0,
      student: 0,
      retired: 0,
      unemployed: 0,
    };

    const professionsMap = new Map<string, number>();
    const domainsMap = new Map<string, number>();
    let totalWithExtendedProfile = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.extendedProfile?.professional) {
        totalWithExtendedProfile++;
        const prof = data.extendedProfile.professional;

        // Statut professionnel
        if (prof.status) {
          byStatus[prof.status as keyof typeof byStatus]++;
        }

        // Profession
        if (prof.profession) {
          const currentCount = professionsMap.get(prof.profession) || 0;
          professionsMap.set(prof.profession, currentCount + 1);
        }

        // Domaine d'activité
        if (prof.activityDomain) {
          const currentCount = domainsMap.get(prof.activityDomain) || 0;
          domainsMap.set(prof.activityDomain, currentCount + 1);
        }
      }
    });

    // Top professions
    const topProfessions = Array.from(professionsMap.entries())
      .map(([profession, count]) => ({ profession, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top domaines d'activité
    const topActivityDomains = Array.from(domainsMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalWithExtendedProfile,
      byStatus,
      topProfessions,
      topActivityDomains,
    };
  } catch (error) {
    console.error('Error getting professional distribution:', error);
    throw error;
  }
}
