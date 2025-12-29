import React from 'react';
import {
  IconDashboard,
  IconUsers,
  IconTicket,
  IconCalendar,
  IconBuildingCommunity,
  IconSettings,
  IconMail,
  IconQrcode,
  IconChartBar,
  IconCurrencyEuro,
  IconMapPin,
  IconHeart,
  IconShoppingCart,
  IconChartPie,
  IconHeadset,
} from '@tabler/icons-react';
import { AdminPermission, AdminRole } from '../../shared/types/admin';

export interface SubMenuItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  requiredPermission?: AdminPermission;
}

export interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  badge?: number;
  submenu?: SubMenuItem[];
  isExternal?: boolean;
  requiredPermission?: AdminPermission;
  /** Rôles qui ne doivent PAS voir ce menu (même s'ils ont la permission) */
  excludeRoles?: AdminRole[];
}

export const navigationItems: NavItem[] = [
  {
    icon: IconDashboard,
    label: 'Dashboard',
    path: '/admin/dashboard',
    // Accessible à tous les rôles admin (pas de permission requise)
  },
  {
    icon: IconUsers,
    label: 'Utilisateurs',
    path: '/admin/users',
    requiredPermission: AdminPermission.USERS_VIEW,
  },
  {
    icon: IconTicket,
    label: 'Abonnements',
    path: '/admin/memberships',
    requiredPermission: AdminPermission.MEMBERSHIPS_VIEW,
  },
  {
    icon: IconCalendar,
    label: 'Événements',
    path: '/admin/events',
    requiredPermission: AdminPermission.EVENTS_VIEW,
  },
  {
    icon: IconTicket,
    label: 'Soirée Inkipit',
    path: '/admin/events/inkipit',
    requiredPermission: AdminPermission.EVENTS_VIEW,
  },
  {
    icon: IconBuildingCommunity,
    label: 'Coworking',
    path: '/admin/coworking',
    requiredPermission: AdminPermission.COWORKING_VIEW,
  },
  {
    icon: IconChartPie,
    label: 'Gestion Crowdfunding',
    path: '/admin/crowdfunding',
    requiredPermission: AdminPermission.ANALYTICS_VIEW, // Temporaire, créer une permission dédiée si nécessaire
  },
  {
    icon: IconQrcode,
    label: 'Scanner QR',
    path: '/scanner',
    isExternal: true,
    requiredPermission: AdminPermission.CHECKIN_SCAN,
  },
  {
    icon: IconHeadset,
    label: 'Mes Demandes Support',
    path: '/admin/support',
    requiredPermission: AdminPermission.TICKETS_VIEW,
    excludeRoles: [AdminRole.DEVELOPPEUR], // Le développeur gère les tickets, il n'en crée pas
  },
  {
    icon: IconTicket,
    label: 'Gestion Tickets',
    path: '/admin/tickets',
    requiredPermission: AdminPermission.TICKETS_MANAGE,
  },
  {
    icon: IconMail,
    label: 'Campagnes Email',
    path: '/admin/campaigns',
    requiredPermission: AdminPermission.USERS_VIEW, // Pour envoyer des emails, il faut voir les users
  },
  {
    icon: IconChartBar,
    label: 'Analytics',
    path: '/admin/analytics',
    requiredPermission: AdminPermission.ANALYTICS_VIEW,
    submenu: [
      {
        icon: IconDashboard,
        label: 'Vue d\'ensemble',
        path: '/admin/analytics/overview',
        requiredPermission: AdminPermission.ANALYTICS_VIEW,
      },
      {
        icon: IconCurrencyEuro,
        label: 'Comptabilité',
        path: '/admin/analytics/financial',
        requiredPermission: AdminPermission.ANALYTICS_FINANCIAL,
      },
      {
        icon: IconMapPin,
        label: 'Démographie',
        path: '/admin/analytics/demographics',
        requiredPermission: AdminPermission.ANALYTICS_VIEW,
      },
      {
        icon: IconHeart,
        label: 'Engagement',
        path: '/admin/analytics/engagement',
        requiredPermission: AdminPermission.ANALYTICS_VIEW,
      },
      {
        icon: IconCalendar,
        label: 'Événements',
        path: '/admin/analytics/events',
        requiredPermission: AdminPermission.ANALYTICS_VIEW,
      },
      {
        icon: IconShoppingCart,
        label: 'Crowdfunding',
        path: '/admin/analytics/contributions',
        requiredPermission: AdminPermission.ANALYTICS_VIEW,
      },
    ],
  },
  {
    icon: IconSettings,
    label: 'Paramètres',
    path: '/admin/settings',
    requiredPermission: AdminPermission.SETTINGS_VIEW,
  },
];
