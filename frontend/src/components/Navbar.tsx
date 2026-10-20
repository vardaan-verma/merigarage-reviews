import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import merigarageLogo from '../assets/merigarage-logo.png';
import merigarageWordmark from '../assets/merigarage-wordmark.png';
import { UserAvatar } from './UserAvatar';

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

  const isGarageOwner = hasRole('ROLE_GARAGE_OWNER');
  const isVehicleOwner = hasRole('ROLE_USER') && !isGarageOwner;
  const isAdminOrPermitted =
    hasRole('ROLE_ADMIN') ||
    hasPermission('GARAGE_APPROVAL') ||
    hasPermission('CLAIM_MANAGEMENT') ||
    hasPermission('VERIFICATION_REVIEW') ||
    hasPermission('CONTENT_MODERATION') ||
    hasPermission('USER_MANAGEMENT') ||
    hasPermission('LEAD_ACCESS') ||
    hasPermission('QUOTE_OVERSIGHT') ||
    hasPermission('DATA_EXPORT');

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
            alt="MeriGarage"
            className="navbar-brand-wordmark"
            height="24"
          />
        </Link>

        {/* Mobile menu trigger & profile icon matching reference State 01/02 */}
        <div className="mobile-nav-controls">
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
          <Link
            to={isAuthenticated ? '/profile' : '/login'}
            className="mobile-profile-icon-btn"
            aria-label={isAuthenticated ? 'User Profile' : 'Login'}
            onClick={() => setMobileMenuOpen(false)}
            title={isAuthenticated ? (user?.fullName || 'My Account') : 'Sign In'}
          >
            <span className="material-symbols-outlined text-xl">account_circle</span>
          </Link>
        </div>

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
            <NavLink
              to="/faq"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQs
            </NavLink>

            {isAuthenticated && (
              <>
                {/* Vehicle Owner Navigation (5 items total including Explore Garages & Services) */}
                {isVehicleOwner && (
                  <>
                    <NavLink
                      to="/my-reviews"
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Reviews
                    </NavLink>
                    <NavLink
                      to="/my-asked-quotes"
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Asked Quotes
                    </NavLink>
                    <NavLink
                      to="/profile"
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Profile
                    </NavLink>
                  </>
                )}

                {/* Garage Owner Navigation (6 items total) */}
                {isGarageOwner && (
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
                    <NavLink
                      to="/owner"
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Owner Hub
                    </NavLink>
                  </>
                )}

                {/* Administrator Console */}
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
                  <UserAvatar
                    photoUrl={user.profilePhotoUrl}
                    name={user.fullName}
                    email={user.email}
                    size="sm"
                    className="user-avatar overflow-hidden"
                    showBorder={false}
                  />
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
              <div className="auth-buttons flex items-center gap-3">
                <Link
                  to="/login"
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 border border-border"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-sm">login</span>
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
