import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CreateGarageRequest } from '../api/types';
import { Alert } from '../components/Alert';

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
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedGarage, setSubmittedGarage] = useState<{ id: number; slug: string; name: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !phoneNumber.trim()) {
      setErrorMessage('Garage Name, Street Address, City, State, PIN Code, and Phone Number are required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

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
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      };

      const result = await api.garageManagement.createListing(payload);
      setSubmittedGarage({ id: result.id, slug: result.slug, name: result.name });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit garage listing.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedGarage) {
    return (
      <div className="container py-12 max-w-2xl">
        <div className="card p-8 text-center animate-fade-in">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-success mb-2">Listing Submitted Successfully!</h2>
          <p className="text-secondary text-sm mb-4">
            Thank you for registering <strong>{submittedGarage.name}</strong> on MeriGarage.
          </p>
          <div className="p-4 bg-surface-raised rounded text-xs text-secondary mb-6 text-left space-y-2">
            <p>
              • <strong>Status:</strong> PENDING APPROVAL.
            </p>
            <p>
              • To prevent spam and maintain high consumer trust, our moderation team audits all new workshops before they appear in public listings.
            </p>
            <p>
              • As the submitter, you can already access workshop management tools in your Owner Hub to upload photos and business credentials.
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
              className="form-control"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
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
                className="form-control"
                placeholder="e.g. 26.9124"
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
                className="form-control"
                placeholder="e.g. 75.7873"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex-between items-center">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting Listing...' : 'Submit Listing for Approval'}
          </button>
        </div>
      </form>
    </div>
  );
};
