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

  const loadClaims = React.useCallback(async (syncUser = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.claims.getMyClaims();
      setClaims(data || []);
      if (syncUser) {
        await refreshUser().catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ownership claims');
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    let isMounted = true;

    async function initialFetch() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.claims.getMyClaims();
        if (isMounted) {
          setClaims(data || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch ownership claims');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initialFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="badge badge-success">
            <span className="material-symbols-outlined text-xs">check_circle</span> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge badge-danger">
            <span className="material-symbols-outlined text-xs">cancel</span> Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="badge badge-pending">
            <span className="material-symbols-outlined text-xs">hourglass_empty</span> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="page-header mb-8 flex-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Workshop Ownership Claims</h1>
          <p className="text-secondary text-sm mt-1">
            Track verification decisions and administrative audit notes for your claimed automotive workshops.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadClaims(true)}
            className="btn btn-secondary btn-sm"
            disabled={loading}
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
          <Link to="/garages" className="btn btn-outline btn-sm">
            Browse Garages
          </Link>
        </div>
      </div>

      {error && (
        <div className="card p-6 border-danger mb-6 text-center">
          <Alert type="error" message={error} className="mb-4 text-left" />
          <button type="button" onClick={() => loadClaims(false)} className="btn btn-primary btn-sm">
            Retry Loading Claims
          </button>
        </div>
      )}

      {loading ? (
        <div className="center-loader py-12">
          <div className="spinner"></div>
          <p className="text-muted mt-3 text-sm">Checking ownership claims status...</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="card p-12 text-center empty-state border border-border">
          <span className="material-symbols-outlined text-5xl text-slate-500 mb-2">assignment</span>
          <h3 className="text-lg font-bold text-white">No Ownership Claims Submitted</h3>
          <p className="text-secondary text-xs mt-1 max-w-md mx-auto">
            If you own an existing workshop listed on MeriGarage, locate its page and click "Claim Listing" to request ownership transfer.
          </p>
          <Link to="/garages" className="btn btn-primary mt-4">
            Find Your Workshop
          </Link>
        </div>
      ) : (
        <div className="claims-container">
          {claims.map((claim) => (
            <article key={claim.id} className="claim-card">
              <div className="flex-between items-start mb-4 flex-wrap gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white break-words">
                    {claim.garageName}
                  </h3>
                  <div className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-mono">Claim #{claim.id}</span>
                    <span>•</span>
                    <span>
                      Submitted on{' '}
                      {new Date(claim.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(claim.claimStatus)}
                  {claim.claimStatus === 'APPROVED' && (
                    <Link
                      to={claim.garageSlug ? `/owner?slug=${claim.garageSlug}` : '/owner'}
                      className="btn btn-outline btn-xs"
                      title="Manage this workshop in Owner Hub"
                    >
                      <span className="material-symbols-outlined text-xs">settings</span>
                      Manage Hub
                    </Link>
                  )}
                </div>
              </div>

              <div className="text-xs text-secondary bg-elevated p-4 rounded-xl mb-3 border border-border">
                <span className="text-muted font-bold block mb-1">Your Submitted Claim Reason:</span>
                <p className="text-white leading-relaxed break-words">{claim.claimMessage}</p>
              </div>

              {/* Admin Review Result */}
              {claim.decisionNotes && (
                <div className="border-t border-border pt-3 mt-3">
                  <div className="text-xs text-secondary p-3 bg-surface rounded-xl border border-border">
                    <strong className="text-white">Admin Audit Notes:</strong> {claim.decisionNotes}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
