/**
 * Membership Plan Management Types
 * Professional type definitions for membership plans
 */

export interface MembershipPlan {
  id: string;
  name: string;
  type: 'monthly' | 'annual' | 'honorary';
  description: string;

  // Pricing
  price: number;
  currency: string;
  billingPeriod: 'month' | 'year' | 'lifetime';

  // Features
  features: PlanFeature[];
  benefits: string[];

  // Limits
  limits: PlanLimits;

  // Settings
  isActive: boolean;
  isVisible: boolean;
  isPrimary: boolean; // Highlighted plan
  order: number; // Display order

  // Styling
  color?: string;
  icon?: string;
  badge?: string; // e.g., "Most Popular", "Best Value"

  // Metadata
  subscriberCount: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeature {
  id: string;
  name: string;
  description?: string;
  included: boolean;
  limit?: number | 'unlimited';
  icon?: string;
}

export interface PlanLimits {
  eventsPerMonth: number | 'unlimited';
  coworkingHoursPerMonth: number | 'unlimited';
  guestPasses: number | 'unlimited';
  priorityBooking: boolean;
  discountPercentage: number;
  accessToExclusiveEvents: boolean;
}

export interface MembershipStats {
  planId: string;
  planName: string;
  activeSubscribers: number;
  newThisMonth: number;
  cancelledThisMonth: number;
  renewalRate: number; // Percentage
  monthlyRevenue: number;
  totalRevenue: number;
  averageLifetimeValue: number;
}

export interface SubscriptionHistory {
  userId: string;
  userName: string;
  planId: string;
  planName: string;
  status: 'active' | 'inactive' | 'pending' | 'expired';
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  totalPaid: number;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
}
