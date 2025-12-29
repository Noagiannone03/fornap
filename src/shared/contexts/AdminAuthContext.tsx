/**
 * ============================================
 * ADMIN AUTHENTICATION CONTEXT
 * ============================================
 * Contexte d'authentification séparé pour les administrateurs
 * Complètement indépendant du AuthContext utilisateur
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  getAdminById,
  getAdminByEmail,
  updateLastLogin,
  logFailedLogin,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
} from '../services/adminService';
import { AdminPermission, AdminRole } from '../types/admin';
import type { AdminUser } from '../types/admin';

// ============================================
// TYPES
// ============================================

interface AdminAuthContextType {
  /** Utilisateur Firebase Auth actuel */
  currentUser: FirebaseUser | null;

  /** Profil admin complet */
  adminProfile: AdminUser | null;

  /** État de chargement */
  loading: boolean;

  /** Connexion admin */
  login: (email: string, password: string) => Promise<void>;

  /** Déconnexion admin */
  logout: () => Promise<void>;

  /** Changer le mot de passe */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  /** Vérifie si l'admin a une permission */
  checkPermission: (permission: AdminPermission) => boolean;

  /** Vérifie si l'admin a toutes les permissions */
  checkAllPermissions: (permissions: AdminPermission[]) => boolean;

  /** Vérifie si l'admin a au moins une permission */
  checkAnyPermission: (permissions: AdminPermission[]) => boolean;

  /** Récupère toutes les permissions de l'admin */
  getPermissions: () => AdminPermission[];

  /** Vérifie si l'admin est actif */
  isActive: boolean;

  /** Vérifie si l'admin est authentifié */
  isAuthenticated: boolean;
}

// ============================================
// CONTEXT
// ============================================

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Charge le profil admin depuis Firestore
   */
  const loadAdminProfile = async (user: FirebaseUser) => {
    try {
      const admin = await getAdminById(user.uid);

      if (!admin) {
        // L'utilisateur n'est pas un admin
        console.warn('User is not an admin');
        setAdminProfile(null);
        setCurrentUser(null);
        await signOut(auth);
        return;
      }

      if (!admin.isActive) {
        // Le compte admin est désactivé
        console.warn('Admin account is inactive');
        setAdminProfile(null);
        setCurrentUser(null);
        await signOut(auth);
        throw new Error('Votre compte administrateur a été désactivé');
      }

      setAdminProfile(admin);
      setCurrentUser(user);

      // Mettre à jour la dernière connexion
      await updateLastLogin(user.uid);
    } catch (error) {
      console.error('Error loading admin profile:', error);
      setAdminProfile(null);
      setCurrentUser(null);
      throw error;
    }
  };

  /**
   * Effet pour écouter les changements d'authentification
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await loadAdminProfile(user);
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      } else {
        setCurrentUser(null);
        setAdminProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * Connexion admin
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);

      // Vérifier d'abord si l'email appartient à un admin
      const admin = await getAdminByEmail(email);
      if (!admin) {
        await logFailedLogin(email, 'Email non trouvé dans la collection admins');
        throw new Error('Accès refusé. Vous n\'êtes pas autorisé à accéder au panel admin.');
      }

      if (!admin.isActive) {
        await logFailedLogin(email, 'Compte désactivé');
        throw new Error('Votre compte administrateur a été désactivé. Contactez un administrateur.');
      }

      // Authentification Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Charger le profil admin
      await loadAdminProfile(userCredential.user);
    } catch (error: any) {
      console.error('Login error:', error);

      // Messages d'erreur Firebase traduits
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        throw new Error('Email ou mot de passe incorrect');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Trop de tentatives de connexion. Réessayez plus tard.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email invalide');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('Ce compte a été désactivé');
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Déconnexion admin
   */
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setAdminProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Erreur lors de la deconnexion');
    }
  };

  /**
   * Changer le mot de passe de l'admin connecte
   */
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!currentUser || !currentUser.email) {
      throw new Error('Vous devez etre connecte pour changer votre mot de passe');
    }

    try {
      // Reauthentifier l'utilisateur avec son mot de passe actuel
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Mettre a jour le mot de passe
      await updatePassword(currentUser, newPassword);
    } catch (error: any) {
      console.error('Change password error:', error);

      // Messages d'erreur Firebase traduits
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('Mot de passe actuel incorrect');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Le nouveau mot de passe est trop faible (minimum 6 caracteres)');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Session expiree. Veuillez vous reconnecter et reessayer.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Trop de tentatives. Veuillez reessayer plus tard.');
      }

      throw new Error('Erreur lors du changement de mot de passe');
    }
  };

  /**
   * Vérifie si l'admin a une permission
   */
  const checkPermission = (permission: AdminPermission): boolean => {
    if (!adminProfile) return false;
    return hasPermission(adminProfile.role, permission);
  };

  /**
   * Vérifie si l'admin a toutes les permissions
   */
  const checkAllPermissions = (permissions: AdminPermission[]): boolean => {
    if (!adminProfile) return false;
    return hasAllPermissions(adminProfile.role, permissions);
  };

  /**
   * Vérifie si l'admin a au moins une permission
   */
  const checkAnyPermission = (permissions: AdminPermission[]): boolean => {
    if (!adminProfile) return false;
    return hasAnyPermission(adminProfile.role, permissions);
  };

  /**
   * Récupère toutes les permissions de l'admin
   */
  const getPermissions = (): AdminPermission[] => {
    if (!adminProfile) return [];
    return getRolePermissions(adminProfile.role);
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const isActive = adminProfile?.isActive ?? false;
  const isAuthenticated = currentUser !== null && adminProfile !== null && isActive;

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AdminAuthContextType = {
    currentUser,
    adminProfile,
    loading,
    login,
    logout,
    changePassword,
    checkPermission,
    checkAllPermissions,
    checkAnyPermission,
    getPermissions,
    isActive,
    isAuthenticated,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================

/**
 * Hook pour utiliser le contexte d'authentification admin
 */
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

// ============================================
// PERMISSION GUARD COMPONENT
// ============================================

interface PermissionGuardProps {
  children: ReactNode;
  permission?: AdminPermission;
  permissions?: AdminPermission[];
  requireAll?: boolean; // Si true, requiert toutes les permissions, sinon au moins une
  fallback?: ReactNode;
}

/**
 * Composant pour afficher du contenu basé sur les permissions
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGuardProps) {
  const { checkPermission, checkAllPermissions, checkAnyPermission } = useAdminAuth();

  let hasAccess = false;

  if (permission) {
    hasAccess = checkPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? checkAllPermissions(permissions)
      : checkAnyPermission(permissions);
  }

  return <>{hasAccess ? children : fallback}</>;
}

// ============================================
// ROLE GUARD COMPONENT
// ============================================

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AdminRole[];
  fallback?: ReactNode;
}

/**
 * Composant pour afficher du contenu basé sur le rôle
 */
export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { adminProfile } = useAdminAuth();

  if (!adminProfile || !allowedRoles.includes(adminProfile.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
