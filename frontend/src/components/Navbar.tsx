import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import merigarageLogo from '../assets/merigarage-logo.png';
import merigarageWordmark from '../assets/merigarage-wordmark.png';

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
  const isAdminOrPermitted =
    hasRole('ROLE_ADMIN') ||
    hasPermission('GARAGE_APPROVAL') ||
    hasPermission('CLAIM_MANAGEMENT') ||
    hasPermission('VERIFICATION_REVIEW') ||
    hasPermission('CONTENT_MODERATION');

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="container navbar-container">
        {/* Brand Logo & Name using official brand assets */}
        <Link to="/" className="navbar-brand" onClick={() => setMobileMenuOpen(false)}>
          <img
            src={merigarageLogo}
            alt="MeriGarage Emblem"
            className="navbar-brand-logo"
            width="36"
            height="36"
          />
          <img
            src={merigarageWordmark}
            alt="Meri Garage"
            className="navbar-brand-wordmark"
            height="24"
          />
          <span className="brand-tag">Reviews</span>
        </Link>

        {/* Mobile menu trigger */}
        <button
          className="mobile-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Main Desktop & Mobile Drawer Menu */}
        <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="navbar-links">
            <NavLink
              to="/garages"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore Garages
            </NavLink>
            <NavLink
              to="/services"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Services
            </NavLink>

            {isAuthenticated && (
              <>
                <NavLink
                  to="/submit-garage"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  + List Workshop
                </NavLink>
                <NavLink
                  to="/my-claims"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Claims
                </NavLink>
                <NavLink
                  to="/my-quotes"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Quotes
                </NavLink>
                {isOwnerOrAdmin && (
                  <NavLink
                    to="/owner"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Owner Hub
                  </NavLink>
                )}
                {isAdminOrPermitted && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `nav-link admin-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🛡️ Admin Console
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
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <a
                  href="tel:+919876543210"
                  className="navbar-helpline"
                  title="Call MeriGarage Helpline"
                >
                  <span className="material-symbols-outlined text-sm text-primary">call</span>
                  <span className="helpline-text">
                    <span className="helpline-label">Call Us:</span> +91 98765 43210
                  </span>
                </a>
                <Link
                  to="/login"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/submit-garage"
                  className="btn btn-primary btn-sm btn-nav-cta"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  List Your Garage
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
