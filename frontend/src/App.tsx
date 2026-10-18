import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastContainer } from './components/ToastContainer';
import { GlobalConfirmationModal } from './components/ConfirmationModal';
import { GlobalAuthModal } from './components/AuthRequiredModal';
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
import { MyQuotesPage } from './pages/MyQuotesPage';
import { MyReviewsPage } from './pages/MyReviewsPage';
import { MyAskedQuotesPage } from './pages/MyAskedQuotesPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { QrRedirectPage } from './pages/QrRedirectPage';

function NotFoundPage() {
  return (
    <div className="container py-16 text-center">
      <div className="card p-12 max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-secondary text-sm mb-6">
          The requested page could not be located on MeriGarage.
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
        <NotificationProvider>
          <div className="app-shell flex flex-col min-h-screen">
            <ToastContainer />
            <GlobalConfirmationModal />
            <GlobalAuthModal />
            <Navbar />
            <main className="main-content flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/garages" element={<GaragesPage />} />
                <Route path="/garages/:slug" element={<GarageDetailPage />} />
                <Route path="/r/:slug" element={<QrRedirectPage />} />
                <Route path="/qr/:slug" element={<QrRedirectPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/services/:serviceSlug" element={<ServicesPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Authenticated Common Routes */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-reviews"
                  element={
                    <ProtectedRoute>
                      <MyReviewsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-asked-quotes"
                  element={
                    <ProtectedRoute>
                      <MyAskedQuotesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Garage Owner & Admin Routes */}
                <Route
                  path="/submit-garage"
                  element={
                    <ProtectedRoute requiredRole={['ROLE_GARAGE_OWNER', 'ROLE_ADMIN']}>
                      <SubmitGaragePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-claims"
                  element={
                    <ProtectedRoute requiredRole={['ROLE_GARAGE_OWNER', 'ROLE_ADMIN']}>
                      <MyClaimsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-quotes"
                  element={
                    <ProtectedRoute requiredRole={['ROLE_GARAGE_OWNER', 'ROLE_ADMIN']}>
                      <MyQuotesPage />
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
                        'USER_MANAGEMENT',
                        'LEAD_ACCESS',
                        'QUOTE_OVERSIGHT',
                        'DATA_EXPORT',
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
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
