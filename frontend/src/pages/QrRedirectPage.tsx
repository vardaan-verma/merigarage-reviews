import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

/**
 * MeriGarage — First-Party QR Code / Review Short Redirect Route
 * 
 * Handles /r/:slug and /qr/:slug
 * Resolves to canonical public garage review page: /garages/:slug?action=review
 * 
 * Future-proof benefits:
 * 1. Generates lower-density, faster-to-scan QR codes for printed posters.
 * 2. Allows internal route restructuring without reprinting physical posters.
 * 3. Enforces safe internal slug resolution with zero open-redirect risk.
 */
export const QrRedirectPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !slug.trim()) {
      setError('No garage identifier was specified in this QR code.');
      return;
    }

    // Sanitize slug: alphanumeric, hyphens, and underscores only
    const sanitizedSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9-_]+$/.test(sanitizedSlug)) {
      setError('Invalid workshop identifier in QR link.');
      return;
    }

    // Seamlessly navigate to the canonical public garage review experience
    const targetUrl = `/garages/${encodeURIComponent(sanitizedSlug)}?action=review`;
    navigate(targetUrl, { replace: true });
  }, [slug, navigate]);

  if (error) {
    return (
      <div className="container py-16 text-center max-w-md mx-auto">
        <div className="card p-8 bg-surface border border-border space-y-4">
          <span className="material-symbols-outlined text-4xl text-danger">qr_code_scanner</span>
          <h1 className="text-xl font-bold text-white">QR Code Not Recognized</h1>
          <p className="text-secondary text-xs">{error}</p>
          <div className="pt-2">
            <Link to="/garages" className="btn btn-primary btn-sm w-full">
              Browse Verified Garages
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-24 text-center">
      <div className="inline-flex flex-col items-center justify-center p-8 bg-surface rounded-2xl border border-border max-w-sm mx-auto space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <div>
          <h2 className="text-base font-bold text-white">Opening Garage Review...</h2>
          <p className="text-2xs text-secondary mt-1">Connecting you to verified ratings & feedback</p>
        </div>
      </div>
    </div>
  );
};
