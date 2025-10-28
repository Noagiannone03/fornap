import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Membership } from './pages/Membership';
import { NewSignup } from './pages/Signup/NewSignup';
import { Login } from './pages/Login';
import { QRLogin } from './pages/QRLogin';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { QRCodeSuccess } from './pages/QRCodeSuccess';
import { CheckIn } from './pages/CheckIn';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes sans navbar (inscription et QR login) */}
        <Route path="/signup" element={<NewSignup />} />
        <Route path="/qr-login" element={<QRLogin />} />
        <Route path="/signup-success" element={
          <ProtectedRoute>
            <QRCodeSuccess />
          </ProtectedRoute>
        } />

        {/* Routes avec navbar */}
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
