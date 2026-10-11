import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RoleName, AdminPermissionCode } from '../api/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: RoleName | RoleName[];
  requiredPermission?: AdminPermissionCode | AdminPermissionCode[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
}) => {
  const { user, isAuthenticated, loading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="center-loader">
        <div className="spinner"></div>
        <p className="mt-2 text-muted">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles if required
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasAnyRole = roles.some((role) => hasRole(role));
    if (!hasAnyRole) {
      return (
        <div className="container py-8">
          <div className="card text-center p-8 max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-danger mb-2">Access Denied (403)</h2>
            <p className="text-secondary mb-4">
              Your account does not have the required permissions to access this page.
            </p>
            <p className="text-xs text-muted mb-6">
              Required: {roles.join(' or ')} | Current: {user.roles.join(', ') || 'None'}
            </p>
            <a href="/" className="btn btn-primary">
              Return to Home
            </a>
          </div>
        </div>
      );
    }
  }

  // Check permissions if required
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasAnyPermission = permissions.some((perm) => hasPermission(perm)) || hasRole('ROLE_ADMIN');
    if (!hasAnyPermission) {
      return (
        <div className="container py-8">
          <div className="card text-center p-8 max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-danger mb-2">Permission Required (403)</h2>
            <p className="text-secondary mb-4">
              You do not have the required administrative permission to view this section.
            </p>
            <p className="text-xs text-muted mb-6">
              Required: {permissions.join(' or ')}
            </p>
            <a href="/" className="btn btn-primary">
              Return to Home
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
