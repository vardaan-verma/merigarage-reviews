import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, hasRole, hasPermission } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      // Handled in context
    }
  };

  const isOwnerOrAdmin = hasRole('ROLE_GARAGE_OWNER') || hasRole('ROLE_ADMIN');
  const isAdminOrPermitted = hasRole('ROLE_ADMIN') || 
    hasPermission('GARAGE_APPROVAL') || 
    hasPermission('CLAIM_MANAGEMENT') || 
    hasPermission('VERIFICATION_REVIEW') || 
    hasPermission('CONTENT_MODERATION');

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-dot"></span>
          MeriGarage
          <span className="brand-tag">Reviews</span>
        </Link>

        {/* Mobile toggle */}
        <button
          className="mobile-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="navbar-links">
            <NavLink to="/garages" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              Garages
            </NavLink>
            <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              Services
            </NavLink>

            {isAuthenticated && (
              <>
                <NavLink to="/submit-garage" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  + List Garage
                </NavLink>
                <NavLink to="/my-claims" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                  My Claims
                </NavLink>
                {isOwnerOrAdmin && (
                  <NavLink to="/owner" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    Owner Hub
                  </NavLink>
                )}
                {isAdminOrPermitted && (
                  <NavLink to="/admin" className={({ isActive }) => `nav-link admin-nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                    Admin Console
                  </NavLink>
                )}
              </>
            )}
          </div>

          <div className="navbar-auth">
            {isAuthenticated && user ? (
              <div className="user-menu">
                <Link to="/profile" className="user-profile-link" onClick={() => setMobileMenuOpen(false)}>
                  <div className="user-avatar" title={user.fullName || user.email}>
                    {(user.fullName || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name">{user.fullName || user.email}</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleLogout}
                  title="Sign out of your account"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-secondary btn-sm" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMobileMenuOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
