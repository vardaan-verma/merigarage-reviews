import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isOwner = hasRole('ROLE_GARAGE_OWNER') || hasRole('ROLE_ADMIN');
  const isAdmin = hasRole('ROLE_ADMIN') || 
    hasPermission('GARAGE_APPROVAL') || 
    hasPermission('CLAIM_MANAGEMENT') || 
    hasPermission('VERIFICATION_REVIEW') || 
    hasPermission('CONTENT_MODERATION');

  return (
    <div className="container py-8 max-w-3xl">
      <div className="page-header mb-6 flex-between items-center">
        <div>
          <h1 className="page-title">My Account Profile</h1>
          <p className="text-secondary text-sm">
            Manage your credentials, platform roles, and garage connections.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary">
            {(user.fullName || user.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.fullName || 'Registered User'}</h2>
            <p className="text-sm text-secondary font-mono">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-2 gap-6 pt-4 border-t border-border">
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Assigned Roles
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.roles && user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className={`badge ${
                      role === 'ROLE_ADMIN'
                        ? 'badge-danger'
                        : role === 'ROLE_GARAGE_OWNER'
                        ? 'badge-accent'
                        : 'badge-primary'
                    }`}
                  >
                    {role.replace('ROLE_', '')}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">No roles assigned</span>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Administrative Permissions
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.permissions && user.permissions.length > 0 ? (
                user.permissions.map((perm) => (
                  <span key={perm} className="badge badge-warning">
                    {perm}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">No special admin privileges</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation / Action Hub */}
      <div className="card p-6">
        <h3 className="section-title text-base mb-4">Quick Actions & Workspaces</h3>
        <div className="grid grid-2 gap-4">
          <Link to="/submit-garage" className="card p-4 bg-surface-raised hover:border-primary transition flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-sm text-foreground">Submit a New Garage</h4>
              <p className="text-xs text-secondary mt-1">
                List a workshop on MeriGarage for administrative verification.
              </p>
            </div>
            <span className="text-xs text-primary font-medium mt-3">Start submission →</span>
          </Link>

          <Link to="/my-claims" className="card p-4 bg-surface-raised hover:border-primary transition flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-sm text-foreground">Ownership Claims</h4>
              <p className="text-xs text-secondary mt-1">
                View status of your submitted workshop ownership claims.
              </p>
            </div>
            <span className="text-xs text-primary font-medium mt-3">Check claims →</span>
          </Link>

          {isOwner && (
            <Link to="/owner" className="card p-4 bg-surface-raised hover:border-primary transition flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground">Workshop Owner Hub</h4>
                <p className="text-xs text-secondary mt-1">
                  Manage garage profile edits, upload verification documents and photos.
                </p>
              </div>
              <span className="text-xs text-primary font-medium mt-3">Open owner hub →</span>
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin" className="card p-4 bg-surface-raised hover:border-primary transition flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-danger">Administrator Console</h4>
                <p className="text-xs text-secondary mt-1">
                  Review pending garages, documents, ownership claims and content.
                </p>
              </div>
              <span className="text-xs text-danger font-medium mt-3">Open admin console →</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
