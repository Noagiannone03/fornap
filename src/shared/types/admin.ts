import { Timestamp } from 'firebase/firestore';

/**
 * ============================================
 * ADMIN ROLES & PERMISSIONS SYSTEM
 * ============================================
 * Système modulaire de gestion des rôles et permissions
 * pour les administrateurs de la plateforme.
 */

// ============================================
// ROLES
// ============================================

/**
 * Rôles disponibles pour les administrateurs
 * Système hiérarchique du plus élevé au plus bas
 */
export enum AdminRole {
  /** Accès complet à toutes les fonctionnalités */
  ADMINISTRATEUR = 'administrateur',

  /** Peut créer des admins (sauf administrateur), accès complet aux données */
  CO_ADMINISTRATEUR = 'co-administrateur',

  /** Peut modifier users et events, lecture seule sur analytics */
  MODERATEUR = 'moderateur',

  /** Lecture + édition basique des users uniquement */
  SUPPORT = 'support',
}

/**
 * Configuration des rôles avec leurs métadonnées
 */
export interface RoleConfig {
  key: AdminRole;
  label: string;
  description: string;
  color: string;
  level: number; // 4 = le plus élevé
  icon?: string;
}

/**
 * Configuration complète des rôles
 * Permet de modifier facilement les rôles et leurs propriétés
 */
export const ADMIN_ROLES_CONFIG: Record<AdminRole, RoleConfig> = {
  [AdminRole.ADMINISTRATEUR]: {
    key: AdminRole.ADMINISTRATEUR,
    label: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités de la plateforme',
    color: 'red',
    level: 4,
    icon: 'shield',
  },
  [AdminRole.CO_ADMINISTRATEUR]: {
    key: AdminRole.CO_ADMINISTRATEUR,
    label: 'Co-Administrateur',
    description: 'Peut gérer les admins et accéder à toutes les données',
    color: 'orange',
    level: 3,
    icon: 'shield-half',
  },
  [AdminRole.MODERATEUR]: {
    key: AdminRole.MODERATEUR,
    label: 'Modérateur',
    description: 'Peut modifier les utilisateurs et événements',
    color: 'blue',
    level: 2,
    icon: 'user-shield',
  },
  [AdminRole.SUPPORT]: {
    key: AdminRole.SUPPORT,
    label: 'Support',
    description: 'Accès limité pour le support client',
    color: 'green',
    level: 1,
    icon: 'headset',
  },
};

// ============================================
// PERMISSIONS
// ============================================

/**
 * Permissions granulaires pour chaque fonctionnalité
 * Format: RESSOURCE_ACTION
 */
export enum AdminPermission {
  // Gestion des utilisateurs
  USERS_VIEW = 'users_view',
  USERS_CREATE = 'users_create',
  USERS_EDIT = 'users_edit',
  USERS_DELETE = 'users_delete',
  USERS_BLOCK = 'users_block',
  USERS_EXPORT = 'users_export',

  // Gestion des événements
  EVENTS_VIEW = 'events_view',
  EVENTS_CREATE = 'events_create',
  EVENTS_EDIT = 'events_edit',
  EVENTS_DELETE = 'events_delete',
  EVENTS_PUBLISH = 'events_publish',
  EVENTS_EXPORT = 'events_export',

  // Gestion des abonnements
  MEMBERSHIPS_VIEW = 'memberships_view',
  MEMBERSHIPS_CREATE = 'memberships_create',
  MEMBERSHIPS_EDIT = 'memberships_edit',
  MEMBERSHIPS_DELETE = 'memberships_delete',
  MEMBERSHIPS_RENEW = 'memberships_renew',

  // Gestion du coworking
  COWORKING_VIEW = 'coworking_view',
  COWORKING_MANAGE = 'coworking_manage',

  // Analytics
  ANALYTICS_VIEW = 'analytics_view',
  ANALYTICS_FINANCIAL = 'analytics_financial',
  ANALYTICS_EXPORT = 'analytics_export',

  // Gestion des admins
  ADMINS_VIEW = 'admins_view',
  ADMINS_CREATE = 'admins_create',
  ADMINS_EDIT = 'admins_edit',
  ADMINS_DELETE = 'admins_delete',
  ADMINS_CHANGE_ROLE = 'admins_change_role',

  // Paramètres
  SETTINGS_VIEW = 'settings_view',
  SETTINGS_EDIT = 'settings_edit',
  SETTINGS_SECURITY = 'settings_security',

  // QR Code & Check-in
  CHECKIN_SCAN = 'checkin_scan',
  CHECKIN_VIEW_HISTORY = 'checkin_view_history',

  // Historique et logs
  LOGS_VIEW = 'logs_view',
  LOGS_EXPORT = 'logs_export',
}

/**
 * Mapping des permissions par rôle
 * Système modulaire : ajouter/retirer des permissions facilement
 */
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.ADMINISTRATEUR]: [
    // Toutes les permissions
    ...Object.values(AdminPermission),
  ],

  [AdminRole.CO_ADMINISTRATEUR]: [
    // Utilisateurs
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_CREATE,
    AdminPermission.USERS_EDIT,
    AdminPermission.USERS_DELETE,
    AdminPermission.USERS_BLOCK,
    AdminPermission.USERS_EXPORT,

    // Événements
    AdminPermission.EVENTS_VIEW,
    AdminPermission.EVENTS_CREATE,
    AdminPermission.EVENTS_EDIT,
    AdminPermission.EVENTS_DELETE,
    AdminPermission.EVENTS_PUBLISH,
    AdminPermission.EVENTS_EXPORT,

    // Abonnements
    AdminPermission.MEMBERSHIPS_VIEW,
    AdminPermission.MEMBERSHIPS_CREATE,
    AdminPermission.MEMBERSHIPS_EDIT,
    AdminPermission.MEMBERSHIPS_DELETE,
    AdminPermission.MEMBERSHIPS_RENEW,

    // Coworking
    AdminPermission.COWORKING_VIEW,
    AdminPermission.COWORKING_MANAGE,

    // Analytics
    AdminPermission.ANALYTICS_VIEW,
    AdminPermission.ANALYTICS_FINANCIAL,
    AdminPermission.ANALYTICS_EXPORT,

    // Admins (peut créer sauf administrateur)
    AdminPermission.ADMINS_VIEW,
    AdminPermission.ADMINS_CREATE,
    AdminPermission.ADMINS_EDIT,
    AdminPermission.ADMINS_CHANGE_ROLE,

    // Paramètres
    AdminPermission.SETTINGS_VIEW,
    AdminPermission.SETTINGS_EDIT,

    // Check-in
    AdminPermission.CHECKIN_SCAN,
    AdminPermission.CHECKIN_VIEW_HISTORY,

    // Logs
    AdminPermission.LOGS_VIEW,
    AdminPermission.LOGS_EXPORT,
  ],

  [AdminRole.MODERATEUR]: [
    // Utilisateurs
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_EDIT,
    AdminPermission.USERS_BLOCK,

    // Événements
    AdminPermission.EVENTS_VIEW,
    AdminPermission.EVENTS_CREATE,
    AdminPermission.EVENTS_EDIT,
    AdminPermission.EVENTS_PUBLISH,

    // Abonnements (lecture seule)
    AdminPermission.MEMBERSHIPS_VIEW,

    // Coworking
    AdminPermission.COWORKING_VIEW,

    // Analytics (lecture seule)
    AdminPermission.ANALYTICS_VIEW,

    // Check-in
    AdminPermission.CHECKIN_SCAN,
    AdminPermission.CHECKIN_VIEW_HISTORY,

    // Paramètres (lecture seule)
    AdminPermission.SETTINGS_VIEW,
  ],

  [AdminRole.SUPPORT]: [
    // Utilisateurs (lecture + édition basique)
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_EDIT,

    // Événements (lecture seule)
    AdminPermission.EVENTS_VIEW,

    // Abonnements (lecture seule)
    AdminPermission.MEMBERSHIPS_VIEW,

    // Check-in
    AdminPermission.CHECKIN_SCAN,
    AdminPermission.CHECKIN_VIEW_HISTORY,
  ],
};

// ============================================
// ADMIN USER TYPE
// ============================================

/**
 * Document admin dans Firestore
 */
export interface AdminUser {
  /** UID Firebase Auth */
  uid: string;

  /** Email du compte admin */
  email: string;

  /** Prénom */
  firstName: string;

  /** Nom de famille */
  lastName: string;

  /** Rôle de l'admin */
  role: AdminRole;

  /** Compte actif ou désactivé */
  isActive: boolean;

  /** Date de création du compte */
  createdAt: Timestamp;

  /** UID de l'admin qui a créé ce compte */
  createdBy: string | null; // null pour le premier admin créé manuellement

  /** Dernière mise à jour */
  updatedAt: Timestamp;

  /** Dernière connexion */
  lastLoginAt: Timestamp | null;

  /** Métadonnées optionnelles */
  metadata?: {
    phone?: string;
    notes?: string;
    department?: string;
  };
}

/**
 * Données pour créer un admin
 */
export interface CreateAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  metadata?: {
    phone?: string;
    notes?: string;
    department?: string;
  };
}

/**
 * Données pour mettre à jour un admin
 */
export interface UpdateAdminData {
  firstName?: string;
  lastName?: string;
  role?: AdminRole;
  isActive?: boolean;
  metadata?: {
    phone?: string;
    notes?: string;
    department?: string;
  };
}

// ============================================
// ADMIN ACTION HISTORY
// ============================================

/**
 * Types d'actions trackées
 */
export enum AdminActionType {
  // Utilisateurs
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_BLOCKED = 'user_blocked',
  USER_UNBLOCKED = 'user_unblocked',

  // Événements
  EVENT_CREATED = 'event_created',
  EVENT_UPDATED = 'event_updated',
  EVENT_DELETED = 'event_deleted',
  EVENT_PUBLISHED = 'event_published',
  EVENT_CANCELLED = 'event_cancelled',

  // Abonnements
  MEMBERSHIP_CREATED = 'membership_created',
  MEMBERSHIP_UPDATED = 'membership_updated',
  MEMBERSHIP_DELETED = 'membership_deleted',
  MEMBERSHIP_RENEWED = 'membership_renewed',

  // Admins
  ADMIN_CREATED = 'admin_created',
  ADMIN_UPDATED = 'admin_updated',
  ADMIN_DELETED = 'admin_deleted',
  ADMIN_ROLE_CHANGED = 'admin_role_changed',
  ADMIN_ACTIVATED = 'admin_activated',
  ADMIN_DEACTIVATED = 'admin_deactivated',

  // Authentification
  ADMIN_LOGIN = 'admin_login',
  ADMIN_LOGOUT = 'admin_logout',
  ADMIN_LOGIN_FAILED = 'admin_login_failed',

  // Paramètres
  SETTINGS_UPDATED = 'settings_updated',

  // Autres
  DATA_EXPORTED = 'data_exported',
  BULK_ACTION = 'bulk_action',
}

/**
 * Cible d'une action admin
 */
export type AdminActionTarget = 'user' | 'event' | 'membership' | 'admin' | 'settings' | 'system';

/**
 * Entrée dans l'historique des actions admin
 */
export interface AdminActionHistory {
  /** Type d'action */
  actionType: AdminActionType;

  /** Type de ressource ciblée */
  targetType: AdminActionTarget;

  /** ID de la ressource ciblée */
  targetId: string | null;

  /** Description de l'action */
  description: string;

  /** Changements effectués (avant/après) */
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  /** Timestamp de l'action */
  timestamp: Timestamp;

  /** Adresse IP */
  ipAddress?: string;

  /** User agent */
  userAgent?: string;

  /** Données supplémentaires */
  metadata?: Record<string, any>;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Admin avec informations supplémentaires pour l'UI
 */
export interface AdminUserWithStats extends AdminUser {
  totalActions?: number;
  lastActionAt?: Timestamp;
  roleConfig: RoleConfig;
}

/**
 * Filtre pour la liste des admins
 */
export interface AdminFilters {
  role?: AdminRole[];
  isActive?: boolean;
  search?: string;
  createdBy?: string;
}

/**
 * Statistiques d'un admin
 */
export interface AdminStats {
  totalActions: number;
  actionsByType: Record<AdminActionType, number>;
  lastLoginAt: Timestamp | null;
  accountAge: number; // en jours
}
