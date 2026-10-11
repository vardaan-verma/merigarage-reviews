import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { HomePage } from './pages/HomePage';
import { GaragesPage } from './pages/GaragesPage';
import { GarageDetailPage } from './pages/GarageDetailPage';
import { ServicesPage } from './pages/ServicesPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { SubmitGaragePage } from './pages/SubmitGaragePage';
import { MyClaimsPage } from './pages/MyClaimsPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function NotFoundPage() {
  return (
    <div className="container py-16 text-center">
      <div className="card p-12 max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-secondary text-sm mb-6">
          The requested page could not be located on MeriGarage Reviews.
        </p>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell flex flex-col min-h-screen">
          <Navbar />
          <main className="main-content flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/garages" element={<GaragesPage />} />
              <Route path="/garages/:slug" element={<GarageDetailPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Authenticated User Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submit-garage"
                element={
                  <ProtectedRoute>
                    <SubmitGaragePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-claims"
                element={
                  <ProtectedRoute>
                    <MyClaimsPage />
                  </ProtectedRoute>
                }
              />

              {/* Garage Owner & Admin Hub */}
              <Route
                path="/owner"
                element={
                  <ProtectedRoute requiredRole={['ROLE_GARAGE_OWNER', 'ROLE_ADMIN']}>
                    <OwnerDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Administrator Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute
                    requiredRole="ROLE_ADMIN"
                    requiredPermission={[
                      'GARAGE_APPROVAL',
                      'CLAIM_MANAGEMENT',
                      'VERIFICATION_REVIEW',
                      'CONTENT_MODERATION',
                    ]}
                  >
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
