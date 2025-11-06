/**
 * ============================================
 * ADMIN SERVICE
 * ============================================
 * Service de gestion des administrateurs
 * Gère CRUD, permissions, historique des actions
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  addDoc,
  QueryConstraint,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import {
  AdminRole,
  AdminPermission,
  AdminActionType,
  ROLE_PERMISSIONS,
  ADMIN_ROLES_CONFIG,
} from '../types/admin';
import type {
  AdminUser,
  CreateAdminData,
  UpdateAdminData,
  AdminActionHistory,
  AdminUserWithStats,
  AdminFilters,
  AdminStats,
} from '../types/admin';

// ============================================
// COLLECTIONS
// ============================================

const ADMINS_COLLECTION = 'admins';
const ADMIN_ACTION_HISTORY_SUBCOLLECTION = 'actionHistory';

// ============================================
// PERMISSIONS & ROLE MANAGEMENT
// ============================================

/**
 * Vérifie si un rôle a une permission spécifique
 */
export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Vérifie si un rôle a toutes les permissions spécifiées
 */
export function hasAllPermissions(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Vérifie si un rôle a au moins une des permissions spécifiées
 */
export function hasAnyPermission(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Récupère toutes les permissions d'un rôle
 */
export function getRolePermissions(role: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Récupère la configuration d'un rôle
 */
export function getRoleConfig(role: AdminRole) {
  return ADMIN_ROLES_CONFIG[role];
}

/**
 * Vérifie si un admin peut créer un autre admin avec un certain rôle
 * Règle : Un admin ne peut créer que des admins de niveau inférieur ou égal
 */
export function canCreateAdminWithRole(creatorRole: AdminRole, targetRole: AdminRole): boolean {
  const creatorLevel = ADMIN_ROLES_CONFIG[creatorRole].level;
  const targetLevel = ADMIN_ROLES_CONFIG[targetRole].level;

  // Seul l'administrateur peut créer d'autres administrateurs
  if (targetRole === AdminRole.ADMINISTRATEUR) {
    return creatorRole === AdminRole.ADMINISTRATEUR;
  }

  return creatorLevel >= targetLevel;
}

/**
 * Vérifie si un admin peut modifier un autre admin
 * Règle : On ne peut modifier que des admins de niveau inférieur
 */
export function canModifyAdmin(modifierRole: AdminRole, targetRole: AdminRole): boolean {
  const modifierLevel = ADMIN_ROLES_CONFIG[modifierRole].level;
  const targetLevel = ADMIN_ROLES_CONFIG[targetRole].level;

  return modifierLevel > targetLevel;
}

// ============================================
// ADMIN CRUD OPERATIONS
// ============================================

/**
 * Récupère un admin par son UID
 */
export async function getAdminById(uid: string): Promise<AdminUser | null> {
  try {
    const adminRef = doc(db, ADMINS_COLLECTION, uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      return null;
    }

    return {
      uid: adminSnap.id,
      ...adminSnap.data(),
    } as AdminUser;
  } catch (error) {
    console.error('Error getting admin by ID:', error);
    throw new Error('Erreur lors de la récupération de l\'administrateur');
  }
}

/**
 * Récupère un admin par son email
 */
export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  try {
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const q = query(adminsRef, where('email', '==', email), firestoreLimit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const adminDoc = querySnapshot.docs[0];
    return {
      uid: adminDoc.id,
      ...adminDoc.data(),
    } as AdminUser;
  } catch (error) {
    console.error('Error getting admin by email:', error);
    throw new Error('Erreur lors de la récupération de l\'administrateur');
  }
}

/**
 * Crée un nouvel admin
 * @param creatorUid - UID de l'admin qui crée (null pour le premier admin)
 * @param adminData - Données du nouvel admin
 */
export async function createAdmin(
  creatorUid: string | null,
  adminData: CreateAdminData
): Promise<AdminUser> {
  try {
    // Vérifier si l'email existe déjà
    const existingAdmin = await getAdminByEmail(adminData.email);
    if (existingAdmin) {
      throw new Error('Un administrateur avec cet email existe déjà');
    }

    // Vérifier les permissions du créateur
    if (creatorUid) {
      const creator = await getAdminById(creatorUid);
      if (!creator) {
        throw new Error('Créateur introuvable');
      }

      if (!hasPermission(creator.role, AdminPermission.ADMINS_CREATE)) {
        throw new Error('Vous n\'avez pas la permission de créer des administrateurs');
      }

      if (!canCreateAdminWithRole(creator.role, adminData.role)) {
        throw new Error('Vous ne pouvez pas créer un administrateur avec ce rôle');
      }
    }

    // Créer le compte Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminData.email,
      adminData.password
    );
    const uid = userCredential.user.uid;

    // Créer le document admin dans Firestore
    const newAdmin: AdminUser = {
      uid,
      email: adminData.email,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      role: adminData.role,
      isActive: true,
      createdAt: Timestamp.now(),
      createdBy: creatorUid,
      updatedAt: Timestamp.now(),
      lastLoginAt: null,
      metadata: adminData.metadata,
    };

    const adminRef = doc(db, ADMINS_COLLECTION, uid);
    await setDoc(adminRef, newAdmin);

    // Logger l'action
    if (creatorUid) {
      await addAdminActionHistory(creatorUid, {
        actionType: AdminActionType.ADMIN_CREATED,
        targetType: 'admin',
        targetId: uid,
        description: `Création de l'admin ${adminData.firstName} ${adminData.lastName} (${adminData.role})`,
        changes: {
          after: {
            email: adminData.email,
            role: adminData.role,
          },
        },
        timestamp: Timestamp.now(),
      });
    }

    // Se déconnecter du nouveau compte pour permettre la reconnexion
    await signOut(auth);

    // Note: L'admin créateur devra se reconnecter manuellement
    // C'est une limitation de Firebase Auth côté client
    // Pour éviter cela, il faudrait utiliser Firebase Admin SDK via Cloud Functions

    return newAdmin;
  } catch (error: any) {
    console.error('Error creating admin:', error);

    // Messages d'erreur Firebase traduits
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Cet email est déjà utilisé');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Email invalide');
    }

    throw error;
  }
}

/**
 * Met à jour un admin
 */
export async function updateAdmin(
  modifierUid: string,
  targetUid: string,
  updates: UpdateAdminData
): Promise<void> {
  try {
    // Vérifier les permissions
    const modifier = await getAdminById(modifierUid);
    const target = await getAdminById(targetUid);

    if (!modifier) {
      throw new Error('Administrateur modificateur introuvable');
    }

    if (!target) {
      throw new Error('Administrateur cible introuvable');
    }

    if (!hasPermission(modifier.role, AdminPermission.ADMINS_EDIT)) {
      throw new Error('Vous n\'avez pas la permission de modifier des administrateurs');
    }

    // On ne peut pas se modifier soi-même pour éviter de se bloquer
    if (modifierUid === targetUid) {
      throw new Error('Vous ne pouvez pas modifier votre propre compte');
    }

    // Vérifier si le modifier peut modifier le target
    if (!canModifyAdmin(modifier.role, target.role)) {
      throw new Error('Vous ne pouvez pas modifier cet administrateur');
    }

    // Vérifier le changement de rôle si applicable
    if (updates.role && updates.role !== target.role) {
      if (!hasPermission(modifier.role, AdminPermission.ADMINS_CHANGE_ROLE)) {
        throw new Error('Vous n\'avez pas la permission de changer les rôles');
      }

      if (!canCreateAdminWithRole(modifier.role, updates.role)) {
        throw new Error('Vous ne pouvez pas assigner ce rôle');
      }
    }

    // Préparer les mises à jour
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // Mettre à jour dans Firestore
    const adminRef = doc(db, ADMINS_COLLECTION, targetUid);
    await updateDoc(adminRef, updateData);

    // Logger l'action
    await addAdminActionHistory(modifierUid, {
      actionType: updates.role !== target.role ? AdminActionType.ADMIN_ROLE_CHANGED : AdminActionType.ADMIN_UPDATED,
      targetType: 'admin',
      targetId: targetUid,
      description: `Modification de l'admin ${target.firstName} ${target.lastName}`,
      changes: {
        before: {
          firstName: target.firstName,
          lastName: target.lastName,
          role: target.role,
          isActive: target.isActive,
        },
        after: updates,
      },
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    throw error;
  }
}

/**
 * Désactive/Active un admin
 */
export async function toggleAdminActive(
  modifierUid: string,
  targetUid: string,
  isActive: boolean
): Promise<void> {
  try {
    await updateAdmin(modifierUid, targetUid, { isActive });

    // Logger l'action spécifique
    const target = await getAdminById(targetUid);
    if (target) {
      await addAdminActionHistory(modifierUid, {
        actionType: isActive ? AdminActionType.ADMIN_ACTIVATED : AdminActionType.ADMIN_DEACTIVATED,
        targetType: 'admin',
        targetId: targetUid,
        description: `Admin ${target.firstName} ${target.lastName} ${isActive ? 'activé' : 'désactivé'}`,
        timestamp: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error toggling admin active:', error);
    throw error;
  }
}

/**
 * Supprime un admin
 */
export async function deleteAdmin(modifierUid: string, targetUid: string): Promise<void> {
  try {
    // Vérifier les permissions
    const modifier = await getAdminById(modifierUid);
    const target = await getAdminById(targetUid);

    if (!modifier) {
      throw new Error('Administrateur modificateur introuvable');
    }

    if (!target) {
      throw new Error('Administrateur cible introuvable');
    }

    if (!hasPermission(modifier.role, AdminPermission.ADMINS_DELETE)) {
      throw new Error('Vous n\'avez pas la permission de supprimer des administrateurs');
    }

    // On ne peut pas se supprimer soi-même
    if (modifierUid === targetUid) {
      throw new Error('Vous ne pouvez pas supprimer votre propre compte');
    }

    // Vérifier si le modifier peut supprimer le target
    if (!canModifyAdmin(modifier.role, target.role)) {
      throw new Error('Vous ne pouvez pas supprimer cet administrateur');
    }

    // Logger l'action avant suppression
    await addAdminActionHistory(modifierUid, {
      actionType: AdminActionType.ADMIN_DELETED,
      targetType: 'admin',
      targetId: targetUid,
      description: `Suppression de l'admin ${target.firstName} ${target.lastName}`,
      changes: {
        before: {
          email: target.email,
          role: target.role,
        },
      },
      timestamp: Timestamp.now(),
    });

    // Supprimer de Firestore
    const adminRef = doc(db, ADMINS_COLLECTION, targetUid);
    await deleteDoc(adminRef);

    // Note: La suppression du compte Firebase Auth doit être faite via Cloud Functions
    // pour éviter les problèmes de permissions
  } catch (error) {
    console.error('Error deleting admin:', error);
    throw error;
  }
}

/**
 * Récupère tous les admins avec filtres
 */
export async function getAllAdmins(filters?: AdminFilters): Promise<AdminUser[]> {
  try {
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    // Appliquer les filtres
    if (filters?.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    }

    if (filters?.role && filters.role.length > 0) {
      constraints.push(where('role', 'in', filters.role));
    }

    if (filters?.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy));
    }

    // Ordonner par date de création
    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(adminsRef, ...constraints);
    const querySnapshot = await getDocs(q);

    let admins = querySnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    })) as AdminUser[];

    // Filtre de recherche côté client (Firestore ne supporte pas les recherches textuelles)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      admins = admins.filter(
        (admin) =>
          admin.email.toLowerCase().includes(searchLower) ||
          admin.firstName.toLowerCase().includes(searchLower) ||
          admin.lastName.toLowerCase().includes(searchLower)
      );
    }

    return admins;
  } catch (error) {
    console.error('Error getting all admins:', error);
    throw new Error('Erreur lors de la récupération des administrateurs');
  }
}

/**
 * Récupère tous les admins avec leurs statistiques
 */
export async function getAllAdminsWithStats(filters?: AdminFilters): Promise<AdminUserWithStats[]> {
  try {
    const admins = await getAllAdmins(filters);

    // Ajouter les stats et config pour chaque admin
    const adminsWithStats: AdminUserWithStats[] = await Promise.all(
      admins.map(async (admin) => {
        const stats = await getAdminStats(admin.uid);
        return {
          ...admin,
          totalActions: stats.totalActions,
          lastActionAt: stats.lastLoginAt,
          roleConfig: getRoleConfig(admin.role),
        };
      })
    );

    return adminsWithStats;
  } catch (error) {
    console.error('Error getting admins with stats:', error);
    throw error;
  }
}

/**
 * Compte le nombre d'admins
 */
export async function getAdminsCount(): Promise<number> {
  try {
    const admins = await getAllAdmins();
    return admins.length;
  } catch (error) {
    console.error('Error counting admins:', error);
    return 0;
  }
}

// ============================================
// ADMIN ACTION HISTORY
// ============================================

/**
 * Ajoute une entrée dans l'historique des actions d'un admin
 */
export async function addAdminActionHistory(
  adminUid: string,
  actionData: AdminActionHistory
): Promise<void> {
  try {
    const historyRef = collection(db, ADMINS_COLLECTION, adminUid, ADMIN_ACTION_HISTORY_SUBCOLLECTION);
    await addDoc(historyRef, actionData);
  } catch (error) {
    console.error('Error adding admin action history:', error);
    // Ne pas throw pour ne pas bloquer l'action principale
  }
}

/**
 * Récupère l'historique des actions d'un admin
 */
export async function getAdminActionHistory(
  adminUid: string,
  limitCount: number = 50,
  actionType?: AdminActionType
): Promise<AdminActionHistory[]> {
  try {
    const historyRef = collection(db, ADMINS_COLLECTION, adminUid, ADMIN_ACTION_HISTORY_SUBCOLLECTION);
    const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc'), firestoreLimit(limitCount)];

    if (actionType) {
      constraints.unshift(where('actionType', '==', actionType));
    }

    const q = query(historyRef, ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => doc.data() as AdminActionHistory);
  } catch (error) {
    console.error('Error getting admin action history:', error);
    return [];
  }
}

/**
 * Récupère les statistiques d'un admin
 */
export async function getAdminStats(adminUid: string): Promise<AdminStats> {
  try {
    const admin = await getAdminById(adminUid);
    if (!admin) {
      throw new Error('Admin introuvable');
    }

    const history = await getAdminActionHistory(adminUid, 1000); // Dernières 1000 actions

    // Compter les actions par type
    const actionsByType: Record<AdminActionType, number> = {} as Record<AdminActionType, number>;
    history.forEach((action) => {
      actionsByType[action.actionType] = (actionsByType[action.actionType] || 0) + 1;
    });

    // Calculer l'âge du compte
    const accountAge = Math.floor(
      (Date.now() - admin.createdAt.toMillis()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalActions: history.length,
      actionsByType,
      lastLoginAt: admin.lastLoginAt,
      accountAge,
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {
      totalActions: 0,
      actionsByType: {} as Record<AdminActionType, number>,
      lastLoginAt: null,
      accountAge: 0,
    };
  }
}

/**
 * Met à jour la date de dernière connexion
 */
export async function updateLastLogin(adminUid: string): Promise<void> {
  try {
    const adminRef = doc(db, ADMINS_COLLECTION, adminUid);
    await updateDoc(adminRef, {
      lastLoginAt: Timestamp.now(),
    });

    // Logger la connexion
    await addAdminActionHistory(adminUid, {
      actionType: AdminActionType.ADMIN_LOGIN,
      targetType: 'system',
      targetId: null,
      description: 'Connexion au panel admin',
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    // Ne pas throw pour ne pas bloquer la connexion
  }
}

/**
 * Logger une tentative de connexion échouée
 */
export async function logFailedLogin(email: string, reason: string): Promise<void> {
  try {
    const admin = await getAdminByEmail(email);
    if (admin) {
      await addAdminActionHistory(admin.uid, {
        actionType: AdminActionType.ADMIN_LOGIN_FAILED,
        targetType: 'system',
        targetId: null,
        description: `Tentative de connexion échouée: ${reason}`,
        timestamp: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error logging failed login:', error);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Récupère les rôles disponibles qu'un admin peut assigner
 */
export function getAssignableRoles(adminRole: AdminRole): AdminRole[] {
  const adminLevel = ADMIN_ROLES_CONFIG[adminRole].level;

  return Object.values(AdminRole).filter((role) => {
    const roleLevel = ADMIN_ROLES_CONFIG[role].level;

    // L'administrateur peut assigner tous les rôles
    if (adminRole === AdminRole.ADMINISTRATEUR) {
      return true;
    }

    // Les autres ne peuvent pas créer d'administrateur
    if (role === AdminRole.ADMINISTRATEUR) {
      return false;
    }

    // Peut assigner les rôles de niveau inférieur ou égal
    return roleLevel <= adminLevel;
  });
}

/**
 * Vérifie si un admin existe et est actif
 */
export async function isAdminActiveByUid(uid: string): Promise<boolean> {
  try {
    const admin = await getAdminById(uid);
    return admin ? admin.isActive : false;
  } catch (error) {
    return false;
  }
}

/**
 * Vérifie si un email appartient à un admin
 */
export async function isAdminEmail(email: string): Promise<boolean> {
  try {
    const admin = await getAdminByEmail(email);
    return admin !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Exporte l'historique complet d'un admin
 */
export async function exportAdminHistory(adminUid: string): Promise<AdminActionHistory[]> {
  try {
    return await getAdminActionHistory(adminUid, 10000);
  } catch (error) {
    console.error('Error exporting admin history:', error);
    throw new Error('Erreur lors de l\'export de l\'historique');
  }
}
