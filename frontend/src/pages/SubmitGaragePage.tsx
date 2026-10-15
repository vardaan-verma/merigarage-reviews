import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CreateGarageRequest, ServiceDto } from '../api/types';
import { Alert } from '../components/Alert';
import { StateSelect, CitySelect } from '../components/LocationSelect';
import { getCitiesForState } from '../data/indiaLocations';

interface SelectedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  isCover: boolean;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const MAX_PHOTOS = 7;
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

  // Service Catalogue state
  const [availableServices, setAvailableServices] = useState<ServiceDto[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [loadingServices, setLoadingServices] = useState(false);

  // Photo management state
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedGarage, setSubmittedGarage] = useState<{ id: number; slug: string; name: string } | null>(null);
  const [isCompleteSuccess, setIsCompleteSuccess] = useState(false);

  useEffect(() => {
    setLoadingServices(true);
    api.services
      .list()
      .then((data) => setAvailableServices(data || []))
      .catch(() => {})
      .finally(() => setLoadingServices(false));
  }, []);

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

  const handleStateChange = (newState: string) => {
    setState(newState);
    const validCities = getCitiesForState(newState);
    if (city && !validCities.includes(city)) {
      setCity('');
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

      let isInvalid = false;
      let fileErrorMessage: string | undefined;

      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        unsupportedCount++;
        isInvalid = true;
        fileErrorMessage = 'Unsupported format (only JPG, PNG, WebP allowed)';
      } else if (file.size > MAX_PHOTO_SIZE_BYTES) {
        oversizeCount++;
        isInvalid = true;
        fileErrorMessage = `Exceeds 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      }

      const isFirstEver = currentCount === 0 && newPhotos.length === 0 && !isInvalid;
      newPhotos.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        caption: '',
        isCover: isFirstEver,
        status: isInvalid ? 'error' : 'idle',
        errorMessage: fileErrorMessage,
      });
    }

    if (oversizeCount > 0 || unsupportedCount > 0) {
      setPhotoError(
        `Some selected images have errors (marked in red below). Click Remove to discard them before submitting.`
      );
    }

    if (newPhotos.length > 0) {
      setSelectedPhotos((prev) => {
        const combined = [...prev, ...newPhotos];
        const hasCover = combined.some((p) => p.isCover && p.status !== 'error');
        if (!hasCover) {
          const firstValid = combined.find((p) => p.status !== 'error');
          if (firstValid) firstValid.isCover = true;
        }
        return combined;
      });
    }

    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const filtered = prev.filter((p) => p.id !== id);
      if (target?.isCover && filtered.length > 0) {
        const nextValid = filtered.find((p) => p.status !== 'error') || filtered[0];
        nextValid.isCover = true;
      }
      // If no photos with errors remain, clear top error
      const hasErrorsLeft = filtered.some((p) => p.status === 'error');
      if (!hasErrorsLeft) {
        setPhotoError(null);
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
          serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
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
              <label className="form-label" htmlFor="addr-state">
                State *
              </label>
              <StateSelect
                id="addr-state"
                required
                disabled={!!submittedGarage}
                value={state}
                onChange={handleStateChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="addr-city">
                City *
              </label>
              <CitySelect
                id="addr-city"
                required
                selectedState={state}
                disabled={!!submittedGarage}
                value={city}
                onChange={setCity}
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

        {/* Workshop Services Section */}
        <div className="pt-2 border-t border-border">
          <div className="flex-between items-center mb-2">
            <div>
              <h3 className="section-title text-base mb-0">Offered Workshop Services</h3>
              <p className="text-xs text-secondary mt-1 mb-0">
                Select the automotive services your workshop specializes in from our verified service catalogue.
              </p>
            </div>
            <span className="badge badge-primary text-xs font-mono">
              {selectedServiceIds.length} Selected
            </span>
          </div>

          {/* Search Box */}
          <div className="form-group mb-3">
            <input
              type="text"
              className="form-control text-sm"
              placeholder="Search services (e.g. Brake, Oil, AC, Battery, Detailing, Suspension)..."
              value={serviceSearchQuery}
              onChange={(e) => setServiceSearchQuery(e.target.value)}
              disabled={!!submittedGarage}
            />
          </div>

          {/* Service Options List as Selectable Red Pill Buttons */}
          <div className="max-h-72 overflow-y-auto p-3.5 bg-surface rounded-xl border border-border flex flex-wrap gap-2.5 mb-4">
            {loadingServices ? (
              <div className="w-full text-center py-4 text-xs text-muted">
                Loading service catalogue...
              </div>
            ) : (
              (() => {
                const query = serviceSearchQuery.trim().toLowerCase();
                const filtered = availableServices.filter(
                  (s) => !query || s.name.toLowerCase().includes(query)
                );

                if (filtered.length === 0) {
                  return (
                    <div className="w-full text-center py-4 text-xs text-muted">
                      No services found matching "{serviceSearchQuery}".
                    </div>
                  );
                }

                return filtered.map((svc) => {
                  const isSelected = selectedServiceIds.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      disabled={!!submittedGarage}
                      onClick={() => {
                        setSelectedServiceIds((prev) =>
                          isSelected ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]
                        );
                      }}
                      className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-md ring-2 ring-primary/40 font-bold'
                          : 'bg-surface-raised border-border text-secondary hover:border-primary/50 hover:text-white hover:bg-surface-raised/80'
                      }`}
                    >
                      <span>{svc.name}</span>
                    </button>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* Workshop Photos Section */}
        <div className="pt-2 border-t border-border">
          <div className="flex-between items-center mb-2">
            <h3 className="section-title text-base mb-0">Workshop Photos</h3>
            <span className="text-xs text-secondary font-mono">{selectedPhotos.length}/{MAX_PHOTOS} photos</span>
          </div>
          <p className="text-xs text-secondary mb-3">
            Upload workshop exterior, customer lounge, service bays, or diagnostic tools. Supports JPG, PNG, and WebP (up to 5 MB per image, maximum 7 active photos).
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
                <div
                  key={photo.id}
                  className={`photo-preview-card card p-3 border ${
                    photo.status === 'error' ? 'border-danger/70 bg-danger/5' : 'border-border bg-surface-raised'
                  } text-xs space-y-2`}
                >
                  <div className="relative overflow-hidden rounded">
                    {photo.previewUrl ? (
                      <img
                        src={photo.previewUrl}
                        alt={`Preview ${index + 1}`}
                        className="photo-preview-thumb"
                      />
                    ) : (
                      <div className="w-full h-40 bg-surface flex flex-col items-center justify-center text-muted">
                        <span className="material-symbols-outlined text-4xl text-danger">broken_image</span>
                        <span className="text-xs mt-1 text-danger font-medium">Invalid file</span>
                      </div>
                    )}

                    {photo.isCover && (
                      <span className="badge badge-accent absolute top-2 left-2 text-xs">
                        ★ Cover Photo
                      </span>
                    )}
                    {photo.status === 'error' && (
                      <span className="badge badge-danger absolute top-2 left-2 text-xs">
                        ⚠ Error
                      </span>
                    )}

                    {/* Visible Remove Button / Cross on top-right */}
                    {photo.status !== 'success' && (
                      <button
                        type="button"
                        aria-label={`Remove photo ${photo.file.name}`}
                        className="btn btn-danger btn-xs absolute top-2 right-2 rounded-full w-7 h-7 flex items-center justify-center p-0 shadow"
                        onClick={() => handleRemovePhoto(photo.id)}
                        disabled={submitting}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex-between items-center text-xs">
                    <span className="font-semibold truncate text-foreground flex-1 min-w-0" title={photo.file.name}>
                      {photo.file.name}
                    </span>
                    <span className="text-muted font-mono ml-2">
                      {(photo.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  <div>
                    <input
                      type="text"
                      className="form-control text-xs py-1"
                      placeholder="Optional caption (e.g. Front Entrance, Service Bay 1)"
                      value={photo.caption}
                      disabled={submitting || photo.status === 'success' || photo.status === 'error'}
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

                  <div className="flex-between items-center pt-2 border-t border-border">
                    {!photo.isCover && photo.status !== 'error' ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleSetCoverPhoto(photo.id)}
                        disabled={submitting || photo.status === 'success'}
                      >
                        Set as Cover
                      </button>
                    ) : (
                      <span className="text-xs text-muted">
                        {photo.isCover ? 'Cover photo' : ''}
                      </span>
                    )}

                    {photo.status !== 'success' && (
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={() => handleRemovePhoto(photo.id)}
                        disabled={submitting}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
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
