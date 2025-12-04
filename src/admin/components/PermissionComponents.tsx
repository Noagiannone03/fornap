/**
 * ============================================
 * PERMISSION COMPONENTS
 * ============================================
 * Composants réutilisables pour gérer les permissions dans l'UI
 */

import React, { ReactNode } from 'react';
import { Button, ActionIcon, Tooltip } from '@mantine/core';
import type { ButtonProps, ActionIconProps } from '@mantine/core';
import { useAdminAuth } from '../../shared/contexts/AdminAuthContext';
import { AdminPermission } from '../../shared/types/admin';

// ============================================
// PERMISSION BUTTON
// ============================================

interface PermissionButtonProps extends ButtonProps {
  /** Permission requise pour activer le bouton */
  requiredPermission?: AdminPermission;
  /** Permissions requises (au moins une) */
  requiredPermissions?: AdminPermission[];
  /** Si true, cache complètement le bouton si pas de permission */
  hideIfNoPermission?: boolean;
  /** Texte à afficher dans le tooltip si pas de permission */
  noPermissionTooltip?: string;
  children: ReactNode;
}

/**
 * Bouton qui se désactive automatiquement si l'utilisateur n'a pas la permission
 */
export function PermissionButton({
  requiredPermission,
  requiredPermissions,
  hideIfNoPermission = false,
  noPermissionTooltip = "Vous n'avez pas la permission pour cette action",
  children,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { checkPermission, checkAnyPermission } = useAdminAuth();

  // Vérifier les permissions
  let hasPermission = true;
  if (requiredPermission) {
    hasPermission = checkPermission(requiredPermission);
  } else if (requiredPermissions) {
    hasPermission = checkAnyPermission(requiredPermissions);
  }

  // Si pas de permission et qu'on doit cacher, ne rien afficher
  if (!hasPermission && hideIfNoPermission) {
    return null;
  }

  // Si pas de permission, afficher un tooltip et désactiver
  if (!hasPermission) {
    return (
      <Tooltip label={noPermissionTooltip}>
        <Button {...props} disabled={true}>
          {children}
        </Button>
      </Tooltip>
    );
  }

  // Sinon, afficher normalement
  return (
    <Button {...props} disabled={disabled}>
      {children}
    </Button>
  );
}

// ============================================
// PERMISSION ACTION ICON
// ============================================

interface PermissionActionIconProps extends ActionIconProps {
  /** Permission requise pour activer l'icône */
  requiredPermission?: AdminPermission;
  /** Permissions requises (au moins une) */
  requiredPermissions?: AdminPermission[];
  /** Si true, cache complètement l'icône si pas de permission */
  hideIfNoPermission?: boolean;
  /** Texte à afficher dans le tooltip si pas de permission */
  noPermissionTooltip?: string;
  children: ReactNode;
}

/**
 * ActionIcon qui se désactive automatiquement si l'utilisateur n'a pas la permission
 */
export function PermissionActionIcon({
  requiredPermission,
  requiredPermissions,
  hideIfNoPermission = false,
  noPermissionTooltip = "Vous n'avez pas la permission pour cette action",
  children,
  disabled,
  ...props
}: PermissionActionIconProps) {
  const { checkPermission, checkAnyPermission } = useAdminAuth();

  // Vérifier les permissions
  let hasPermission = true;
  if (requiredPermission) {
    hasPermission = checkPermission(requiredPermission);
  } else if (requiredPermissions) {
    hasPermission = checkAnyPermission(requiredPermissions);
  }

  // Si pas de permission et qu'on doit cacher, ne rien afficher
  if (!hasPermission && hideIfNoPermission) {
    return null;
  }

  // Si pas de permission, afficher un tooltip et désactiver
  if (!hasPermission) {
    return (
      <Tooltip label={noPermissionTooltip}>
        <ActionIcon {...props} disabled={true}>
          {children}
        </ActionIcon>
      </Tooltip>
    );
  }

  // Sinon, afficher normalement
  return (
    <ActionIcon {...props} disabled={disabled}>
      {children}
    </ActionIcon>
  );
}

// ============================================
// PERMISSION WRAPPER
// ============================================

interface PermissionWrapperProps {
  /** Permission requise pour afficher le contenu */
  requiredPermission?: AdminPermission;
  /** Permissions requises (au moins une) */
  requiredPermissions?: AdminPermission[];
  /** Si true, requiert toutes les permissions */
  requireAll?: boolean;
  /** Contenu à afficher si l'utilisateur a la permission */
  children: ReactNode;
  /** Contenu alternatif si pas de permission */
  fallback?: ReactNode;
}

/**
 * Wrapper qui affiche son contenu uniquement si l'utilisateur a la permission
 * Identique au PermissionGuard du contexte mais plus pratique à utiliser
 */
export function PermissionWrapper({
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  children,
  fallback = null,
}: PermissionWrapperProps) {
  const { checkPermission, checkAllPermissions, checkAnyPermission } = useAdminAuth();

  let hasAccess = false;

  if (requiredPermission) {
    hasAccess = checkPermission(requiredPermission);
  } else if (requiredPermissions) {
    hasAccess = requireAll
      ? checkAllPermissions(requiredPermissions)
      : checkAnyPermission(requiredPermissions);
  } else {
    // Si aucune permission spécifiée, on affiche toujours
    hasAccess = true;
  }

  return <>{hasAccess ? children : fallback}</>;
}
