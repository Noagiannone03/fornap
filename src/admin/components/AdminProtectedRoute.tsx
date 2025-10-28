import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { currentUser, userProfile, loading } = useAuth();

  // TODO: Ajouter la vérification isAdmin depuis le UserProfile
  // Pour l'instant, on vérifie juste si l'utilisateur est connecté
  const isAdmin = currentUser !== null;

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
