import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { GarageDetailDto, GarageSummaryDto } from '../api/types';
import {
  renderGarageReviewPoster,
  downloadPosterFile,
  type PosterRenderResult,
} from '../utils/posterRenderer';
import {
  resolveQrPosterConfig,
  getProductionBaseUrl,
  validateProductionOrigin,
  type QrUrlConfig,
} from '../utils/qrPosterConfig';
import { useToast } from '../context/NotificationContext';

interface GarageReviewPosterCardProps {
  garage: GarageDetailDto | GarageSummaryDto | { id: number; name: string; slug: string; city?: string; state?: string; isVerified?: boolean };
  onClose?: () => void;
  isModal?: boolean;
}

export const GarageReviewPosterCard: React.FC<GarageReviewPosterCardProps> = ({
  garage,
  onClose,
  isModal = false,
}) => {
  const { showWarning, showSuccess } = useToast();
  const [mode, setMode] = useState<'production' | 'development'>('production');
  const [useShortRedirect, setUseShortRedirect] = useState(false);
  const [customProdUrl, setCustomProdUrl] = useState<string>(getProductionBaseUrl());
  const [showAdvancedUrlConfig, setShowAdvancedUrlConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  // Poster Render State
  const [posterResult, setPosterResult] = useState<PosterRenderResult | null>(null);
  const [rendering, setRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  // URL Config computation
  const urlConfig: QrUrlConfig = resolveQrPosterConfig(
    garage.slug,
    mode,
    mode === 'production' ? customProdUrl : undefined
  );

  // Compute final QR target based on route style toggle
  const finalQrUrl = useShortRedirect
    ? `${urlConfig.baseUrl.replace(/\/+$/, '')}/r/${encodeURIComponent(garage.slug)}`
    : urlConfig.targetUrl;

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const generatePoster = useCallback(async () => {
    if (!garage.name || !finalQrUrl) {
      setPosterResult(null);
      setRendering(false);
      return;
    }

    try {
      setRendering(true);
      setRenderError(null);

      const result = await renderGarageReviewPoster({
        garageName: garage.name,
        qrUrl: finalQrUrl,
        scale: 2, // High resolution (1530x2048)
        isDevTestMode: mode === 'development',
      });

      setPosterResult(result);
    } catch (err: any) {
      setRenderError(err.message || 'Failed to generate poster preview');
    } finally {
      setRendering(false);
    }
  }, [garage.name, finalQrUrl, mode]);

  useEffect(() => {
    generatePoster();
  }, [generatePoster]);

  const handleDownload = () => {
    if (!posterResult) return;
    downloadPosterFile(posterResult.dataUrl, posterResult.fileName);
    showSuccess('Poster downloaded successfully.');
  };

  const handlePrint = () => {
    if (!posterResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showWarning('Please allow browser popups to open the print dialog.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${garage.name} — MeriGarage Review Poster</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
              display: block;
            }
            @media print {
              body {
                min-height: auto;
              }
            }
          </style>
        </head>
        <body>
          <img src="${posterResult.dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyUrl = async () => {
    if (!finalQrUrl) return;
    try {
      await navigator.clipboard.writeText(finalQrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`space-y-6 ${isModal ? '' : 'card p-6 bg-surface border border-border'}`}>
      {/* Header Bar */}
      <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">qr_code_2</span>
            <h2 className="text-xl font-bold text-white">Workshop Review QR Poster</h2>
            {garage.isVerified && (
              <span className="badge badge-verified text-2xs">✓ Verified</span>
            )}
          </div>
          <p className="text-xs text-secondary mt-1">
            Display this high-resolution poster at your service reception desk or customer waiting lounge. Customers can scan to instantly write verified reviews on MeriGarage.
          </p>
        </div>

        {!isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-white hover:bg-surface-elevated transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Main Grid: Left Controls, Right Preview */}
      <div className="poster-layout-grid">
        {/* Left Column: QR Strategy & Print Settings */}
        <div className="space-y-6">
          {/* Workshop Details Display */}
          <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-2">
            <span className="text-2xs uppercase tracking-wider text-muted font-bold block">
              Poster Garage Identity
            </span>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">{garage.name}</span>
              <span className="text-xs text-secondary font-mono bg-surface px-2 py-0.5 rounded border border-border">
                {garage.slug}
              </span>
            </div>
            {garage.city && (
              <p className="text-xs text-secondary">
                📍 {garage.city}{garage.state ? `, ${garage.state}` : ''}
              </p>
            )}
          </div>

          {/* Mode Selector (Production vs Development) */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-white flex items-center justify-between">
              <span>QR Destination Environment</span>
              <span className="text-2xs text-muted font-normal">Controls QR URL validity</span>
            </label>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMode('production')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  mode === 'production'
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-surface hover:border-border/80'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl mt-0.5 ${
                    mode === 'production' ? 'text-primary' : 'text-secondary'
                  }`}
                >
                  verified
                </span>
                <div>
                  <span className="font-bold text-xs text-white block">
                    Production (Permanent Print)
                  </span>
                  <span className="text-2xs text-secondary mt-0.5 block">
                    Encodes live public HTTPS domain. Essential for printable posters.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('development')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  mode === 'development'
                    ? 'border-warning bg-warning/10 shadow-sm'
                    : 'border-border bg-surface hover:border-border/80'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl mt-0.5 ${
                    mode === 'development' ? 'text-warning' : 'text-secondary'
                  }`}
                >
                  bug_report
                </span>
                <div>
                  <span className="font-bold text-xs text-white block">
                    Local Development / Test
                  </span>
                  <span className="text-2xs text-secondary mt-0.5 block">
                    Uses localhost for dev machine testing. Cannot be scanned from phones.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Mode-Specific Status & Warnings */}
          {mode === 'development' ? (
            <div className="p-4 rounded-xl border border-warning/40 bg-warning/10 text-xs text-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-warning">
                <span className="material-symbols-outlined text-lg">warning</span>
                <span>Development Testing Mode Active</span>
              </div>
              <p className="text-2xs text-secondary leading-relaxed">
                This QR code encodes your local development address (<code>{urlConfig.baseUrl}</code>). It is intended strictly for verifying canvas layout and local browser navigation. <strong>Do not print or distribute this poster</strong>—external smartphones will fail to connect to your local machine.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-xs text-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-success">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>Production Print Ready</span>
                </div>
                <span className="text-2xs text-muted font-mono">{urlConfig.baseUrl}</span>
              </div>
              <p className="text-2xs text-secondary leading-relaxed">
                The QR code encodes a verified HTTPS address on MeriGarage. When scanned by a customer&apos;s smartphone camera, it opens your public workshop review form directly.
              </p>
            </div>
          )}

          {/* Target URL Display & Verification */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Encoded QR Destination Link</span>
              <button
                type="button"
                onClick={() => setShowAdvancedUrlConfig(!showAdvancedUrlConfig)}
                className="text-primary hover:underline text-2xs flex items-center gap-1"
              >
                <span>{showAdvancedUrlConfig ? 'Hide URL Options' : 'Configure URL Options'}</span>
                <span className="material-symbols-outlined text-xs">
                  {showAdvancedUrlConfig ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            <div className="p-3 bg-surface-elevated rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
              <span className="font-mono text-2xs text-secondary truncate select-all flex-1">
                {finalQrUrl || 'No valid URL configured'}
              </span>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  title="Copy destination link"
                  className="btn btn-secondary btn-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {finalQrUrl && (
                  <a
                    href={finalQrUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Test destination page in a new tab"
                    className="btn btn-outline btn-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                    <span>Test</span>
                  </a>
                )}
              </div>
            </div>

            {/* Advanced URL Configuration Dropdown */}
            {showAdvancedUrlConfig && (
              <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-4 text-xs mt-3">
                <div className="space-y-1.5">
                  <label className="text-2xs uppercase tracking-wider text-muted font-bold block">
                    Public Domain Configuration (VITE_PUBLIC_APP_URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customProdUrl}
                      onChange={(e) => setCustomProdUrl(e.target.value)}
                      placeholder="https://www.merigarage.com"
                      className="input input-sm flex-1 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomProdUrl(getProductionBaseUrl())}
                      className="btn btn-secondary btn-sm text-2xs"
                    >
                      Reset Default
                    </button>
                  </div>
                  {mode === 'production' && !validateProductionOrigin(customProdUrl).isValid && (
                    <p className="text-danger text-2xs">
                      {validateProductionOrigin(customProdUrl).error}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label className="text-2xs uppercase tracking-wider text-muted font-bold block">
                    Link Format
                  </label>
                  <div className="flex items-center gap-4 text-2xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="routeFormat"
                        checked={!useShortRedirect}
                        onChange={() => setUseShortRedirect(false)}
                        className="accent-primary"
                      />
                      <span>Canonical Page (<code>/garages/:slug?action=review</code>)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="routeFormat"
                        checked={useShortRedirect}
                        onChange={() => setUseShortRedirect(true)}
                        className="accent-primary"
                      />
                      <span>Stable Redirect (<code>/r/:slug</code>)</span>
                    </label>
                  </div>
                  <p className="text-muted text-2xs">
                    Both options resolve directly to your verified garage review page. The short redirect produces slightly larger QR modules that are even easier to scan from afar.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Download & Print */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={rendering || !urlConfig.canPrintOrDownload || !posterResult}
              className="btn btn-primary flex items-center justify-center gap-2 flex-1 font-bold shadow-lg disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Download High-Res PNG (1530×2048)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={rendering || !urlConfig.canPrintOrDownload || !posterResult}
              className="btn btn-secondary border border-border flex items-center justify-center gap-2 px-5 font-bold disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>Print A4</span>
            </button>
          </div>

          {/* Printing Instructions */}
          <div className="p-3.5 rounded-xl bg-surface border border-border/80 text-2xs text-secondary space-y-1">
            <span className="font-bold text-white block">🖨️ Printing Recommendation:</span>
            <p>
              For maximum durability and visual appeal, print on <strong>300 GSM photo paper or laminated cardstock</strong> (A4 or Letter size). Place the poster inside a clean acrylic standee at your payment counter or service lounge.
            </p>
          </div>
        </div>

        {/* Right Column: Poster Live Preview */}
        <div className="flex flex-col items-center justify-center sticky top-2">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-border/80 shadow-2xl bg-surface-elevated relative group">
            {rendering && (
              <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs text-white font-medium">Generating Custom Poster...</span>
              </div>
            )}

            {renderError ? (
              <div className="p-8 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-danger">error</span>
                <p className="text-xs text-danger">{renderError}</p>
                <button
                  type="button"
                  onClick={generatePoster}
                  className="btn btn-secondary btn-xs"
                >
                  Retry Render
                </button>
              </div>
            ) : posterResult ? (
              <div ref={canvasContainerRef} className="relative">
                <img
                  src={posterResult.dataUrl}
                  alt={`${garage.name} Review Poster Preview`}
                  className="w-full h-auto object-contain block transition-transform group-hover:scale-[1.01]"
                />
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-muted">
                No preview available
              </div>
            )}
          </div>

          <p className="text-2xs text-muted mt-2 text-center">
            Exact template artwork with dynamically composed workshop identity &amp; verified QR
          </p>
        </div>
      </div>
    </div>
  );
};
