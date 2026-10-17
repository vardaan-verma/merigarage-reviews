import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { GarageSummaryDto, ServiceDto } from '../api/types';
import { GarageCard } from '../components/GarageCard';
import { Alert } from '../components/Alert';
import scribbleUnderline from '../assets/scribble-underline.png';
import {
  safeTrackLeadEvent,
  setActiveSearchSession,
  parseVehicleString,
  mapServiceNameToSlug,
  notifySearchStarted,
} from '../utils/searchSession';

// Floating WebP elements for cinematic animated hero
import tireImg from '../assets/hero-elements/01_tire.webp';
import sparkPlugImg from '../assets/hero-elements/02_spark_plug.webp';
import pistonImg from '../assets/hero-elements/03_piston.webp';
import gearsImg from '../assets/hero-elements/04_gears.webp';
import wrenchImg from '../assets/hero-elements/05_wrench.webp';
import oilCanImg from '../assets/hero-elements/06_oil_can.webp';
import batteryImg from '../assets/hero-elements/08_battery.webp';
import pliersImg from '../assets/hero-elements/10_pliers.webp';
import brakeDiscImg from '../assets/hero-elements/18_brake_disc.webp';

// State and city presets
const INDIAN_STATES_CITIES: Record<string, string[]> = {
  'Delhi NCR': ['Delhi', 'Gurugram', 'Noida', 'Faridabad', 'Ghaziabad'],
  Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal'],
  Maharashtra: ['Mumbai', 'Pune', 'Thane', 'Navi Mumbai', 'Nagpur', 'Nashik'],
  Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
  'Uttar Pradesh': ['Noida', 'Lucknow', 'Kanpur', 'Agra', 'Ghaziabad', 'Varanasi'],
  Telangana: ['Hyderabad', 'Secunderabad', 'Warangal'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'West Bengal': ['Kolkata', 'Howrah', 'Siliguri'],
};

const POPULAR_VEHICLES = [
  'Maruti Suzuki Swift / Dzire',
  'Maruti Suzuki Baleno / Brezza',
  'Hyundai Creta / Venue',
  'Hyundai i20 / Grand i10',
  'Tata Nexon / Punch',
  'Tata Harrier / Safari',
  'Mahindra Thar / Scorpio-N',
  'Mahindra XUV700',
  'Honda City / Amaze',
  'Toyota Innova / Fortuner',
  'Kia Seltos / Sonet',
  'Volkswagen Virtus / Taigun',
  'Skoda Slavia / Kushaq',
  'Electric Car (EV)',
  'Motorcycle / Scooter (2-Wheeler)',
  'Other Vehicle',
];

const POPULAR_SERVICES_LIST = [
  'Periodic Maintenance Service',
  'AC Service & Gas Recharge',
  'Denting, Painting & Scratch Repair',
  'Brake Pads & Disc Replacement',
  'Tyres, Wheel Alignment & Balancing',
  'Battery Replacement & Electricals',
  'Clutch & Suspension Overhaul',
  'Car Spa & Deep Detailing',
];

export const HomePage: React.FC = () => {
  const [featuredGarages, setFeaturedGarages] = useState<GarageSummaryDto[]>([]);
  const [popularServices, setPopularServices] = useState<ServiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hero Lead Generation & Quote Form State
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [selectedCar, setSelectedCar] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [mobileFormExpanded, setMobileFormExpanded] = useState(false);

  // GPS Locate state
  const [locateStatus, setLocateStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'unavailable'>('idle');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      try {
        setLoading(true);
        const [garagesRes, servicesRes] = await Promise.all([
          api.garages.list({ page: 0, size: 6, isVerified: true }),
          api.services.list(),
        ]);

        if (isMounted) {
          setFeaturedGarages(garagesRes.content || []);
          setPopularServices((servicesRes || []).filter((s) => s.isActive).slice(0, 6));
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load home page listings');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update available cities when state changes
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity('');
    setCustomCity('');
    notifySearchStarted({ state });
  };

  const handleUseCurrentLocation = () => {
    if (locateStatus === 'locating') return;

    if (!('geolocation' in navigator)) {
      setLocateStatus('unavailable');
      setFormError('Browser geolocation is not supported.');
      return;
    }

    setLocateStatus('locating');
    setFormError(null);
    notifySearchStarted();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserCoords({ lat, lng });
        setLocateStatus('success');

        // Attempt reverse geocoding to determine State and City
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
          );
          if (resp.ok) {
            const data = await resp.json();
            const addr = data?.address || {};
            const detectedCity = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || '';
            const detectedState = addr.state || '';

            let matchedState = Object.keys(INDIAN_STATES_CITIES).find(
              (st) => st.toLowerCase() === detectedState.toLowerCase() || detectedState.toLowerCase().includes(st.toLowerCase())
            );
            if (matchedState) {
              setSelectedState(matchedState);
              const cities = INDIAN_STATES_CITIES[matchedState] || [];
              const matchedCity = cities.find(
                (c) => c.toLowerCase() === detectedCity.toLowerCase() || detectedCity.toLowerCase().includes(c.toLowerCase())
              );
              if (matchedCity) {
                setSelectedCity(matchedCity);
              } else if (detectedCity) {
                setSelectedCity('Other');
                setCustomCity(detectedCity);
              }
            } else if (detectedCity) {
              setSelectedCity('Other');
              setCustomCity(detectedCity);
            }
          }
        } catch {
          // If geocoding fails, coordinates are still stored for distance sorting
        }
        setFormError(null);
      },
      (geoError) => {
        setUserCoords(null);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocateStatus('denied');
          setFormError('Location permission denied. Please select your state and city manually.');
        } else {
          setLocateStatus('unavailable');
          setFormError('Unable to detect location. Please select your state and city manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleLeadQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cityToUse = (customCity.trim() || selectedCity).trim();
    const cleanPhone = mobileNumber.replace(/\D/g, '');

    // Optional phone number validation (validate 10 digits if entered)
    if (cleanPhone && cleanPhone.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setFormSubmitted(true);

    // Parse vehicle details and canonical service slug
    const parsedVehicle = parseVehicleString(selectedCar);
    const serviceSlug = mapServiceNameToSlug(selectedService);

    // Save search workflow into browser session (NO phone number in session or query string for privacy)
    setActiveSearchSession({
      state: selectedState || undefined,
      city: cityToUse && cityToUse !== 'Near You' ? cityToUse : undefined,
      vehicleType: parsedVehicle.type,
      vehicleMake: parsedVehicle.make,
      vehicleModel: parsedVehicle.model,
      rawVehicle: selectedCar || undefined,
      serviceSlug: serviceSlug || undefined,
      serviceName: selectedService || undefined,
      source: 'landing_page',
    });

    // Persist HOMEPAGE_SEARCH_SUBMITTED event via real backend endpoint
    // Phone is passed securely in POST payload; never in URL or public GET params
    await safeTrackLeadEvent('HOMEPAGE_SEARCH_SUBMITTED', {
      state: selectedState || undefined,
      city: cityToUse && cityToUse !== 'Near You' ? cityToUse : undefined,
      serviceSlug: serviceSlug || undefined,
      serviceName: selectedService || undefined,
      vehicleType: parsedVehicle.type,
      vehicleMake: parsedVehicle.make,
      vehicleModel: parsedVehicle.model,
      phoneNumber: cleanPhone || undefined,
      source: 'landing_page',
    });

    // Build URL query parameters for Explore Garages
    const params = new URLSearchParams();
    if (locateStatus === 'success' && userCoords) {
      params.set('lat', userCoords.lat.toString());
      params.set('lng', userCoords.lng.toString());
      params.set('sortBy', 'distance');
    }
    if (cityToUse && cityToUse !== 'Near You') {
      params.set('city', cityToUse);
    }
    if (selectedState) {
      params.set('state', selectedState);
    }
    if (serviceSlug) {
      params.set('serviceSlug', serviceSlug);
    } else if (selectedService) {
      params.set('search', selectedService.split(' ')[0]);
    }
    if (selectedCar) {
      params.set('vehicle', selectedCar);
    }

    const queryString = params.toString();
    navigate(queryString ? `/garages?${queryString}` : '/garages');
  };

  // Standard automotive icon mapping
  const getServiceIcon = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('ac')) return 'ac_unit';
    if (lower.includes('oil')) return 'oil_barrel';
    if (lower.includes('tyre') || lower.includes('wheel')) return 'tire_repair';
    if (lower.includes('dent') || lower.includes('paint') || lower.includes('body')) return 'car_crash';
    if (lower.includes('wash') || lower.includes('clean') || lower.includes('spa')) return 'local_car_wash';
    if (lower.includes('brake')) return 'minor_crash';
    if (lower.includes('battery') || lower.includes('electric')) return 'bolt';
    return 'build';
  };

  return (
    <div className="home-page">
      <div className="home-page-bg-pattern" aria-hidden="true"></div>

      {/* Cinematic Hero Section Inspired by Reference Design */}
      <header className="hero-section" role="banner">
        {/* Floating Animated Automotive WebP Elements strictly in Hero */}
        <div className="hero-floating-elements" aria-hidden="true">
          <img src={tireImg} alt="" className="floating-elem elem-tire" />
          <img src={sparkPlugImg} alt="" className="floating-elem elem-spark" />
          <img src={gearsImg} alt="" className="floating-elem elem-gears" />
          <img src={wrenchImg} alt="" className="floating-elem elem-wrench" />
          <img src={pistonImg} alt="" className="floating-elem elem-piston" />
          <img src={oilCanImg} alt="" className="floating-elem elem-oil" />
          <img src={batteryImg} alt="" className="floating-elem elem-battery" />
          <img src={pliersImg} alt="" className="floating-elem elem-pliers" />
          <img src={brakeDiscImg} alt="" className="floating-elem elem-brake" />
        </div>

        <div className="container hero-container">
          <div className="hero-grid">
            {/* Bold Headline & Trust Value Proposition */}
            <div className="hero-heading-block">
              <div className="hero-text-content">
                {/* Mobile Location Shortcut Pill (Phone 01 & 02) */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="mobile-location-pill"
                  aria-label="Select or detect location"
                  title="Tap to detect or change location"
                >
                  <span className="material-symbols-outlined text-sm text-primary">search</span>
                  <span className="truncate max-w-[200px]">
                    {locateStatus === 'locating'
                      ? 'Detecting...'
                      : (customCity || selectedCity)
                      ? `${customCity || selectedCity}, ${selectedState || 'India'}`
                      : 'Select a location'}
                  </span>
                  <span className="text-2xs text-muted">▼</span>
                </button>

                {/* Desktop Network Badge */}
                <div className="hero-network-pill">
                  <span className="pulse-indicator" aria-hidden="true"></span>
                  <span>INDIA'S TRUSTED GARAGE NETWORK</span>
                </div>

                <h1 className="hero-title">
                  <span className="hero-title-line hero-line-find">Find a</span>{' '}
                  <span className="hero-title-line hero-line-trusted">
                    <span className="hero-trusted-wrap">
                      <span className="hero-accent-text homemade-apple-regular">
                        trusted
                      </span>
                      <img
                        src={scribbleUnderline}
                        alt=""
                        className="hero-scribble-underline"
                        aria-hidden="true"
                      />
                    </span>
                  </span>{' '}
                  <span className="hero-title-line hero-line-garage">garage</span>
                </h1>

                <p className="hero-subtitle">
                  Discover authorized workshops & expert mechanics near you. No surprise charges, no guesswork.
                </p>
              </div>

              <div className="hero-bottom-content">
                {/* Desktop Action Buttons */}
                <div className="hero-actions">
                  <Link to="/garages" className="btn btn-primary btn-lg hero-cta-btn">
                    <span className="material-symbols-outlined text-lg">star</span>
                    <span>Write a Review</span>
                  </Link>
                  <Link to="/submit-garage" className="btn btn-secondary btn-lg hero-cta-btn">
                    List Your Garage
                  </Link>
                </div>

                {/* Desktop Trust Metric Stats Bar */}
                <div className="hero-stats-row">
                  <div className="hero-stat-item">
                    <span className="stat-number">5,000+</span>
                    <span className="stat-label">Verified garages</span>
                  </div>
                  <div className="hero-stat-divider" aria-hidden="true"></div>
                  <div className="hero-stat-item">
                    <span className="stat-number">50,000+</span>
                    <span className="stat-label">Happy customers</span>
                  </div>
                  <div className="hero-stat-divider" aria-hidden="true"></div>
                  <div className="hero-stat-item">
                    <span className="stat-number">4.7 ★</span>
                    <span className="stat-label">Average rating</span>
                  </div>
                  <div className="hero-stat-divider" aria-hidden="true"></div>
                  <div className="hero-stat-item">
                    <span className="stat-number">15+</span>
                    <span className="stat-label">Cities active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Lead Generation & Instant Quote Card */}
            <div className="hero-form-col">
              <div className={`hero-quote-card ${mobileFormExpanded ? 'is-mobile-expanded' : ''}`}>
                {/* Header (Acts as disclosure accordion toggle on mobile) */}
                <button
                  type="button"
                  className="quote-card-header-toggle"
                  onClick={() => setMobileFormExpanded((prev) => !prev)}
                  aria-expanded={mobileFormExpanded}
                  aria-controls="hero-quote-form-body"
                  id="hero-quote-form-header"
                >
                  <div className="quote-card-header-content">
                    <h2 className="quote-card-title">Experience the Best Car Services Near You</h2>
                    <p className="quote-card-subtitle">Get instant quotes from verified garages</p>
                  </div>
                  <span
                    className={`quote-card-chevron material-symbols-outlined ${
                      mobileFormExpanded ? 'is-expanded' : ''
                    }`}
                    aria-hidden="true"
                  >
                    expand_more
                  </span>
                </button>

                {/* Collapsed State CTA for Mobile (State 01) */}
                <div className="mobile-collapsed-cta">
                  <button
                    type="button"
                    className="btn btn-primary btn-quote-action"
                    onClick={() => setMobileFormExpanded(true)}
                  >
                    Find a Trusted Garage
                  </button>
                </div>

                {/* Form Controls (Expanded on mobile State 02, always visible on desktop) */}
                <form
                  id="hero-quote-form-body"
                  role="region"
                  aria-labelledby="hero-quote-form-header"
                  onSubmit={handleLeadQuoteSubmit}
                  className="quote-card-body"
                  noValidate
                >
                  {formError && (
                    <div className="quote-form-alert text-xs text-danger mb-2 font-medium">
                      ⚠️ {formError}
                    </div>
                  )}

                  {/* Field 1: State & City */}
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="hero-state-select">
                      SELECT LOCATION / CITY
                    </label>
                    <div className="grid-2-inputs">
                      <select
                        id="hero-state-select"
                        value={selectedState}
                        onChange={handleStateChange}
                        className="quote-select"
                        aria-label="Select State"
                      >
                        <option value="">-- Select State --</option>
                        {Object.keys(INDIAN_STATES_CITIES).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <div className="city-input-wrap">
                        <select
                          id="hero-city-select"
                          value={selectedCity}
                          onChange={(e) => {
                            setSelectedCity(e.target.value);
                            setCustomCity('');
                          }}
                          className="quote-select"
                          aria-label="Select City"
                        >
                          <option value="">-- Select City --</option>
                          {(INDIAN_STATES_CITIES[selectedState] || []).map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                          {selectedState && <option value="Other">Other City...</option>}
                        </select>
                      </div>
                    </div>

                    {selectedCity === 'Other' && (
                      <input
                        type="text"
                        placeholder="Enter your city name"
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        className="quote-input mt-2"
                        aria-label="Custom City Name"
                      />
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="locate-shortcut-btn"
                        disabled={locateStatus === 'locating'}
                      >
                        <span className="material-symbols-outlined text-xs">my_location</span>
                        <span>
                          {locateStatus === 'locating'
                            ? 'Detecting...'
                            : locateStatus === 'success'
                            ? 'Location Detected ✓'
                            : 'Or detect location'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Field 2: Select Car / Vehicle */}
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="hero-car-select">
                      SELECT CAR MAKE & MODEL
                    </label>
                    <select
                      id="hero-car-select"
                      value={selectedCar}
                      onChange={(e) => {
                        setSelectedCar(e.target.value);
                        notifySearchStarted();
                      }}
                      className="quote-select"
                      aria-label="Select Your Car or Vehicle"
                    >
                      <option value="">Select Car Make & Model (Optional)</option>
                      {POPULAR_VEHICLES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field 3: Service Needed */}
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="hero-service-select">
                      SELECT SERVICE TYPE
                    </label>
                    <select
                      id="hero-service-select"
                      value={selectedService}
                      onChange={(e) => {
                        setSelectedService(e.target.value);
                        notifySearchStarted();
                      }}
                      className="quote-select"
                      aria-label="Select Service"
                    >
                      <option value="">Select Service Type (Optional)</option>
                      {POPULAR_SERVICES_LIST.map((srv) => (
                        <option key={srv} value={srv}>
                          {srv}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field 4: Mobile Number */}
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="hero-mobile-input">
                      MOBILE NUMBER
                    </label>
                    <div className="phone-input-wrap">
                      <span className="phone-prefix">
                        <span className="material-symbols-outlined text-sm text-primary">call</span>
                        <span>+91</span>
                      </span>
                      <input
                        id="hero-mobile-input"
                        type="tel"
                        maxLength={10}
                        placeholder="Enter mobile number"
                        value={mobileNumber}
                        onChange={(e) => {
                          setMobileNumber(e.target.value.replace(/\D/g, ''));
                          notifySearchStarted();
                        }}
                        className="quote-input phone-field"
                        aria-label="Mobile Number for Quote"
                      />
                    </div>
                    <p className="privacy-notice-text">
                      🔒 Mobile number is used strictly to share quotes from verified garages. No spam.
                    </p>
                  </div>

                  {/* Primary Form CTA */}
                  <button
                    type="submit"
                    className="btn btn-primary btn-quote-action"
                    disabled={formSubmitted}
                  >
                    {formSubmitted ? 'FINDING WORKSHOPS...' : 'Find a Trusted Garage'}
                  </button>

                  {/* Trust Endorsement Under Form */}
                  <div className="quote-card-trust">
                    <div className="trust-stars-row">
                      <span className="stars-icons text-amber-400">★★★★★</span>
                      <span className="stars-score">4.8 Rating</span>
                      <span className="stars-meta">• 50k+ Happy Customers | MeriGarage Promise</span>
                    </div>
                  </div>
                </form>
              </div>

              {/* Mobile Secondary Action Pills (State 01) */}
              <div className="mobile-hero-secondary-actions">
                <Link to="/garages" className="mobile-pill-btn mobile-pill-primary">
                  Online Booking
                </Link>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="mobile-pill-btn mobile-pill-secondary"
                >
                  Find Near Garage
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile 3-column Statistics Row matching State 03 reference */}
      <div className="mobile-stats-row">
        <div className="mobile-stat-box">
          <span className="mobile-stat-val">5,000+</span>
          <span className="mobile-stat-lbl">Services done</span>
        </div>
        <div className="mobile-stat-divider" aria-hidden="true"></div>
        <div className="mobile-stat-box">
          <span className="mobile-stat-val">30,000+</span>
          <span className="mobile-stat-lbl">Happy customers</span>
        </div>
        <div className="mobile-stat-divider" aria-hidden="true"></div>
        <div className="mobile-stat-box">
          <span className="mobile-stat-val">4.7 ★</span>
          <span className="mobile-stat-lbl">Rating</span>
        </div>
      </div>

      {/* Short horizontal divider */}
      <div className="section-divider-short" aria-hidden="true"></div>

      {/* Popular Services Section */}
      <section className="py-14">
        <div className="container">
          <div className="flex-between items-end mb-8">
            <div>
              <span className="text-xs font-bold text-primary tracking-widest uppercase">
                Expertise & Standards
              </span>
              <h2 className="text-2xl font-bold mt-1">Popular Workshop Services</h2>
              <p className="text-secondary text-sm mt-1">
                Standardized automotive categories with transparent pricing guidelines and audited parts.
              </p>
            </div>
            <Link to="/services" className="btn btn-outline btn-sm">
              View All Services →
            </Link>
          </div>

          <div className="services-showcase-grid">
            {(popularServices.length > 0
              ? popularServices
              : [
                  { id: 1, name: 'Periodic Service', description: 'Comprehensive 40-pt inspection' },
                  { id: 2, name: 'AC Service', description: 'Cooling gas & filter diagnosis' },
                  { id: 3, name: 'Oil Change', description: 'Engine synthetic oil replacement' },
                  { id: 4, name: 'Tyres & Wheels', description: 'Alignment and balancing' },
                  { id: 5, name: 'Denting & Painting', description: 'Body repairs and paint match' },
                  { id: 6, name: 'Car Spa & Detailing', description: 'Deep foam cleaning' },
                ]
            ).map((service) => (
              <div
                key={service.id}
                onClick={() => navigate(`/garages?search=${encodeURIComponent(service.name)}`)}
                className="service-feature-card group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/garages?search=${encodeURIComponent(service.name)}`);
                }}
              >
                <div className="service-icon-bubble">
                  <span className="material-symbols-outlined text-3xl service-icon">
                    {getServiceIcon(service.name)}
                  </span>
                </div>
                <h4 className="service-card-title">{service.name}</h4>
                <p className="service-card-desc">{service.description || 'Transparent estimates'}</p>
                <span className="service-explore-link">
                  Explore Workshops →
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Short horizontal divider */}
      <div className="section-divider-short" aria-hidden="true"></div>

      {/* Featured Verified Garages Section */}
      <section className="py-16">
        <div className="container">
          <div className="flex-between items-end mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-verified">
                  <span className="material-symbols-outlined text-xs">verified</span> 100% Vetted
                </span>
              </div>
              <h2 className="text-2xl font-bold">Featured Verified Workshops</h2>
              <p className="text-secondary text-sm mt-1">
                Independently audited garages with inspected trade registrations and genuine customer ratings.
              </p>
            </div>
            <Link to="/garages?verified=true" className="btn btn-outline btn-sm">
              Explore All Garages →
            </Link>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" />}

          {loading ? (
            <div className="center-loader">
              <div className="spinner"></div>
              <p className="text-muted mt-3 text-sm">Loading verified automotive listings...</p>
            </div>
          ) : featuredGarages.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined text-5xl text-slate-500">garage</span>
              <h3 className="text-lg font-bold">No verified workshops listed yet</h3>
              <p className="text-sm text-secondary max-w-md">
                Be the pioneer in your city! List your automotive service center and receive verified status.
              </p>
              <Link to="/submit-garage" className="btn btn-primary mt-4">
                + List Your Workshop
              </Link>
            </div>
          ) : (
            <div className="garage-grid">
              {featuredGarages.map((garage) => (
                <GarageCard key={garage.id} garage={garage} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Short horizontal divider */}
      <div className="section-divider-short" aria-hidden="true"></div>

      {/* How It Works Section for Motorists */}
      <section className="py-16">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">
              Simple & Reliable Process
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1">How MeriGarage Works</h2>
            <p className="text-secondary text-sm mt-2">
              Three seamless steps to finding trustworthy mechanics and getting transparent estimates.
            </p>
          </div>

          <div className="how-it-works-grid">
            {/* Step 1 */}
            <div className="step-card">
              <div className="step-badge">1</div>
              <div className="step-icon-wrap">
                <span className="material-symbols-outlined text-primary text-3xl">location_searching</span>
              </div>
              <h3 className="step-title">Discover Nearby Workshops</h3>
              <p className="step-desc">
                Filter by your city, vehicle model, or service type. Browse audited photos, workshop certifications, and physical addresses.
              </p>
            </div>

            {/* Step 2 */}
            <div className="step-card">
              <div className="step-badge">2</div>
              <div className="step-icon-wrap">
                <span className="material-symbols-outlined text-primary text-3xl">request_quote</span>
              </div>
              <h3 className="step-title">Request Itemized Quotes</h3>
              <p className="step-desc">
                Submit quote inquiries directly to workshop owners with part disclosures, labour estimates, and estimated timelines.
              </p>
            </div>

            {/* Step 3 */}
            <div className="step-card">
              <div className="step-badge">3</div>
              <div className="step-icon-wrap">
                <span className="material-symbols-outlined text-primary text-3xl">verified</span>
              </div>
              <h3 className="step-title">Get Serviced & Review</h3>
              <p className="step-desc">
                Enjoy quality automotive care without surprise add-on charges. Leave authentic reviews that help your local motorist community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Short horizontal divider */}
      <div className="section-divider-short" aria-hidden="true"></div>

      {/* Trust & Verification Platform Pillars */}
      <section className="py-16">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">
              Our Core Promise
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1">The MeriGarage Trust Standard</h2>
            <p className="text-secondary text-sm mt-2">
              Why vehicle owners across India trust our platform over unmoderated web directories.
            </p>
          </div>

          <div className="trust-pillars-grid">
            <div className="feature-card">
              <span className="material-symbols-outlined text-primary text-3xl mb-3">verified_user</span>
              <h3 className="feature-title">Verified Workshops</h3>
              <p className="text-sm text-secondary">
                Rigorous administrative checks on trade licenses, GST credentials, and physical workshop locations.
              </p>
            </div>

            <div className="feature-card">
              <span className="material-symbols-outlined text-primary text-3xl mb-3">star_rate</span>
              <h3 className="feature-title">Genuine Ratings</h3>
              <p className="text-sm text-secondary">
                Authentic multidimensional reviews assessing Service Quality, Pricing Transparency, Timelines, and Communication.
              </p>
            </div>

            <div className="feature-card">
              <span className="material-symbols-outlined text-primary text-3xl mb-3">forum</span>
              <h3 className="feature-title">Owner Accountability</h3>
              <p className="text-sm text-secondary">
                Verified workshop owners reply directly to motorist questions and quote requests with complete accountability.
              </p>
            </div>

            <div className="feature-card">
              <span className="material-symbols-outlined text-primary text-3xl mb-3">receipt_long</span>
              <h3 className="feature-title">Transparent Estimates</h3>
              <p className="text-sm text-secondary">
                Itemized quotes disclosing genuine OEM vs aftermarket part selections with clear labour breakdowns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Short horizontal divider */}
      <div className="section-divider-short" aria-hidden="true"></div>

      {/* Workshop Owner Callout */}
      <section className="py-16">
        <div className="container">
          <div className="cta-banner p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="badge badge-accent mb-3">For Garage Owners & Technicians</span>
              <h2 className="text-3xl font-extrabold text-white">
                Grow Your Independent Automotive Business
              </h2>
              <p className="text-secondary text-sm mt-2 leading-relaxed">
                Connect with thousands of motorists in your city. Claim an existing listing or submit your workshop, upload high-resolution workshop photos, publish your service catalogue, and receive direct customer quote requests.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/submit-garage" className="btn btn-primary btn-lg">
                + List Your Workshop
              </Link>
              <Link to="/garages" className="btn btn-secondary btn-lg">
                Find & Claim Listing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
