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
  const isAdmin =
    hasRole('ROLE_ADMIN') ||
    hasPermission('GARAGE_APPROVAL') ||
    hasPermission('CLAIM_MANAGEMENT') ||
    hasPermission('VERIFICATION_REVIEW') ||
    hasPermission('CONTENT_MODERATION');

  return (
    <div className="container py-8 max-w-4xl">
      <div className="page-header mb-8 flex-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Account Profile</h1>
          <p className="text-secondary text-sm mt-1">
            Manage your credentials, platform permissions, and connected automotive workshops.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleLogout}
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign Out
        </button>
      </div>

      <div className="card p-8 mb-8 border border-border">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary shadow-lg shadow-red-950/40">
            {(user.fullName || user.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">{user.fullName || 'Registered User'}</h2>
            <p className="text-sm text-secondary font-mono mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-2 gap-6 pt-6 border-t border-border">
          <div>
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">
              Assigned Platform Roles
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.roles && user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className={`badge ${
                      role === 'ROLE_ADMIN'
                        ? 'badge-verified'
                        : role === 'ROLE_GARAGE_OWNER'
                        ? 'badge-accent'
                        : 'badge-secondary'
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
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">
              Administrative Permissions
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.permissions && user.permissions.length > 0 ? (
                user.permissions.map((perm) => (
                  <span key={perm} className="badge badge-pending">
                    {perm}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">Standard Motorist Access</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation / Action Hub */}
      <div className="card p-8 border border-border">
        <h3 className="text-lg font-bold text-white mb-5">Quick Actions & Workspaces</h3>
        <div className="grid grid-2 gap-5">
          <Link
            to="/submit-garage"
            className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-primary text-xl">add_business</span>
                <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                  Submit a Workshop
                </h4>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                List an auto repair workshop on MeriGarage for verification and customer discovery.
              </p>
            </div>
            <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
              Start submission →
            </span>
          </Link>

          <Link
            to="/my-claims"
            className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-primary text-xl">verified</span>
                <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                  Ownership Claims
                </h4>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Check status and decisions on your submitted workshop ownership claims.
              </p>
            </div>
            <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
              Check claims →
            </span>
          </Link>

          {isOwner && (
            <Link
              to="/owner"
              className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-primary text-xl">construction</span>
                  <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                    Workshop Owner Hub
                  </h4>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Manage garage profile edits, upload verification trade documents and workshop photos.
                </p>
              </div>
              <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                Open owner hub →
              </span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-primary text-xl">admin_panel_settings</span>
                  <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                    Administrator Console
                  </h4>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Review pending garages, verification documents, claims, and moderate customer reviews.
                </p>
              </div>
              <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                Open admin console →
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
