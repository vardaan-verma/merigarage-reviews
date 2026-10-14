import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CreateGarageRequest } from '../api/types';
import { Alert } from '../components/Alert';

interface SelectedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  isCover: boolean;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const MAX_PHOTOS = 10;
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const SubmitGaragePage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [mapUrlError, setMapUrlError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Photo management state
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedGarage, setSubmittedGarage] = useState<{ id: number; slug: string; name: string } | null>(null);
  const [isCompleteSuccess, setIsCompleteSuccess] = useState(false);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      selectedPhotos.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [selectedPhotos]);

  const handleGoogleMapsUrlChange = (value: string) => {
    setGoogleMapsUrl(value);
    setMapUrlError(null);
    if (!value.trim()) return;

    // Validate Google Maps URL structure
    const isGoogleMaps = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)*(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(
      value.trim()
    );
    if (!isGoogleMaps) {
      setMapUrlError('Please enter a valid Google Maps URL (e.g. https://maps.app.goo.gl/... or https://google.com/maps/place/...)');
    }

    // Try extracting coordinates directly from standard Google Maps URLs if latitude/longitude are empty
    const coordMatch =
      value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      value.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      value.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (coordMatch) {
      setLatitude(coordMatch[1]);
      setLongitude(coordMatch[2]);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = selectedPhotos.length;
    const newPhotos: SelectedPhoto[] = [];
    let oversizeCount = 0;
    let unsupportedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (currentCount + newPhotos.length >= MAX_PHOTOS) {
        setPhotoError(`Maximum limit of ${MAX_PHOTOS} active photos reached.`);
        break;
      }
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        unsupportedCount++;
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        oversizeCount++;
        continue;
      }

      const isFirstEver = currentCount === 0 && newPhotos.length === 0;
      newPhotos.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
        isCover: isFirstEver,
        status: 'idle',
      });
    }

    if (oversizeCount > 0) {
      setPhotoError(
        `${oversizeCount} image(s) exceeded the 5 MB limit and were skipped. Valid images were added.`
      );
    } else if (unsupportedCount > 0) {
      setPhotoError(
        `${unsupportedCount} image(s) had unsupported formats and were skipped. Only JPG, PNG, and WebP are allowed.`
      );
    }

    if (newPhotos.length > 0) {
      setSelectedPhotos((prev) => {
        const combined = [...prev, ...newPhotos];
        const hasCover = combined.some((p) => p.isCover);
        if (!hasCover && combined.length > 0) {
          combined[0].isCover = true;
        }
        return combined;
      });
    }

    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setPhotoError(null);
    setSelectedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const filtered = prev.filter((p) => p.id !== id);
      if (target?.isCover && filtered.length > 0) {
        filtered[0].isCover = true;
      }
      return filtered;
    });
  };

  const handleSetCoverPhoto = (id: string) => {
    setSelectedPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isCover: p.id === id,
      }))
    );
  };

  const handleCaptionChange = (id: string, caption: string) => {
    setSelectedPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  const uploadPhotosSequentially = async (garageId: number, photosToUpload: SelectedPhoto[]) => {
    let hadFailures = false;
    const working = [...photosToUpload];

    for (let i = 0; i < working.length; i++) {
      if (working[i].status === 'success') continue;

      setSubmittingStatus(`Uploading photo ${i + 1} of ${working.length}...`);
      working[i] = { ...working[i], status: 'uploading', errorMessage: undefined };
      setSelectedPhotos([...working]);

      try {
        await api.garageManagement.uploadPhoto(
          garageId,
          working[i].file,
          working[i].caption.trim() || undefined,
          working[i].isCover,
          i
        );
        working[i] = { ...working[i], status: 'success' };
      } catch (err: any) {
        hadFailures = true;
        working[i] = { ...working[i], status: 'error', errorMessage: err.message || 'Upload failed' };
      }
      setSelectedPhotos([...working]);
    }

    return !hadFailures;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !phoneNumber.trim()) {
      setErrorMessage('Garage Name, Street Address, City, State, PIN Code, and Phone Number are required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      let targetGarage = submittedGarage;

      // 1. Create garage listing if not already created
      if (!targetGarage) {
        setSubmittingStatus('Creating workshop listing...');
        const payload: CreateGarageRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          googleMapsUrl: googleMapsUrl.trim() || undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
        };

        const result = await api.garageManagement.createListing(payload);
        targetGarage = { id: result.id, slug: result.slug, name: result.name };
        setSubmittedGarage(targetGarage);
      }

      // 2. Upload photos if any
      if (selectedPhotos.length > 0) {
        const allUploaded = await uploadPhotosSequentially(targetGarage.id, selectedPhotos);
        if (allUploaded) {
          setIsCompleteSuccess(true);
        } else {
          setErrorMessage('Workshop listing was created, but one or more photos failed to upload. You can retry uploading the failed photos below without recreating the workshop.');
        }
      } else {
        setIsCompleteSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit garage listing.');
    } finally {
      setSubmitting(false);
      setSubmittingStatus('');
    }
  };

  const handleRetryPhotoUploads = async () => {
    if (!submittedGarage) return;
    try {
      setSubmitting(true);
      setErrorMessage(null);
      const allUploaded = await uploadPhotosSequentially(submittedGarage.id, selectedPhotos);
      if (allUploaded) {
        setIsCompleteSuccess(true);
      } else {
        setErrorMessage('Some photos still failed to upload. Check individual error messages and retry or continue.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Retry failed');
    } finally {
      setSubmitting(false);
      setSubmittingStatus('');
    }
  };

  // Full success state
  if (isCompleteSuccess && submittedGarage) {
    return (
      <div className="container py-12 max-w-2xl">
        <div className="card p-8 text-center animate-fade-in">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-success mb-2">Listing Submitted Successfully!</h2>
          <p className="text-secondary text-sm mb-4">
            Thank you for registering <strong>{submittedGarage.name}</strong> on MeriGarage.
            {selectedPhotos.length > 0 && ` (${selectedPhotos.length} photos uploaded)`}
          </p>
          <div className="p-4 bg-surface-raised rounded text-xs text-secondary mb-6 text-left space-y-2">
            <p>
              • <strong>Status:</strong> PENDING APPROVAL.
            </p>
            <p>
              • To prevent spam and maintain high consumer trust, our moderation team audits all new workshops before they appear in public listings.
            </p>
            <p>
              • As the submitter, you can already access workshop management tools in your Owner Hub to manage services and business credentials.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Link to={`/owner?slug=${submittedGarage.slug}`} className="btn btn-primary">
              Manage in Owner Hub
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSubmittedGarage(null);
                setIsCompleteSuccess(false);
                setSelectedPhotos([]);
                setName('');
                setAddressLine1('');
                setAddressLine2('');
                setCity('');
              }}
            >
              Submit Another Garage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="page-header mb-6">
        <h1 className="page-title">Submit a Garage Listing</h1>
        <p className="text-secondary text-sm">
          Register an auto repair workshop or service center. Submissions are reviewed by our platform administrators.
        </p>
      </div>

      {submittedGarage && !isCompleteSuccess && (
        <div className="card p-4 border-warning mb-6 bg-warning/5">
          <div className="flex-between items-center mb-2">
            <strong className="text-warning text-sm">Workshop Listing Created (ID: #{submittedGarage.id})</strong>
            <span className="badge badge-warning">Partial Success</span>
          </div>
          <p className="text-xs text-secondary mb-3">
            Your garage <strong>{submittedGarage.name}</strong> was created, but some photos failed to upload. You can retry the failed uploads below or proceed to the Owner Hub.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={handleRetryPhotoUploads}
              disabled={submitting}
            >
              {submitting ? 'Uploading...' : '↻ Retry Failed Photo Uploads'}
            </button>
            <Link to={`/owner?slug=${submittedGarage.slug}`} className="btn btn-secondary btn-xs">
              Continue to Owner Hub Anyway
            </Link>
          </div>
        </div>
      )}

      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <h3 className="section-title text-base mb-3">Workshop Overview</h3>
          <div className="form-group mb-4">
            <label className="form-label" htmlFor="garage-name">
              Garage / Workshop Name *
            </label>
            <input
              id="garage-name"
              type="text"
              required
              disabled={!!submittedGarage}
              className="form-control"
              placeholder="e.g. SpeedLine Auto Workshop"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label" htmlFor="garage-desc">
              Workshop Description
            </label>
            <textarea
              id="garage-desc"
              rows={3}
              disabled={!!submittedGarage}
              className="form-control"
              placeholder="Describe your specialities, facility size, diagnostic capabilities, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="garage-phone">
                Contact Phone Number *
              </label>
              <input
                id="garage-phone"
                type="tel"
                required
                disabled={!!submittedGarage}
                className="form-control"
                placeholder="e.g. +91 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="garage-email">
                Contact Email
              </label>
              <input
                id="garage-email"
                type="email"
                disabled={!!submittedGarage}
                className="form-control"
                placeholder="e.g. contact@speedline.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="section-title text-base mb-3">Location & Address</h3>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="addr-1">
              Address Line 1 *
            </label>
            <input
              id="addr-1"
              type="text"
              required
              disabled={!!submittedGarage}
              className="form-control"
              placeholder="Plot No., Street, Industrial Area"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label" htmlFor="addr-2">
              Address Line 2 (Optional)
            </label>
            <input
              id="addr-2"
              type="text"
              disabled={!!submittedGarage}
              className="form-control"
              placeholder="Landmark, Sector, Unit"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />
          </div>

          <div className="grid grid-3 gap-3">
            <div className="form-group">
              <label className="form-label" htmlFor="addr-city">
                City *
              </label>
              <input
                id="addr-city"
                type="text"
                required
                disabled={!!submittedGarage}
                className="form-control"
                placeholder="e.g. Jaipur"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="addr-state">
                State *
              </label>
              <input
                id="addr-state"
                type="text"
                required
                disabled={!!submittedGarage}
                className="form-control"
                placeholder="e.g. Rajasthan"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="addr-pincode">
                PIN Code *
              </label>
              <input
                id="addr-pincode"
                type="text"
                required
                disabled={!!submittedGarage}
                className="form-control"
                placeholder="e.g. 302001"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="section-title text-base mb-3">Operating & Coordinates</h3>
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="garage-web">
              Website URL (Optional)
            </label>
            <input
              id="garage-web"
              type="url"
              disabled={!!submittedGarage}
              className="form-control"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label" htmlFor="garage-maps-url">
              Google Maps Location Link (Recommended)
            </label>
            <input
              id="garage-maps-url"
              type="url"
              disabled={!!submittedGarage}
              className="form-control"
              placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/..."
              value={googleMapsUrl}
              onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
            />
            {mapUrlError && (
              <span className="text-danger text-xs block mt-1">
                {mapUrlError}
              </span>
            )}
            <span className="text-muted text-xs block mt-1">
              Paste your garage's Google Maps location link to display a verified map pin and embed interactive directions.
            </span>
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="coord-lat">
                Latitude (Optional)
              </label>
              <input
                id="coord-lat"
                type="number"
                step="any"
                disabled={!!submittedGarage}
                className="form-control"
                placeholder="e.g. 26.9124 (auto-filled if Maps URL contains coords)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="coord-lon">
                Longitude (Optional)
              </label>
              <input
                id="coord-lon"
                type="number"
                step="any"
                disabled={!!submittedGarage}
                className="form-control"
                placeholder="e.g. 75.7873 (auto-filled if Maps URL contains coords)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Workshop Photos Section */}
        <div className="pt-2 border-t border-border">
          <div className="flex-between items-center mb-2">
            <h3 className="section-title text-base mb-0">Workshop Photos</h3>
            <span className="text-xs text-secondary font-mono">{selectedPhotos.length}/{MAX_PHOTOS} photos</span>
          </div>
          <p className="text-xs text-secondary mb-3">
            Upload workshop exterior, customer lounge, service bays, or diagnostic tools. Supports JPG, PNG, and WebP (up to 5 MB per image, maximum 10 active photos).
          </p>

          <div className="form-group mb-4">
            <input
              type="file"
              id="garage-photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={submitting || selectedPhotos.length >= MAX_PHOTOS}
              onChange={handlePhotoSelect}
              className="form-control text-xs"
            />
            <span className="text-muted text-xs block mt-1">
              Select one or more photos. The first photo is set as the cover by default.
            </span>
          </div>

          {photoError && <Alert type="error" message={photoError} onClose={() => setPhotoError(null)} className="mb-4" />}

          {selectedPhotos.length > 0 && (
            <div className="photo-preview-grid mt-3">
              {selectedPhotos.map((photo, index) => (
                <div key={photo.id} className="card p-3 border border-border bg-surface-raised text-xs space-y-2">
                  <div className="flex gap-3">
                    <img
                      src={photo.previewUrl}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded border border-border flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-foreground text-xs" title={photo.file.name}>
                        {photo.file.name}
                      </p>
                      <span className="text-muted block font-mono text-xs">
                        {(photo.file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>

                      <div className="mt-2 flex items-center gap-2">
                        {photo.isCover ? (
                          <span className="badge badge-accent text-xs">★ Cover Photo</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleSetCoverPhoto(photo.id)}
                            disabled={submitting}
                          >
                            Set as Cover
                          </button>
                        )}
                        {!submittedGarage && (
                          <button
                            type="button"
                            className="btn btn-outline btn-xs text-danger"
                            onClick={() => handleRemovePhoto(photo.id)}
                            disabled={submitting}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      className="form-control text-xs py-1"
                      placeholder="Optional caption (e.g. Front Entrance, Service Bay 1)"
                      value={photo.caption}
                      disabled={submitting || photo.status === 'success'}
                      onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                    />
                  </div>

                  {photo.status === 'uploading' && (
                    <span className="text-primary font-medium text-xs block">Uploading photo...</span>
                  )}
                  {photo.status === 'success' && (
                    <span className="text-success font-medium text-xs block">✓ Uploaded successfully</span>
                  )}
                  {photo.status === 'error' && (
                    <span className="text-danger font-medium text-xs block">
                      ⚠ Failed: {photo.errorMessage}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border flex-between items-center">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {submittingStatus && (
              <span className="text-xs text-muted animate-pulse">{submittingStatus}</span>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting
                ? 'Processing...'
                : submittedGarage
                ? 'Retry Failed Uploads'
                : 'Submit Listing for Approval'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
