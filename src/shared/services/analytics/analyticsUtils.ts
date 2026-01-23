/**
 * Centralized Analytics Utilities
 * 
 * This module provides a SINGLE SOURCE OF TRUTH for all analytics calculations.
 * All analytics services should import from here instead of defining their own
 * utility functions.
 * 
 * Benefits:
 * - Consistent calculations across all analytics pages
 * - No code duplication
 * - Easier maintenance and debugging
 */

import type { CachedUser } from './usersDataCache';

// ============================================================================
// Type Definitions
// ============================================================================

export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '56-65' | '66+';
export type MembershipType = 'monthly' | 'annual' | 'lifetime';

export interface AgeStatistics {
    averageAge: number;
    medianAge: number;
    validCount: number;
    totalCount: number;
}

export interface AgeRangeDistribution {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46-55': number;
    '56-65': number;
    '66+': number;
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Converts Firestore Timestamp, Date, or string to JavaScript Date object
 * Handles all possible date formats from Firestore
 */
export function toDate(value: any): Date | null {
    if (!value) return null;

    // Already a Date object
    if (value instanceof Date) return value;

    // Firestore Timestamp with toDate() method
    if (value.toDate && typeof value.toDate === 'function') {
        return value.toDate();
    }

    // Firestore Timestamp object with seconds/nanoseconds
    if (value.seconds !== undefined) {
        return new Date(value.seconds * 1000);
    }

    // String date
    if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }

    return null;
}

// ============================================================================
// Age Utilities
// ============================================================================

/**
 * Calculates age from a birth date
 * Handles both Date objects and raw Firestore values
 */
export function calculateAge(birthDate: Date | any): number {
    const date = birthDate instanceof Date ? birthDate : toDate(birthDate);
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
 * Validates if an age is within reasonable bounds
 * Used to filter out invalid data (e.g., null birthDates calculating to weird ages)
 */
export function isValidAge(age: number): boolean {
    return age > 0 && age < 120;
}

/**
 * Determines the age range bucket for a given age
 */
export function getAgeRange(age: number): AgeRange {
    if (age >= 18 && age <= 25) return '18-25';
    if (age >= 26 && age <= 35) return '26-35';
    if (age >= 36 && age <= 45) return '36-45';
    if (age >= 46 && age <= 55) return '46-55';
    if (age >= 56 && age <= 65) return '56-65';
    return '66+';
}

/**
 * Calculates comprehensive age statistics from a list of users
 * This is THE central function for all age calculations
 */
export function calculateAgeStatistics(users: CachedUser[]): AgeStatistics {
    const validAges: number[] = [];
    let totalCount = 0;

    for (const user of users) {
        const data = user.data;
        if (data.birthDate) {
            totalCount++;
            const age = calculateAge(data.birthDate);
            if (isValidAge(age)) {
                validAges.push(age);
            }
        }
    }

    if (validAges.length === 0) {
        return { averageAge: 0, medianAge: 0, validCount: 0, totalCount };
    }

    // Calculate average (rounded to whole number)
    const sum = validAges.reduce((acc, age) => acc + age, 0);
    const averageAge = Math.round(sum / validAges.length);

    // Calculate median
    const sortedAges = [...validAges].sort((a, b) => a - b);
    const mid = Math.floor(sortedAges.length / 2);
    const medianAge = sortedAges.length % 2 === 0
        ? Math.round((sortedAges[mid - 1] + sortedAges[mid]) / 2)
        : sortedAges[mid];

    return {
        averageAge,
        medianAge,
        validCount: validAges.length,
        totalCount,
    };
}

/**
 * Calculates age distribution by range from a list of users
 */
export function calculateAgeDistribution(users: CachedUser[]): AgeRangeDistribution {
    const distribution: AgeRangeDistribution = {
        '18-25': 0,
        '26-35': 0,
        '36-45': 0,
        '46-55': 0,
        '56-65': 0,
        '66+': 0,
    };

    for (const user of users) {
        const data = user.data;
        if (data.birthDate) {
            const age = calculateAge(data.birthDate);
            if (isValidAge(age)) {
                const range = getAgeRange(age);
                distribution[range]++;
            }
        }
    }

    return distribution;
}

// ============================================================================
// Membership Utilities
// ============================================================================

/**
 * Normalizes membership plan type to handle variations in data
 */
export function normalizePlanType(planType: any): MembershipType | null {
    if (!planType || planType === 'null' || planType === 'undefined') return null;

    const type = String(planType).toLowerCase().trim();

    if (type === 'monthly' || type === 'month') return 'monthly';
    if (type === 'annual' || type === 'year' || type === 'yearly') return 'annual';
    if (type === 'lifetime') return 'lifetime';

    return null;
}

/**
 * Checks if a user has an active, paid membership
 */
export function hasActiveMembership(userData: any): boolean {
    const membership = userData.currentMembership;
    if (!membership) return false;
    return membership.status === 'active' && membership.paymentStatus === 'paid';
}
