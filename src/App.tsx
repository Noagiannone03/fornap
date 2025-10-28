import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './app/components/layout/Layout';
import { ProtectedRoute } from './app/components/ProtectedRoute';
import { Home } from './app/pages/Home';
import { Membership } from './app/pages/Membership';
import { NewSignup } from './app/pages/Signup/NewSignup';
import { Login } from './app/pages/Login';
import { QRLogin } from './app/pages/QRLogin';
import { Dashboard } from './app/pages/Dashboard';
import { Profile } from './app/pages/Profile';
import { QRCodeSuccess } from './app/pages/QRCodeSuccess';
import { CheckIn } from './app/pages/CheckIn';
import { AdminRoutes } from './admin/routes';
import { AdminProtectedRoute } from './admin/components/AdminProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes Admin - Panel d'administration */}
        <Route
          path="/admin/*"
          element={
            <AdminProtectedRoute>
              <AdminRoutes />
            </AdminProtectedRoute>
          }
        />

        {/* Routes sans navbar (inscription et QR login) */}
        <Route path="/signup" element={<NewSignup />} />
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
          <Route
            path="/check-in"
            element={
              <ProtectedRoute>
                <CheckIn />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
