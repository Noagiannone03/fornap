import { useState, useEffect } from 'react';
import type { MembershipPlan, MembershipPlanWithStats } from '../types/membership';
import {
  getAllMembershipPlans,
  getMembershipPlansWithStats,
} from '../services/membershipService';

/**
 * Hook pour récupérer les formules d'abonnement
 */
export function useMembershipPlans(onlyActive: boolean = false) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const data = await getAllMembershipPlans(onlyActive);
        setPlans(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching membership plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [onlyActive]);

  return { plans, loading, error };
}

/**
 * Hook pour récupérer les formules d'abonnement avec statistiques
 */
export function useMembershipPlansWithStats(onlyActive: boolean = false) {
  const [plans, setPlans] = useState<MembershipPlanWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await getMembershipPlansWithStats(onlyActive);
      setPlans(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching membership plans with stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [onlyActive]);

  return { plans, loading, error, refresh };
}
