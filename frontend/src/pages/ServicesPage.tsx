import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ServiceDto, GarageSummaryDto } from '../api/types';
import { GarageCard } from '../components/GarageCard';
import { Alert } from '../components/Alert';

export const ServicesPage: React.FC = () => {
  const { serviceSlug } = useParams<{ serviceSlug?: string }>();
  const navigate = useNavigate();

  const [services, setServices] = useState<ServiceDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Garages for selected service
  const [offeringGarages, setOfferingGarages] = useState<GarageSummaryDto[]>([]);
  const [loadingGarages, setLoadingGarages] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load all active services from backend
  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true);
        const data = await api.services.list();
        setServices(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load services catalogue');
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  // Currently selected service (if URL parameter serviceSlug is set)
  const selectedService = useMemo(() => {
    if (!serviceSlug) return null;
    return services.find(
      (s) => s.slug === serviceSlug || String(s.id) === serviceSlug
    ) || null;
  }, [serviceSlug, services]);

  // Load garages offering this selected service
  useEffect(() => {
    if (!selectedService) {
      setOfferingGarages([]);
      return;
    }

    async function loadGaragesForService() {
      try {
        setLoadingGarages(true);
        const res = await api.garages.list({
          serviceSlug: selectedService!.slug,
          size: 12,
        });
        setOfferingGarages(res.content || []);
      } catch {
        setOfferingGarages([]);
      } finally {
        setLoadingGarages(false);
      }
    }

    loadGaragesForService();
  }, [selectedService]);

  // Filtered services based on debounced search
  const filteredServices = useMemo(() => {
    if (!debouncedQuery) return services;
    const q = debouncedQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [services, debouncedQuery]);

  // Search suggestions for dropdown (up to 8 items)
  const suggestions = useMemo(() => {
    if (!debouncedQuery) return [];
    return filteredServices.slice(0, 8);
  }, [filteredServices, debouncedQuery]);

  // Handle outside click to close suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  const handleSelectSuggestion = (svc: ServiceDto) => {
    setShowSuggestions(false);
    setSearchQuery('');
    setFocusedIndex(-1);
    navigate(`/services/${svc.slug}`);
  };

  const getServiceIcon = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('ac')) return 'ac_unit';
    if (lower.includes('oil')) return 'oil_barrel';
    if (lower.includes('tyre') || lower.includes('wheel') || lower.includes('puncture')) return 'tire_repair';
    if (lower.includes('dent') || lower.includes('paint') || lower.includes('body')) return 'car_crash';
    if (lower.includes('wash') || lower.includes('clean') || lower.includes('detail')) return 'local_car_wash';
    if (lower.includes('brake')) return 'minor_crash';
    if (lower.includes('battery') || lower.includes('electrical') || lower.includes('wiring')) return 'bolt';
    if (lower.includes('ev') || lower.includes('electric') || lower.includes('hybrid')) return 'electric_car';
    if (lower.includes('towing') || lower.includes('roadside')) return 'car_rental';
    if (lower.includes('engine') || lower.includes('clutch') || lower.includes('transmission')) return 'settings';
    return 'build';
  };

  const categories = Array.from(new Set(filteredServices.map((s) => s.category || 'General Maintenance')));

  return (
    <div className="container py-8 max-w-6xl">
      {/* Header and Search */}
      <div className="page-header mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Automotive Service Discovery</h1>
            <p className="text-secondary text-sm mt-1">
              Browse automotive maintenance categories and find verified workshops that offer them.
            </p>
          </div>

          {selectedService && (
            <Link to="/services" className="btn btn-secondary btn-sm">
              ← View All Services
            </Link>
          )}
        </div>
      </div>

      {/* Interactive Search with Auto-Suggestions */}
      <div className="relative mb-8" ref={searchBoxRef}>
        <div className="card p-3 flex-between items-center gap-3 border border-border">
          <div className="search-input-group flex-1 relative flex items-center">
            <span className="material-symbols-outlined text-secondary ml-2 mr-2">search</span>
            <input
              type="text"
              className="search-input w-full bg-transparent border-0 outline-none text-white text-sm"
              placeholder="Search services (e.g. Brake Replacement, AC Gas Refill, Oil Change, EV Servicing)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setFocusedIndex(-1);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-autocomplete="list"
              aria-controls="service-suggestions-list"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
                className="text-xs text-secondary hover:text-white px-2 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <span className="text-xs text-muted pr-2">
            {services.length} Catalogue Services
          </span>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && debouncedQuery && (
          <div
            id="service-suggestions-list"
            role="listbox"
            className="search-suggestion-box"
          >
            {suggestions.length > 0 ? (
              suggestions.map((svc, index) => {
                const isFocused = index === focusedIndex;
                return (
                  <div
                    key={svc.id}
                    role="option"
                    aria-selected={isFocused}
                    onClick={() => handleSelectSuggestion(svc)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`search-suggestion-item ${isFocused ? 'is-active' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">
                          {getServiceIcon(svc.name)}
                        </span>
                        {svc.name}
                      </span>
                      <span className="badge badge-secondary text-2xs uppercase">
                        {svc.category?.replace(/_/g, ' ') || 'Service'}
                      </span>
                    </div>
                    {svc.description && (
                      <p className="text-xs text-secondary line-clamp-1 mb-0 pl-6">
                        {svc.description}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-muted">
                No active services found matching "{debouncedQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {/* Detail View: When a specific service is selected */}
      {selectedService ? (
        <div className="service-detail-view space-y-6">
          {/* Service Banner */}
          <div className="card p-6 border-accent/40 bg-surface-raised">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-3xl">
                    {getServiceIcon(selectedService.name)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-accent text-xs">
                      {selectedService.category?.replace(/_/g, ' ') || 'Automotive Service'}
                    </span>
                    <span className="badge badge-success text-2xs">Active in Catalogue</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedService.name}</h2>
                  <p className="text-sm text-secondary leading-relaxed max-w-3xl">
                    {selectedService.description ||
                      'Standardized automotive maintenance provided by certified MeriGarage partner workshops.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                <Link
                  to={`/garages?serviceSlug=${selectedService.slug}`}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt</span>
                  Filter Discovery by this Service
                </Link>
                <Link
                  to="/submit-garage"
                  className="text-xs text-secondary hover:text-white"
                >
                  Offer this service at your workshop →
                </Link>
              </div>
            </div>
          </div>

          {/* Garages Offering This Service Section */}
          <div>
            <div className="flex-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Verified Workshops Offering {selectedService.name}</span>
                <span className="badge badge-primary text-xs font-mono">
                  {offeringGarages.length}
                </span>
              </h3>
              {offeringGarages.length > 0 && (
                <Link
                  to={`/garages?serviceSlug=${selectedService.slug}`}
                  className="text-xs text-accent hover:underline"
                >
                  View all in discovery map →
                </Link>
              )}
            </div>

            {loadingGarages ? (
              <div className="center-loader py-12">
                <div className="spinner"></div>
                <p className="text-muted mt-3 text-sm">Finding garages offering {selectedService.name}...</p>
              </div>
            ) : offeringGarages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {offeringGarages.map((garage) => (
                  <GarageCard key={garage.id} garage={garage} />
                ))}
              </div>
            ) : (
              <div className="card p-10 text-center empty-state border border-dashed border-border">
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">garage</span>
                <h4 className="text-base font-bold text-white mb-1">
                  No registered garages currently list this service
                </h4>
                <p className="text-xs text-secondary max-w-md mx-auto mb-4">
                  Be the first workshop to offer {selectedService.name} on MeriGarage!
                </p>
                <Link to="/submit-garage" className="btn btn-primary btn-sm">
                  + List Your Workshop
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Full Catalogue View */
        <>
          {loading ? (
            <div className="center-loader py-12">
              <div className="spinner"></div>
              <p className="text-muted mt-3 text-sm">Loading service catalogue...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="card p-12 text-center empty-state">
              <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">search_off</span>
              <h3 className="text-base font-bold text-white">No services found</h3>
              <p className="text-secondary text-xs mt-1">
                No active services match "{debouncedQuery}". Try another keyword or browse all.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-4"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {categories.map((category) => {
                const categoryServices = filteredServices.filter(
                  (s) => (s.category || 'General Maintenance') === category
                );

                return (
                  <section key={category} className="category-block">
                    <div className="category-header mb-5 flex items-center gap-3">
                      <span className="badge badge-accent">
                        {category.replace(/_/g, ' ')}
                      </span>
                      <div className="h-px bg-border flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {categoryServices.map((svc) => (
                        <div
                          key={svc.id}
                          className="card p-5 flex flex-col group hover:border-primary transition-all cursor-pointer"
                          onClick={() => navigate(`/services/${svc.slug}`)}
                        >
                          <div className="flex-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
                                <span className="material-symbols-outlined text-lg">
                                  {getServiceIcon(svc.name)}
                                </span>
                              </div>
                              <h3 className="font-bold text-base text-white group-hover:text-primary transition-colors">
                                {svc.name}
                              </h3>
                            </div>
                            <span className="badge badge-success text-[10px]">Active</span>
                          </div>

                          {svc.description && (
                            <p className="text-xs text-secondary leading-relaxed mb-4 flex-1 line-clamp-3">
                              {svc.description}
                            </p>
                          )}

                          <div className="mt-auto pt-3 border-t border-border flex-between items-center gap-2">
                            <Link
                              to={`/services/${svc.slug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="btn btn-outline btn-xs flex-1 text-center"
                            >
                              Explore Garages →
                            </Link>
                            <Link
                              to={`/garages?serviceSlug=${svc.slug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="btn btn-secondary btn-xs"
                              title="Filter discovery search by this service"
                            >
                              🔍
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
