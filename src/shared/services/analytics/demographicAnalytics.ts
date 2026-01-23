/**
 * Demographic Analytics Service
 * 
 * Provides age distribution, geographic distribution, and professional statistics.
 * Uses centralized utils and shared cache for consistent calculations.
 */

import type {
  AgeDistributionData,
  GeographicData,
  ProfessionalData,
} from '../../types/user';
import { getUsers } from './usersDataCache';
import {
  toDate,
  calculateAge,
  isValidAge,
  getAgeRange,
  normalizePlanType,
  calculateAgeStatistics,
} from './analyticsUtils';

// ============================================================================
// Age Distribution
// ============================================================================

/**
 * Analyzes age distribution of all users
 * Uses the shared user cache for consistent data across all analytics pages
 */
export async function getAgeDistribution(): Promise<AgeDistributionData> {
  try {
    // Use shared cache instead of direct Firestore query
    const users = await getUsers();

    const byRange: AgeDistributionData['byRange'] = {
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

    // Process users
    for (const user of users) {
      const data = user.data;
      if (data.birthDate) {
        const birthDate = toDate(data.birthDate);
        if (!birthDate) continue;

        const age = calculateAge(birthDate);

        // Use centralized validation - this ensures same filtering as analyticsService
        if (!isValidAge(age)) continue;

        const range = getAgeRange(age);
        byRange[range]++;

        // Handle membership type distribution
        if (data.currentMembership?.planType) {
          const membershipType = normalizePlanType(data.currentMembership.planType);
          if (membershipType === 'monthly') byRangeAndType[range].monthly++;
          else if (membershipType === 'annual') byRangeAndType[range].annual++;
          else if (membershipType === 'lifetime') byRangeAndType[range].lifetime++;
        }
      }
    }

    // Use centralized age statistics calculation
    const ageStats = calculateAgeStatistics(users);

    return {
      averageAge: ageStats.averageAge,
      medianAge: ageStats.medianAge,
      byRange,
      byRangeAndType,
    };
  } catch (error) {
    console.error('Error getting age distribution:', error);
    throw error;
  }
}

// ============================================================================
// Geographic Distribution
// ============================================================================

/**
 * Analyzes geographic distribution by postal code
 */
export async function getGeographicDistribution(): Promise<GeographicData> {
  try {
    // Use shared cache
    const users = await getUsers();

    const postalCodeMap = new Map<
      string,
      { monthly: number; annual: number; lifetime: number }
    >();

    for (const user of users) {
      const data = user.data;
      const postalCode = data.postalCode;

      // Skip if no postal code or membership
      if (!data.currentMembership?.planType || !postalCode) continue;

      const membershipType = normalizePlanType(data.currentMembership.planType);

      if (!postalCodeMap.has(postalCode)) {
        postalCodeMap.set(postalCode, { monthly: 0, annual: 0, lifetime: 0 });
      }

      const codeData = postalCodeMap.get(postalCode)!;

      if (membershipType === 'monthly') codeData.monthly++;
      else if (membershipType === 'annual') codeData.annual++;
      else if (membershipType === 'lifetime') codeData.lifetime++;
    }

    // Calculate totals and percentages
    const totalUsers = users.length;
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

// ============================================================================
// Professional Distribution
// ============================================================================

/**
 * Analyzes professional distribution (extended profiles only)
 */
export async function getProfessionalDistribution(): Promise<ProfessionalData> {
  try {
    // Use shared cache
    const users = await getUsers();

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

    for (const user of users) {
      const data = user.data;

      if (data.extendedProfile?.professional) {
        totalWithExtendedProfile++;
        const prof = data.extendedProfile.professional;

        // Professional status
        if (prof.status) {
          byStatus[prof.status as keyof typeof byStatus]++;
        }

        // Profession
        if (prof.profession) {
          const currentCount = professionsMap.get(prof.profession) || 0;
          professionsMap.set(prof.profession, currentCount + 1);
        }

        // Activity domain
        if (prof.activityDomain) {
          const currentCount = domainsMap.get(prof.activityDomain) || 0;
          domainsMap.set(prof.activityDomain, currentCount + 1);
        }
      }
    }

    // Top professions
    const topProfessions = Array.from(professionsMap.entries())
      .map(([profession, count]) => ({ profession, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top activity domains
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
