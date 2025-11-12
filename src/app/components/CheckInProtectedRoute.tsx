/**
 * ============================================
 * CHECK-IN PROTECTED ROUTE
 * ============================================
 * Route protégée pour le système de check-in
 * Accepte à la fois les utilisateurs normaux et les administrateurs
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAdminAuth } from '../../shared/contexts/AdminAuthContext';
import { Loader, Center } from '@mantine/core';

interface CheckInProtectedRouteProps {
  children: React.ReactNode;
}

export function CheckInProtectedRoute({ children }: CheckInProtectedRouteProps) {
  const { user, loading: userLoading } = useAuth();
  const { adminProfile, loading: adminLoading } = useAdminAuth();

  // Attendre que les deux contextes aient terminé de charger
  if (userLoading || adminLoading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Si ni utilisateur ni admin n'est connecté, rediriger vers login admin
  if (!user && !adminProfile) {
    return <Navigate to="/admin/login" replace />;
  }

  // Si connecté (utilisateur ou admin), afficher le contenu
  return <>{children}</>;
}
