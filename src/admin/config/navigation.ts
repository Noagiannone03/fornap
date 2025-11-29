import React from 'react';
import {
  IconDashboard,
  IconUsers,
  IconTicket,
  IconCalendar,
  IconBuildingCommunity,
  IconSettings,
  IconMail,
  IconBug,
  IconQrcode,
  IconChartBar,
  IconCurrencyEuro,
  IconMapPin,
  IconHeart,
  IconShoppingCart,
  IconChartPie,
} from '@tabler/icons-react';

export interface SubMenuItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
}

export interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  badge?: number;
  submenu?: SubMenuItem[];
  isExternal?: boolean;
}

export const navigationItems: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: IconUsers, label: 'Utilisateurs', path: '/admin/users' },
  { icon: IconTicket, label: 'Abonnements', path: '/admin/memberships' },
  { icon: IconCalendar, label: 'Événements', path: '/admin/events' },
  { icon: IconBuildingCommunity, label: 'Coworking', path: '/admin/coworking' },
  { icon: IconChartPie, label: 'Crowdfunding', path: '/admin/crowdfunding' },
  { icon: IconQrcode, label: 'Scanner QR', path: '/scanner', isExternal: true },
  {
    icon: IconMail,
    label: 'Campagnes Email',
    path: '/admin/campaigns',
    submenu: [
      { icon: IconMail, label: 'Liste des campagnes', path: '/admin/campaigns' },
      { icon: IconBug, label: 'Diagnostics Email', path: '/admin/campaigns/diagnostics' },
    ],
  },
  {
    icon: IconChartBar,
    label: 'Analytics',
    path: '/admin/analytics',
    submenu: [
      { icon: IconDashboard, label: 'Vue d\'ensemble', path: '/admin/analytics/overview' },
      { icon: IconCurrencyEuro, label: 'Comptabilité', path: '/admin/analytics/financial' },
      { icon: IconMapPin, label: 'Démographie', path: '/admin/analytics/demographics' },
      { icon: IconHeart, label: 'Engagement', path: '/admin/analytics/engagement' },
      { icon: IconCalendar, label: 'Événements', path: '/admin/analytics/events' },
      { icon: IconShoppingCart, label: 'Contributions', path: '/admin/analytics/contributions' },
    ],
  },
  { icon: IconSettings, label: 'Paramètres', path: '/admin/settings' },
];
