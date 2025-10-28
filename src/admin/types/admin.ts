/**
 * Admin Panel Types
 * Professional type definitions for admin operations
 */

export interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  permissions: AdminPermission[];
  createdAt: string;
  lastLogin?: string;
}

export type AdminPermission =
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'memberships:read'
  | 'memberships:write'
  | 'events:read'
  | 'events:write'
  | 'events:delete'
  | 'coworking:read'
  | 'coworking:write'
  | 'coworking:delete'
  | 'analytics:read'
  | 'settings:write';

export interface DashboardStats {
  totalUsers: number;
  activeMembers: number;
  totalRevenue: number;
  totalEvents: number;
  totalLoyaltyPoints: number;
  revenueChange: number; // Percentage change
  membersChange: number; // Percentage change
  eventsChange: number; // Percentage change
}

export interface RevenueData {
  month: string;
  revenue: number;
  subscriptions: number;
  events: number;
}

export interface MembershipDistribution {
  type: 'monthly' | 'annual' | 'honorary';
  count: number;
  revenue: number;
  percentage: number;
}

export interface RecentActivity {
  id: string;
  type: 'user_registered' | 'subscription_created' | 'event_created' | 'user_updated';
  description: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UserFilters {
  search?: string;
  membershipType?: 'monthly' | 'annual' | 'honorary' | 'all';
  membershipStatus?: 'active' | 'inactive' | 'pending' | 'expired' | 'all';
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface TableSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
