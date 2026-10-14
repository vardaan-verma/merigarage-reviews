import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { GarageClaimDto } from '../api/types';
import { Alert } from '../components/Alert';
import { useAuth } from '../context/AuthContext';

export const MyClaimsPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [claims, setClaims] = useState<GarageClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClaims = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.claims.getMyClaims();
      setClaims(data || []);
      // Refresh user role in session so that any newly approved claim updates ROLE_GARAGE_OWNER immediately
      await refreshUser().catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ownership claims');
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-success">Approved</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected</span>;
      case 'PENDING':
      default:
        return <span className="badge badge-warning">Pending Review</span>;
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="page-header mb-6 flex-between items-center">
        <div>
          <h1 className="page-title">My Workshop Ownership Claims</h1>
          <p className="text-secondary text-sm">
            Track status and administrator review notes on your garage claim submissions.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={loadClaims} className="btn btn-secondary btn-sm" disabled={loading}>
            ↻ Refresh
          </button>
          <Link to="/garages" className="btn btn-secondary btn-sm">
            Browse Garages
          </Link>
        </div>
      </div>

      {error && (
        <div className="card p-6 border-danger mb-6 text-center">
          <Alert type="error" message={error} className="mb-4 text-left" />
          <button type="button" onClick={loadClaims} className="btn btn-primary btn-sm">
            Retry Loading Claims
          </button>
        </div>
      )}

      {loading ? (
        <div className="center-loader py-12">
          <div className="spinner"></div>
          <p className="text-muted mt-2">Loading your claims...</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="card p-12 text-center empty-state">
          <div className="text-3xl mb-2">📋</div>
          <h3 className="text-base font-bold">No Ownership Claims Submitted</h3>
          <p className="text-secondary text-xs mt-1 max-w-md mx-auto">
            If you own an existing workshop listed on MeriGarage, locate its page and click "Claim Listing" to request ownership transfer.
          </p>
          <Link to="/garages" className="btn btn-primary mt-4">
            Find Your Garage
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="card p-6">
              <div className="flex-between items-start mb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {claim.garageName} (Garage #{claim.garageId})
                  </h3>
                  <span className="text-xs text-muted">
                    Claim #{claim.id} • Submitted on{' '}
                    {new Date(claim.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(claim.claimStatus)}
                  {claim.claimStatus === 'APPROVED' && (
                    <Link
                      to={claim.garageSlug ? `/owner?slug=${claim.garageSlug}` : '/owner'}
                      className="btn btn-outline btn-xs"
                      title="Manage this workshop in Owner Hub"
                    >
                      ⚙️ Manage Workshop
                    </Link>
                  )}
                </div>
              </div>

              <div className="text-xs text-secondary bg-surface-raised p-4 rounded mb-3">
                <span className="text-muted block mb-1">Your Claim Message:</span>
                <p className="text-foreground leading-relaxed">{claim.claimMessage}</p>
              </div>

              {/* Admin Review Result */}
              {claim.decisionNotes && (
                <div className="border-t border-border pt-3 mt-3">
                  <div className="text-xs text-secondary p-2 bg-surface rounded">
                    <strong>Admin Review Notes:</strong> {claim.decisionNotes}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
