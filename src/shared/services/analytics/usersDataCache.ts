/**
 * Unified Users Data Cache
 * 
 * This cache provides a single source of truth for users data across all analytics services.
 * Instead of each service making its own getDocs(users) call, they all share this cache.
 * 
 * Benefits:
 * - Reduces Firestore reads from 7+ per page load to 1 per TTL period
 * - Dashboard loads in <5 seconds instead of 30+ seconds
 * - Memory-efficient with TTL-based invalidation
 */

import { collection, getDocs } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';

const USERS_COLLECTION = 'users';
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedUser {
    id: string;
    data: DocumentData;
}

interface CacheState {
    users: CachedUser[];
    lastFetch: number | null;
    isFetching: boolean;
    fetchPromise: Promise<CachedUser[]> | null;
}

// Singleton cache state
const cache: CacheState = {
    users: [],
    lastFetch: null,
    isFetching: false,
    fetchPromise: null,
};

/**
 * Check if cache is still valid based on TTL
 */
function isCacheValid(ttlMs: number = DEFAULT_TTL_MS): boolean {
    if (!cache.lastFetch || cache.users.length === 0) {
        return false;
    }
    return Date.now() - cache.lastFetch < ttlMs;
}

/**
 * Fetch users from Firestore and update cache
 */
async function fetchAndCacheUsers(): Promise<CachedUser[]> {
    console.log('[UsersCache] Fetching users from Firestore...');
    const startTime = performance.now();

    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const users: CachedUser[] = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data(),
    }));

    cache.users = users;
    cache.lastFetch = Date.now();

    const duration = Math.round(performance.now() - startTime);
    console.log(`[UsersCache] Fetched ${users.length} users in ${duration}ms`);

    return users;
}

/**
 * Get users from cache or fetch if needed
 * 
 * This function ensures that only one fetch happens at a time, even if called
 * concurrently by multiple services.
 * 
 * @param forceRefresh - If true, ignore cache and fetch fresh data
 * @param ttlMs - Cache TTL in milliseconds (default: 10 minutes)
 */
export async function getUsers(forceRefresh = false, ttlMs = DEFAULT_TTL_MS): Promise<CachedUser[]> {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid(ttlMs)) {
        console.log('[UsersCache] Returning cached data');
        return cache.users;
    }

    // If a fetch is already in progress, wait for it
    if (cache.isFetching && cache.fetchPromise) {
        console.log('[UsersCache] Waiting for existing fetch...');
        return cache.fetchPromise;
    }

    // Start a new fetch
    cache.isFetching = true;
    cache.fetchPromise = fetchAndCacheUsers()
        .finally(() => {
            cache.isFetching = false;
            cache.fetchPromise = null;
        });

    return cache.fetchPromise;
}

/**
 * Pre-fetch users data to warm up the cache
 * Call this on app startup or before loading heavy pages
 */
export async function warmup(): Promise<void> {
    if (!isCacheValid()) {
        await getUsers();
    }
}

/**
 * Invalidate the cache to force a refresh on next access
 */
export function invalidate(): void {
    console.log('[UsersCache] Cache invalidated');
    cache.users = [];
    cache.lastFetch = null;
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
    userCount: number;
    lastFetch: Date | null;
    ageMs: number | null;
    isValid: boolean;
} {
    return {
        userCount: cache.users.length,
        lastFetch: cache.lastFetch ? new Date(cache.lastFetch) : null,
        ageMs: cache.lastFetch ? Date.now() - cache.lastFetch : null,
        isValid: isCacheValid(),
    };
}

/**
 * Get users data as a simple array of document data with IDs
 * This is the format most services expect
 */
export async function getUsersData(forceRefresh = false): Promise<Array<{ id: string } & DocumentData>> {
    const users = await getUsers(forceRefresh);
    return users.map(u => ({ id: u.id, ...u.data }));
}

// Export types for use in other services
export type { CachedUser };
