import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { GarageSummaryDto, ServiceDto } from '../api/types';
import { GarageCard } from '../components/GarageCard';
import { Alert } from '../components/Alert';

export const HomePage: React.FC = () => {
  const [featuredGarages, setFeaturedGarages] = useState<GarageSummaryDto[]>([]);
  const [popularServices, setPopularServices] = useState<ServiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
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
          setPopularServices((servicesRes || []).filter((s) => s.isActive).slice(0, 8));
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (cityQuery.trim()) params.set('city', cityQuery.trim());
    navigate(`/garages?${params.toString()}`);
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="badge badge-accent mb-3 animate-fade-in">
              🇮🇳 India's Independent Automotive Review Hub
            </span>
            <h1 className="hero-title animate-fade-in">
              Find Reliable Mechanics & Verified Garages You Can Trust
            </h1>
            <p className="hero-subtitle text-secondary">
              Explore authentic customer ratings, verified workshop services, approved photos,
              and direct owner accountability.
            </p>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="hero-search-bar animate-fade-in">
              <div className="search-input-group">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Garage name or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  aria-label="Search garages"
                />
              </div>

              <div className="search-input-group city-input-group">
                <span className="search-icon">📍</span>
                <input
                  type="text"
                  placeholder="City (e.g. Mumbai, Delhi, Jaipur)"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  className="search-input"
                  aria-label="Filter by City"
                />
              </div>

              <button type="submit" className="btn btn-primary search-submit-btn">
                Search Garages
              </button>
            </form>

            <div className="hero-quick-tags mt-3">
              <span className="text-xs text-muted">Popular Cities: </span>
              {['Delhi', 'Mumbai', 'Bengaluru', 'Pune', 'Jaipur'].map((city) => (
                <button
                  key={city}
                  type="button"
                  className="tag-btn"
                  onClick={() => navigate(`/garages?city=${encodeURIComponent(city)}`)}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Highlights */}
      <section className="py-8 bg-surface-raised">
        <div className="container">
          <div className="grid grid-4 gap-6">
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3 className="feature-title">Verified Garages</h3>
              <p className="text-sm text-secondary">
                Rigorous administrative checks on trade licenses, tax documents, and workshop location.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3 className="feature-title">Real Customer Reviews</h3>
              <p className="text-sm text-secondary">
                Authentic reviews from registered motorists, protected from spam and manipulation.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">Owner Accountability</h3>
              <p className="text-sm text-secondary">
                Verified owners can respond directly to customer feedback and clarify service notes.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔧</div>
              <h3 className="feature-title">Active Service Catalogs</h3>
              <p className="text-sm text-secondary">
                Standardized service listings for periodic maintenance, AC repair, bodywork, and diagnostics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Garages Section */}
      <section className="py-12">
        <div className="container">
          <div className="section-header flex-between mb-8">
            <div>
              <h2 className="section-title">Verified Workshops</h2>
              <p className="text-secondary text-sm">
                Vetted independent workshops with audited credentials and customer satisfaction.
              </p>
            </div>
            <Link to="/garages" className="btn btn-outline btn-sm">
              View All Garages →
            </Link>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" />}

          {loading ? (
            <div className="center-loader">
              <div className="spinner"></div>
              <p className="text-muted mt-2">Loading verified garages...</p>
            </div>
          ) : featuredGarages.length === 0 ? (
            <div className="empty-state card p-8 text-center">
              <p className="text-lg text-secondary">No approved garages found yet.</p>
              <p className="text-sm text-muted mt-1">Be the first to list your workshop on MeriGarage!</p>
              <Link to="/submit-garage" className="btn btn-primary mt-4">
                List Your Garage
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

      {/* Popular Services Section */}
      {popularServices.length > 0 && (
        <section className="py-12 bg-surface-raised">
          <div className="container">
            <div className="section-header flex-between mb-8">
              <div>
                <h2 className="section-title">Standard Automotive Services</h2>
                <p className="text-secondary text-sm">
                  Find workshops offering specialized care for your vehicle.
                </p>
              </div>
              <Link to="/services" className="btn btn-outline btn-sm">
                Explore Full Catalogue →
              </Link>
            </div>

            <div className="services-grid grid-4 gap-4">
              {popularServices.map((svc) => (
                <div
                  key={svc.id}
                  className="service-pill-card card"
                >
                  <div className="service-pill-header">
                    <span className="service-dot"></span>
                    <h4 className="service-name">{svc.name}</h4>
                  </div>
                  {svc.description && (
                    <p className="service-desc text-xs text-muted line-clamp-2">
                      {svc.description}
                    </p>
                  )}
                  <Link
                    to={`/garages`}
                    className="text-xs text-primary mt-2 inline-block"
                  >
                    Find workshops →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Call to Action for Garage Owners */}
      <section className="py-12">
        <div className="container">
          <div className="cta-banner card p-8">
            <div className="cta-content">
              <h2 className="cta-title">Do you manage an auto workshop or garage?</h2>
              <p className="cta-text text-secondary mt-2">
                Get discovered by thousands of car owners. Claim your existing listing or submit your garage,
                upload photos, highlight your service catalogue, and earn a verified trust badge.
              </p>
              <div className="cta-actions mt-6 flex gap-4">
                <Link to="/submit-garage" className="btn btn-primary">
                  Submit Garage Listing
                </Link>
                <Link to="/garages" className="btn btn-secondary">
                  Find & Claim Existing Listing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
