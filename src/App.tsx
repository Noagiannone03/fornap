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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes sans navbar (inscription et QR login) */}
        <Route path="/signup" element={<NewSignup />} />
        <Route path="/qr-login" element={<QRLogin />} />

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
