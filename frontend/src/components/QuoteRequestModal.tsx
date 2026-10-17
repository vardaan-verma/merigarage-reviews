import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Modal } from './Modal';
import { Alert } from './Alert';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { GarageDetailDto, QuoteRequestDto } from '../api/types';
import {
  resolveVehicleDetails,
  recordUserVehiclePreference,
  getActiveSearchSession,
  safeTrackLeadEvent,
} from '../utils/searchSession';

interface QuoteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  garage: GarageDetailDto;
  onSuccess?: (quote: QuoteRequestDto) => void;
}

const VEHICLE_TYPES = [
  { value: 'CAR', label: 'Car / 4-Wheeler' },
  { value: 'MOTORCYCLE', label: 'Motorcycle / 2-Wheeler' },
  { value: 'SCOOTER', label: 'Scooter' },
  { value: 'COMMERCIAL', label: 'Commercial Vehicle' },
  { value: 'OTHER', label: 'Other' },
];

const FUEL_TYPES = [
  { value: 'PETROL', label: 'Petrol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'CNG', label: 'CNG' },
  { value: 'ELECTRIC', label: 'Electric (EV)' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'OTHER', label: 'Other' },
];

const POPULAR_MAKES = [
  'Maruti Suzuki',
  'Hyundai',
  'Tata',
  'Mahindra',
  'Honda',
  'Toyota',
  'Kia',
  'Volkswagen',
  'Skoda',
  'Hero',
  'Bajaj',
  'Royal Enfield',
  'TVS',
];

export const QuoteRequestModal: React.FC<QuoteRequestModalProps> = ({
  isOpen,
  onClose,
  garage,
  onSuccess,
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [vehicleType, setVehicleType] = useState('CAR');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState<number | ''>('');
  const [fuelType, setFuelType] = useState('PETROL');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [odometerReading, setOdometerReading] = useState<number | ''>('');
  const [preferredDate, setPreferredDate] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<QuoteRequestDto | null>(null);

  // Available services actually offered by this garage
  const availableServices = useMemo(() => {
    return (garage.services || []).filter((s) => s.isAvailable);
  }, [garage.services]);

  // Autofill contact info when user is available or changes
  useEffect(() => {
    if (user) {
      if (user.email && !contactEmail) {
        setContactEmail(user.email);
      }
      if (user.phoneNumber && !contactPhone) {
        setContactPhone(user.phoneNumber);
      }
    }
  }, [user, contactEmail, contactPhone]);

  // Reset form and prefill known criteria when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSubmittedQuote(null);

      const session = getActiveSearchSession();

      // Pre-select matching service from active search session if garage offers it
      if (session?.serviceSlug) {
        const matched = availableServices.find(
          (s) =>
            s.serviceName.toLowerCase().includes(session.serviceName?.toLowerCase() || '') ||
            s.category.toLowerCase().replace(/_/g, '-').includes(session.serviceSlug!.toLowerCase())
        );
        if (matched) {
          setSelectedServiceIds([matched.serviceId]);
        } else if (availableServices.length > 0 && selectedServiceIds.length === 0) {
          setSelectedServiceIds([availableServices[0].serviceId]);
        }
      } else if (availableServices.length > 0 && selectedServiceIds.length === 0) {
        setSelectedServiceIds([availableServices[0].serviceId]);
      }

      // Prefill vehicle using 4-tier precedence:
      // 1. Explicit current values (if user already typed)
      // 2. Active workflow session (e.g. Tata Harrier selected on homepage or Explore)
      // 3. Previously saved user preferences (from past quotes)
      // 4. Empty otherwise
      const resolved = resolveVehicleDetails({
        make: vehicleMake,
        model: vehicleModel,
        type: vehicleType,
      });

      if (!vehicleMake && resolved.make) {
        setVehicleMake(resolved.make);
      }
      if (!vehicleModel && resolved.model) {
        setVehicleModel(resolved.model);
      }
      if (resolved.type && (!vehicleType || vehicleType === 'CAR')) {
        setVehicleType(resolved.type);
      }

      // Autofill phone and email if user profile has them and inputs are blank
      if (!contactPhone && user?.phoneNumber) {
        setContactPhone(user.phoneNumber);
      }
      if (!contactEmail && user?.email) {
        setContactEmail(user.email);
      }
    }
  }, [isOpen, availableServices, user]);

  // Calculate indicative pricing
  const { totalEstimatedMin, allHavePricing, selectedServiceCount } = useMemo(() => {
    if (selectedServiceIds.length === 0) {
      return { totalEstimatedMin: 0, allHavePricing: false, selectedServiceCount: 0 };
    }

    let sum = 0;
    let allPriced = true;

    for (const sId of selectedServiceIds) {
      const s = availableServices.find((srv) => srv.serviceId === sId);
      if (s && s.startingPrice !== undefined && s.startingPrice !== null && s.startingPrice > 0) {
        sum += Number(s.startingPrice);
      } else {
        allPriced = false;
      }
    }

    return {
      totalEstimatedMin: sum,
      allHavePricing: allPriced,
      selectedServiceCount: selectedServiceIds.length,
    };
  }, [selectedServiceIds, availableServices]);

  const toggleService = (serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (selectedServiceIds.length === 0) {
      setError('Please select at least one service for your quote request.');
      return;
    }

    if (!vehicleMake.trim() || !vehicleModel.trim()) {
      setError('Please provide both vehicle make/brand and model name.');
      return;
    }

    if (!problemDescription.trim() || problemDescription.trim().length < 10) {
      setError('Please describe the problem or requested work (at least 10 characters).');
      return;
    }

    const cleanPhone = contactPhone.replace(/[^\d]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit contact phone number.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        garageId: garage.id,
        serviceIds: selectedServiceIds,
        vehicleType,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: vehicleYear ? Number(vehicleYear) : null,
        fuelType,
        registrationNumber: registrationNumber.trim().toUpperCase() || null,
        odometerReading: odometerReading ? Number(odometerReading) : null,
        problemDescription: problemDescription.trim(),
        customerMessage: customerMessage.trim() || null,
        contactPhone: cleanPhone,
        contactEmail: contactEmail.trim() || user?.email || null,
        preferredDate: preferredDate || null,
      };

      const result = await api.quotes.create(payload);
      setSubmittedQuote(result);

      // Record user vehicle preference for future sessions
      recordUserVehiclePreference({
        make: vehicleMake.trim(),
        model: vehicleModel.trim(),
        type: vehicleType,
      });

      // Track distinct event: User submits a quote request
      await safeTrackLeadEvent('QUOTE_REQUEST_SUBMITTED', {
        garageId: garage.id,
        garageSlug: garage.slug,
        city: garage.city,
        state: garage.state,
        vehicleType,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        phoneNumber: cleanPhone,
        source: 'quote_modal',
        metadata: {
          garageName: garage.name,
          referenceNumber: result.referenceNumber,
          quoteRequestId: result.id,
          contactEmail: contactEmail.trim() || user?.email || undefined,
        },
      });

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit quote request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={submittedQuote ? 'Quote Request Submitted!' : `Get a Quote — ${garage.name}`}
      maxWidth="lg"
    >
      {submittedQuote ? (
        <div className="py-4 text-center space-y-5">
          <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Quote Request Sent Successfully!</h3>
            <p className="text-sm text-secondary max-w-md mx-auto">
              Your request has been routed directly to the authorized management team of{' '}
              <strong className="text-white">{garage.name}</strong>.
            </p>
          </div>

          <div className="card p-5 bg-surface text-left max-w-md mx-auto space-y-3 border border-border">
            <div className="flex justify-between items-center text-xs border-b border-border pb-2">
              <span className="text-muted">Reference Number:</span>
              <span className="font-mono font-bold text-primary text-sm">
                {submittedQuote.referenceNumber}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Vehicle:</span>
              <span className="text-white font-medium">
                {submittedQuote.vehicleMake} {submittedQuote.vehicleModel}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Initial Indicative Rate:</span>
              <span className="font-semibold text-white">
                {submittedQuote.estimatedMinPrice
                  ? `₹${Number(submittedQuote.estimatedMinPrice).toLocaleString('en-IN')} (Starting Range)`
                  : 'Pending Owner Review'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Status:</span>
              <span className="badge badge-warning text-2xs uppercase">Pending Review</span>
            </div>
          </div>

          <p className="text-xs text-muted max-w-lg mx-auto">
            The garage owner will review your vehicle specifications and message, then send back an
            itemized proposed quotation and timeline through your MeriGarage account.
          </p>

          <div className="flex gap-3 justify-center pt-2 flex-wrap">
            <Link
              to="/my-quotes"
              className="btn btn-primary"
              onClick={onClose}
            >
              Track in My Quotes
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isAuthenticated && (
            <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between gap-3 text-xs">
              <span className="text-white">
                🔒 You need to be signed in to submit your quote request directly to {garage.name}.
              </span>
              <Link to="/login" className="btn btn-primary btn-xs whitespace-nowrap">
                Sign In
              </Link>
            </div>
          )}

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {/* Garage Banner */}
          <div className="p-3 bg-surface rounded-lg border border-border flex items-center justify-between text-xs">
            <div>
              <span className="text-muted block text-2xs uppercase tracking-wider">Target Workshop</span>
              <span className="font-bold text-white text-sm">{garage.name}</span>
              <span className="text-muted block">📍 {garage.city}, {garage.state}</span>
            </div>
            {garage.isVerified && (
              <span className="badge badge-verified text-2xs">✓ Verified Workshop</span>
            )}
          </div>

          {/* 1. Service Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-white">
                1. Select Services Needed <span className="text-danger">*</span>
              </label>
              <span className="text-2xs text-muted">
                {selectedServiceCount} selected
              </span>
            </div>

            {availableServices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-border rounded-lg bg-surface/50">
                {availableServices.map((srv) => {
                  const isSelected = selectedServiceIds.includes(srv.serviceId);
                  return (
                    <button
                      key={srv.serviceId}
                      type="button"
                      onClick={() => toggleService(srv.serviceId)}
                      className={`text-left p-2.5 rounded-md border text-xs transition-all flex justify-between items-center cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-border bg-surface hover:border-primary/50 text-white'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="font-bold truncate">{srv.serviceName}</div>
                        <div className={`text-2xs truncate ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                          {srv.category.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        {srv.startingPrice ? (
                          <span className={`font-mono font-bold ${isSelected ? 'text-white' : 'text-primary'}`}>
                            ₹{Number(srv.startingPrice).toLocaleString('en-IN')}+
                          </span>
                        ) : (
                          <span className={`text-2xs ${isSelected ? 'text-white/70' : 'text-muted'}`}>
                            Estimate
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-surface text-center border border-border text-xs text-muted">
                This workshop has not configured specific fixed-rate services yet. You can describe your required work in the problem field below and request a customized quote.
              </div>
            )}
          </div>

          {/* 2. Vehicle Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">2. Vehicle Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">
                  Vehicle Type <span className="text-danger">*</span>
                </label>
                <select
                  className="input text-xs"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  required
                >
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">
                  Make / Brand <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="e.g. Maruti Suzuki, Tata"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label text-xs">
                  Model <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="e.g. Swift, Nexon, City"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Quick-select Make tags */}
            <div className="flex flex-wrap gap-1.5 items-center pt-1">
              <span className="text-2xs text-muted">Quick select:</span>
              {POPULAR_MAKES.slice(0, 7).map((mk) => (
                <button
                  key={mk}
                  type="button"
                  onClick={() => setVehicleMake(mk)}
                  className="text-2xs px-2 py-0.5 rounded border border-border bg-surface text-muted hover:border-primary hover:text-white transition-colors"
                >
                  {mk}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="label text-xs">Year (Optional)</label>
                <input
                  type="number"
                  className="input text-xs"
                  placeholder="e.g. 2021"
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value ? Number(e.target.value) : '')}
                />
              </div>

              <div>
                <label className="label text-xs">Fuel / Powertrain</label>
                <select
                  className="input text-xs"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Reg. Number (Opt)</label>
                <input
                  type="text"
                  className="input text-xs font-mono uppercase"
                  placeholder="DL 01 AB 1234"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs">Odometer (km)</label>
                <input
                  type="number"
                  className="input text-xs"
                  placeholder="e.g. 35000"
                  min="0"
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>
          </div>

          {/* 3. Problem Description & Message */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">3. Problem Description & Message</h4>
            <div>
              <label className="label text-xs">
                Describe the problem or required work <span className="text-danger">*</span>
              </label>
              <textarea
                className="input text-xs min-h-[75px]"
                placeholder="Explain the vehicle symptoms, strange noises, service needs or issues you're experiencing..."
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                required
              />
              <span className="text-2xs text-muted block mt-1">
                Minimum 10 characters ({problemDescription.trim().length}/10)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Preferred Service Date (Optional)</label>
                <input
                  type="date"
                  className="input text-xs"
                  min={new Date().toISOString().split('T')[0]}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Additional Instructions (Optional)</label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="e.g. Prefer morning drop-off, budget limit, etc."
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 4. Customer Contact Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white">4. Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">
                  Contact Mobile Number <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  className="input text-xs"
                  placeholder="10-digit mobile number"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label text-xs">Email Address</label>
                <input
                  type="email"
                  className="input text-xs"
                  placeholder="your.email@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
            <p className="text-2xs text-muted block mt-1" style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              🔒 Your contact information is shared exclusively with {garage.name} for fulfilling this quote request. No third-party spam.
            </p>
          </div>

          {/* 5. Indicative Pricing Estimate Banner */}
          <div className="p-4 rounded-lg bg-surface border border-border space-y-1.5">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-semibold text-secondary">
                Indicative Price Estimate:
              </span>
              <span className="text-base font-extrabold text-white">
                {allHavePricing && totalEstimatedMin > 0 ? (
                  <span className="text-primary font-mono">
                    ₹{totalEstimatedMin.toLocaleString('en-IN')}{' '}
                    <span className="text-xs text-muted font-normal">(Starting Estimate)</span>
                  </span>
                ) : (
                  <span className="text-xs text-amber-400 font-medium">
                    To be quoted by workshop upon review
                  </span>
                )}
              </span>
            </div>
            <p className="text-2xs text-muted leading-relaxed">
              * Indicative estimates are based strictly on base workshop catalogue rates. Actual
              final quotations depend on physical inspection, vehicle variant, genuine spare parts,
              and diagnostics. The workshop will provide a formal quotation for your approval.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner spinner-sm"></span>
                  Submitting Request...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  Submit Quote Request
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
