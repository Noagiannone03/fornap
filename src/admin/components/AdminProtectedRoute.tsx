import { Navigate, useLocation } from 'react-router-dom';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useAdminAuth } from '../../shared/contexts/AdminAuthContext';
import { AdminPermission, AdminRole } from '../../shared/types/admin';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  /** Permission(s) requise(s) pour accéder à cette route */
  requiredPermission?: AdminPermission;
  requiredPermissions?: AdminPermission[];
  /** Si true, requiert toutes les permissions, sinon au moins une */
  requireAll?: boolean;
}

export function AdminProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
}: AdminProtectedRouteProps) {
  const {
    isAuthenticated,
    loading,
    adminProfile,
    checkPermission,
    checkAllPermissions,
    checkAnyPermission,
  } = useAdminAuth();
  const location = useLocation();

  // Affichage du loader pendant le chargement
  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" variant="bars" />
          <Text size="sm" c="dimmed">
            Vérification des autorisations...
          </Text>
        </Stack>
      </Center>
    );
  }

  // Redirection vers la page de login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Vérification que le compte est actif
  if (adminProfile && !adminProfile.isActive) {
    return <Navigate to="/admin/login" replace />;
  }

  // REDIRECTION AUTOMATIQUE POUR LE RÔLE SCANNER
  // Si l'utilisateur est un Scanner et qu'il n'est pas déjà sur /scanner, le rediriger
  if (adminProfile && adminProfile.role === AdminRole.SCANNER) {
    // Vérifier qu'on n'est pas déjà sur /scanner pour éviter une boucle de redirection
    if (!location.pathname.startsWith('/scanner')) {
      return <Navigate to="/scanner" replace />;
    }
  }

  // BLOQUER L'ACCÈS AU PANEL ADMIN POUR LE RÔLE SCANNER
  // Si un Scanner essaie d'accéder au panel admin, le rediriger vers /scanner
  if (adminProfile && adminProfile.role === AdminRole.SCANNER && location.pathname.startsWith('/admin')) {
    return <Navigate to="/scanner" replace />;
  }

  // Vérification des permissions si spécifiées
  if (requiredPermission || requiredPermissions) {
    let hasAccess = false;

    if (requiredPermission) {
      hasAccess = checkPermission(requiredPermission);
    } else if (requiredPermissions) {
      hasAccess = requireAll
        ? checkAllPermissions(requiredPermissions)
        : checkAnyPermission(requiredPermissions);
    }

    // Redirection vers le dashboard si accès refusé
    if (!hasAccess) {
      return (
        <Navigate
          to="/admin/dashboard"
          replace
          state={{ error: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page' }}
        />
      );
    }
  }

  return <>{children}</>;
}
