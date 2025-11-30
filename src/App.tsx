import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './app/components/layout/Layout';
import { ProtectedRoute } from './app/components/ProtectedRoute';
import { CheckInProtectedRoute } from './app/components/CheckInProtectedRoute';
import { Home } from './app/pages/Home';
import { Membership } from './app/pages/Membership';
import { EnhancedSignup } from './app/pages/Signup/EnhancedSignup';
import { Login } from './app/pages/Login';
import { QRLogin } from './app/pages/QRLogin';
import { Dashboard } from './app/pages/Dashboard';
import { Profile } from './app/pages/Profile';
import { QRCodeSuccess } from './app/pages/QRCodeSuccess';
import { CheckIn } from './app/pages/CheckIn';
import { Adhesion } from './app/pages/Adhesion';
import { AdminRoutes } from './admin/routes';
import { AdminAuthProvider } from './shared/contexts/AdminAuthContext';
import { EventScannerPage } from './admin/pages/Scanner/EventScannerPage';
import { AdminProtectedRoute } from './admin/components/AdminProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* Routes Admin - Panel d'administration */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* Route Scanner QR - Page autonome de vérification événements */}
          <Route
            path="/scanner"
            element={
              <AdminProtectedRoute>
                <EventScannerPage />
              </AdminProtectedRoute>
            }
          />

          {/* Route CheckIn - Page autonome de vérification simple */}
          <Route
            path="/check-in"
            element={
              <CheckInProtectedRoute>
                <CheckIn />
              </CheckInProtectedRoute>
            }
          />

          {/* Routes sans navbar (inscription, adhésion et QR login) */}
          <Route path="/signup" element={<EnhancedSignup />} />
          <Route path="/adhesion" element={<Adhesion />} />
          <Route path="/qr-login" element={<QRLogin />} />
          <Route path="/signup-success" element={
            <ProtectedRoute>
              <QRCodeSuccess />
            </ProtectedRoute>
          } />

          {/* Routes avec navbar - Site Public */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/membership" element={<Membership />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
