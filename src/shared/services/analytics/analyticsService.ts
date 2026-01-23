/**
 * Analytics Service - Main Entry Point
 * 
 * Provides overview KPIs for the dashboard.
 * Uses centralized utils and shared cache for consistent calculations.
 */

import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { OverviewKPIs } from '../../types/user';
import { getUsers } from './usersDataCache';
import {
  toDate,
  calculateAge,
  isValidAge,
  normalizePlanType,
} from './analyticsUtils';

const ANALYTICS_CACHE_DOC = 'analytics/summary';

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Retrieves cached KPIs if recent (< 1 hour)
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

      // Cache valid for 1 hour
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
 * Saves KPIs to Firestore cache
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

// ============================================================================
// KPI Calculation
// ============================================================================

/**
 * Calculates all KPIs in a single pass over cached user data
 * Uses centralized utils for consistent calculations
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

  // Age calculation - using centralized functions
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

    // Age calculation - using centralized functions for consistency
    if (data.birthDate) {
      const age = calculateAge(data.birthDate);
      // Use centralized validation - SAME as demographicAnalytics
      if (isValidAge(age)) {
        totalAge += age;
        ageCount++;
      }
    }

    // Renewal rate
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
    averageAge: Math.round(averageAge),
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

// ============================================================================
// Public API
// ============================================================================

/**
 * Retrieves all KPIs for the main dashboard
 * Uses shared user cache for performance
 * 
 * @param forceRefresh If true, bypass cache and recalculate
 */
export async function getOverviewKPIs(forceRefresh = false): Promise<OverviewKPIs> {
  try {
    // 1. Try Firestore cache (unless forced)
    if (!forceRefresh) {
      const cached = await getCachedKPIs();
      if (cached) {
        console.log('[OverviewKPIs] Returning Firestore cached KPIs');
        return cached;
      }
    }

    console.log('[OverviewKPIs] Calculating from users cache...');

    // 2. Use shared user data cache
    const users = await getUsers(forceRefresh);

    // 3. Calculate all KPIs in single pass
    const result = calculateAllKPIsFromUsers(users);

    // 4. Update Firestore cache (background)
    cacheKPIs(result);

    return result;
  } catch (error) {
    console.error('Error getting overview KPIs:', error);
    throw error;
  }
}

/**
 * Fast stats retrieval for search (cache only)
 */
export async function getStatsForSearch(): Promise<OverviewKPIs | null> {
  return getCachedKPIs();
}

/**
 * Export all analytics functions
 */
export * from './membershipAnalytics';
export * from './demographicAnalytics';
export * from './engagementAnalytics';
export * from './financialAnalytics';
export * from './exportService';
export * from './usersDataCache';
