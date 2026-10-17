import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { GarageSummaryDto, PagedResponse, ServiceDto } from '../api/types';
import { GarageCard } from '../components/GarageCard';
import { GarageSearchMap } from '../components/GarageSearchMap';
import { Pagination } from '../components/Pagination';
import { Alert } from '../components/Alert';
import { StateSelect, CitySelect } from '../components/LocationSelect';
import { findStateForCity, getCitiesForState } from '../data/indiaLocations';
import {
  safeTrackLeadEvent,
  getActiveSearchSession,
  setActiveSearchSession,
  clearActiveSearchSession,
  parseVehicleString,
} from '../utils/searchSession';

function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const GaragesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query state
  const cityParam = searchParams.get('city') || '';
  const stateParam = searchParams.get('state') || findStateForCity(cityParam) || '';
  const serviceSlugParam = searchParams.get('serviceSlug') || '';
  const searchParam = searchParams.get('search') || '';
  const vehicleParam = searchParams.get('vehicle') || '';
  const verifiedOnlyParam = searchParams.get('verified') === 'true';
  const sortByParam = searchParams.get('sortBy') === 'distance' ? 'distance' : 'name';
  const pageParam = parseInt(searchParams.get('page') || '0', 10);
  const latParam = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const lngParam = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

  // Active session workflow (precedence: URL > Session)
  const activeSession = useMemo(() => getActiveSearchSession(), []);

  // Precedence rule for vehicle:
  // 1. Explicit in URL
  // 2. Explicit in current session workflow
  // 3. Empty
  const effectiveVehicle =
    vehicleParam ||
    activeSession?.rawVehicle ||
    (activeSession?.vehicleMake ? `${activeSession.vehicleMake} ${activeSession.vehicleModel}`.trim() : '');

  // Local state for inputs
  const [localState, setLocalState] = useState(stateParam || activeSession?.state || '');
  const [localCity, setLocalCity] = useState(cityParam || activeSession?.city || '');
  const [localServiceSlug, setLocalServiceSlug] = useState(serviceSlugParam || activeSession?.serviceSlug || '');
  const [localVehicle, setLocalVehicle] = useState(effectiveVehicle);
  const [localVerifiedOnly, setLocalVerifiedOnly] = useState(verifiedOnlyParam);
  const [localSortBy, setLocalSortBy] = useState<'name' | 'distance'>(sortByParam);

  // Available services catalogue
  const [availableServices, setAvailableServices] = useState<ServiceDto[]>([]);

  useEffect(() => {
    api.services.list()
      .then((data) => setAvailableServices(data || []))
      .catch(() => {});
  }, []);

  // Track distinct event: Visitor opens Explore Garages
  const sessionVehicle = activeSession?.rawVehicle;
  useEffect(() => {
    const vehicleInfo = parseVehicleString(vehicleParam || sessionVehicle);
    safeTrackLeadEvent('EXPLORE_GARAGES_VIEWED', {
      state: stateParam || undefined,
      city: cityParam || undefined,
      serviceSlug: serviceSlugParam || undefined,
      vehicleType: vehicleInfo.type,
      vehicleMake: vehicleInfo.make,
      vehicleModel: vehicleInfo.model,
      source: 'explore_garages',
    });
  }, [cityParam, stateParam, serviceSlugParam, vehicleParam, sessionVehicle]);

  // User Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    latParam != null && lngParam != null && !isNaN(latParam) && !isNaN(lngParam)
      ? { lat: latParam, lng: lngParam }
      : null
  );
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  // Data state
  const [garagesData, setGaragesData] = useState<PagedResponse<GarageSummaryDto> | null>(null);
  const [selectedGarageId, setSelectedGarageId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch garages based on current URL params
  const fetchGarages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Parameters<typeof api.garages.list>[0] = {
        page: pageParam,
        size: 9,
        sortBy: 'name',
        sortDir: 'asc',
      };

      if (cityParam) params.city = cityParam;
      if (stateParam) params.state = stateParam;
      if (verifiedOnlyParam) params.isVerified = true;
      if (serviceSlugParam) params.serviceSlug = serviceSlugParam;
      if (searchParam) params.search = searchParam;

      const res = await api.garages.list(params);
      setGaragesData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch garages');
    } finally {
      setLoading(false);
    }
  }, [cityParam, stateParam, verifiedOnlyParam, serviceSlugParam, searchParam, pageParam]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  // Keep local inputs in sync with URL
  useEffect(() => {
    setLocalCity(cityParam);
    setLocalState(stateParam);
    setLocalServiceSlug(serviceSlugParam);
    setLocalVehicle(vehicleParam || sessionVehicle || '');
    setLocalVerifiedOnly(verifiedOnlyParam);
    setLocalSortBy(sortByParam);
    if (latParam != null && lngParam != null && !isNaN(latParam) && !isNaN(lngParam)) {
      setUserCoords({ lat: latParam, lng: lngParam });
    }
  }, [cityParam, stateParam, serviceSlugParam, vehicleParam, sessionVehicle, verifiedOnlyParam, sortByParam, latParam, lngParam]);

  const handleStateChange = (newState: string) => {
    setLocalState(newState);
    const validCities = getCitiesForState(newState);
    if (localCity && !validCities.includes(localCity)) {
      setLocalCity('');
    }
  };

  // Request browser geolocation once upon explicit user request
  const requestUserLocation = useCallback(
    (onSuccess?: (coords: { lat: number; lng: number }) => void) => {
      if (locating) return;

      if (!('geolocation' in navigator)) {
        setLocationMessage('Browser geolocation is not supported on this device.');
        return;
      }

      setLocating(true);
      setLocationMessage(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          setLocating(false);
          setLocationMessage(null);
          if (onSuccess) onSuccess(coords);
        },
        (err) => {
          setLocating(false);
          if (err.code === err.PERMISSION_DENIED) {
            setLocationMessage('Location permission denied. Showing standard results.');
          } else {
            setLocationMessage('Unable to retrieve location. Showing standard results.');
          }
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    },
    [locating]
  );

  const handleSortChange = (newSort: 'name' | 'distance') => {
    setLocalSortBy(newSort);
    if (newSort === 'distance' && !userCoords) {
      requestUserLocation((coords) => {
        const next = new URLSearchParams(searchParams);
        next.set('sortBy', 'distance');
        next.set('lat', coords.lat.toString());
        next.set('lng', coords.lng.toString());
        next.set('page', '0');
        setSearchParams(next);
      });
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (newSort === 'distance') {
      next.set('sortBy', 'distance');
      if (userCoords) {
        next.set('lat', userCoords.lat.toString());
        next.set('lng', userCoords.lng.toString());
      }
    } else {
      next.delete('sortBy');
      next.delete('lat');
      next.delete('lng');
    }
    next.set('page', '0');
    setSearchParams(next);
  };

  // Calculate distances and sort nearest first if distance sorting is selected
  const garagesWithDistance = useMemo(() => {
    if (!garagesData?.content) return [];

    const items = garagesData.content.map((g) => {
      let distanceKm: number | null = null;
      if (
        userCoords &&
        g.latitude != null &&
        g.longitude != null &&
        !isNaN(Number(g.latitude)) &&
        !isNaN(Number(g.longitude))
      ) {
        distanceKm = calculateHaversineDistanceKm(
          userCoords.lat,
          userCoords.lng,
          Number(g.latitude),
          Number(g.longitude)
        );
      }
      return { garage: g, distanceKm };
    });

    if (sortByParam === 'distance' && userCoords) {
      items.sort((a, b) => {
        if (a.distanceKm != null && b.distanceKm != null) {
          return a.distanceKm - b.distanceKm;
        }
        // Garages with coordinates rank before garages without coordinates
        if (a.distanceKm != null) return -1;
        if (b.distanceKm != null) return 1;
        return a.garage.name.localeCompare(b.garage.name);
      });
    }

    return items;
  }, [garagesData, sortByParam, userCoords]);

  // Sync selected garage when search results change
  useEffect(() => {
    if (garagesWithDistance.length > 0) {
      if (!selectedGarageId || !garagesWithDistance.some((item) => item.garage.id === selectedGarageId)) {
        const firstWithCoords = garagesWithDistance.find(
          (item) => item.garage.latitude != null && item.garage.longitude != null
        );
        setSelectedGarageId(firstWithCoords ? firstWithCoords.garage.id : garagesWithDistance[0].garage.id);
      }
    } else {
      setSelectedGarageId(null);
    }
  }, [garagesWithDistance, selectedGarageId]);

  // Apply filters to URL
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams();

    if (localCity.trim()) nextParams.set('city', localCity.trim());
    if (localState.trim()) nextParams.set('state', localState.trim());
    if (localServiceSlug.trim()) nextParams.set('serviceSlug', localServiceSlug.trim());
    if (localVehicle.trim()) nextParams.set('vehicle', localVehicle.trim());
    if (localVerifiedOnly) nextParams.set('verified', 'true');
    if (localSortBy === 'distance' && userCoords) {
      nextParams.set('sortBy', 'distance');
      nextParams.set('lat', userCoords.lat.toString());
      nextParams.set('lng', userCoords.lng.toString());
    }
    nextParams.set('page', '0');

    // Update active search session so subsequent flows retain latest user filters
    const vehicleInfo = parseVehicleString(localVehicle.trim());
    setActiveSearchSession({
      state: localState.trim() || undefined,
      city: localCity.trim() || undefined,
      serviceSlug: localServiceSlug.trim() || undefined,
      vehicleType: vehicleInfo.type,
      vehicleMake: vehicleInfo.make,
      vehicleModel: vehicleInfo.model,
      rawVehicle: localVehicle.trim() || undefined,
      source: 'explore_garages',
    });

    setSearchParams(nextParams);
  };

  const handleToggleVerified = () => {
    const nextVal = !localVerifiedOnly;
    setLocalVerifiedOnly(nextVal);
    const nextParams = new URLSearchParams(searchParams);
    if (nextVal) {
      nextParams.set('verified', 'true');
    } else {
      nextParams.delete('verified');
    }
    nextParams.set('page', '0');
    setSearchParams(nextParams);
  };

  const handleResetFilters = () => {
    setLocalCity('');
    setLocalState('');
    setLocalServiceSlug('');
    setLocalVehicle('');
    setLocalVerifiedOnly(false);
    setLocalSortBy('name');
    setUserCoords(null);
    setLocationMessage(null);
    clearActiveSearchSession();
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', newPage.toString());
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container py-8">
      {/* Header and Filter Control Area */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white">
              {loading ? (
                'Searching garages...'
              ) : garagesData ? (
                `Found ${garagesData.totalElements} ${
                  garagesData.totalElements === 1 ? 'garage' : 'garages'
                }${
                  vehicleParam ? ` for ${vehicleParam}` : ''
                }${
                  serviceSlugParam
                    ? ` • ${availableServices.find((s) => s.slug === serviceSlugParam)?.name || serviceSlugParam}`
                    : ''
                } in ${cityParam || stateParam || 'India'}`
              ) : (
                'Explore Verified Garages'
              )}
            </h1>
            <p className="text-secondary text-sm mt-1">
              Compare ratings, verified licenses, physical locations, and specialized services.
            </p>
          </div>

          {/* Quick Filter Pill Chips */}
          <div className="flex flex-wrap gap-2">
            {vehicleParam && (
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('vehicle');
                  next.set('page', '0');
                  setSearchParams(next);
                }}
                className="btn btn-sm btn-primary flex items-center gap-1 cursor-pointer"
                title="Clear vehicle filter"
              >
                <span>🚗 {vehicleParam} ✕</span>
              </button>
            )}

            {serviceSlugParam && (
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('serviceSlug');
                  next.set('page', '0');
                  setSearchParams(next);
                }}
                className="btn btn-sm btn-primary flex items-center gap-1 cursor-pointer"
                title="Clear service filter"
              >
                <span>🛠️ {availableServices.find((s) => s.slug === serviceSlugParam)?.name || serviceSlugParam} ✕</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleVerified}
              className={`btn btn-sm ${
                localVerifiedOnly ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              {localVerifiedOnly ? 'Verified Garages ✓' : 'Verified Only'}
            </button>

            {['Delhi', 'Mumbai', 'Gurugram', 'Bengaluru', 'Jaipur'].map((cityName) => (
              <button
                key={cityName}
                type="button"
                className={`btn btn-sm ${
                  cityParam.toLowerCase() === cityName.toLowerCase()
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (cityParam.toLowerCase() === cityName.toLowerCase()) {
                    next.delete('city');
                    next.delete('state');
                  } else {
                    next.set('city', cityName);
                    const matchingState = findStateForCity(cityName);
                    if (matchingState) next.set('state', matchingState);
                  }
                  next.set('page', '0');
                  setSearchParams(next);
                }}
              >
                📍 {cityName}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className={`btn btn-sm ${showMap ? 'btn-primary' : 'btn-secondary'} inline-flex items-center gap-1.5 cursor-pointer`}
              title="Toggle interactive map view"
            >
              <span className="material-symbols-outlined text-sm">{showMap ? 'close' : 'map'}</span>
              <span>{showMap ? 'Close Map' : 'View Map'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {/* 2-Column Discovery Layout: Left Filters Sidebar + Right Garage Results */}
      <div className="explore-garages-layout mb-8">
        {/* Left Column: Filter Panel Card */}
        <aside className="filters-sidebar">
          <div className="card p-5 filter-panel">
            <div className="flex-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
                Filters
              </h2>
              {(cityParam || stateParam || serviceSlugParam || vehicleParam || verifiedOnlyParam || sortByParam === 'distance') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            <form onSubmit={handleApplyFilters} className="filters-form-vertical">
              <div className="form-group mb-0">
                <label htmlFor="filter-state" className="form-label">
                  Filter by State / UT
                </label>
                <StateSelect
                  id="filter-state"
                  value={localState}
                  onChange={handleStateChange}
                  placeholder="All States & UTs"
                />
              </div>

              <div className="form-group mb-0">
                <label htmlFor="filter-city" className="form-label">
                  Filter by City
                </label>
                <CitySelect
                  id="filter-city"
                  selectedState={localState || undefined}
                  value={localCity}
                  onChange={setLocalCity}
                  placeholder="All Cities"
                />
              </div>

              <div className="form-group mb-0">
                <label htmlFor="filter-service" className="form-label">
                  Filter by Service
                </label>
                <select
                  id="filter-service"
                  className="form-control"
                  value={localServiceSlug}
                  onChange={(e) => setLocalServiceSlug(e.target.value)}
                >
                  <option value="">All Services</option>
                  {availableServices.map((svc) => (
                    <option key={svc.id} value={svc.slug}>
                      {svc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-0">
                <label htmlFor="filter-vehicle" className="form-label">
                  Vehicle / Car
                </label>
                <input
                  id="filter-vehicle"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Tata Harrier, Swift"
                  value={localVehicle}
                  onChange={(e) => setLocalVehicle(e.target.value)}
                />
              </div>

              {/* Single User-Facing Sort Control: Distance from Current Location vs Default */}
              <div className="form-group mb-0">
                <label htmlFor="filter-sort-by" className="form-label flex-between">
                  <span>Sort Order</span>
                  {sortByParam === 'distance' && userCoords && (
                    <span className="text-xs text-accent font-semibold">📍 Nearest</span>
                  )}
                </label>
                <div className="flex gap-2 items-center">
                  <select
                    id="filter-sort-by"
                    className="form-control"
                    value={localSortBy}
                    onChange={(e) => handleSortChange(e.target.value as 'name' | 'distance')}
                  >
                    <option value="name">Workshop Name (Default)</option>
                    <option value="distance">Distance from Current Location</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      requestUserLocation(() => {
                        handleSortChange('distance');
                      });
                    }}
                    disabled={locating}
                    className="btn btn-secondary btn-sm whitespace-nowrap"
                    title="Detect your coordinates using GPS"
                  >
                    {locating ? '...' : '📍 GPS'}
                  </button>
                </div>
              </div>

              {locationMessage && (
                <p className="text-xs text-danger mt-1 mb-0 font-medium">
                  {locationMessage}
                </p>
              )}

              <div className="pt-3 border-t border-border">
                <label className="checkbox-label flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localVerifiedOnly}
                    onChange={(e) => setLocalVerifiedOnly(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="text-xs font-semibold text-white">Show Verified Garages Only</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm flex-1"
                  onClick={handleResetFilters}
                >
                  Reset
                </button>
                <button type="submit" className="btn btn-primary btn-sm flex-1">
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* Right Column: Garage Results & Optional Map */}
        <div className="garages-results-col">
          {showMap && (
            <div className="mb-6 card p-4 border border-border">
              <GarageSearchMap
                garages={garagesWithDistance.map((item) => item.garage)}
                selectedGarageId={selectedGarageId}
                onSelectGarage={(id) => {
                  setSelectedGarageId(id);
                  const el = document.getElementById(`garage-${id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                loading={loading}
              />
            </div>
          )}

          {loading ? (
            <div className="center-loader py-12">
              <div className="spinner"></div>
              <p className="text-muted mt-3 text-sm">Searching matching verified workshops...</p>
            </div>
          ) : garagesWithDistance.length > 0 ? (
            <>
              <div className="garage-grid mb-8">
                {garagesWithDistance.map(({ garage, distanceKm }) => (
                  <GarageCard
                    key={garage.id}
                    garage={garage}
                    distanceKm={distanceKm}
                    isSelected={selectedGarageId === garage.id}
                    onSelect={() => setSelectedGarageId(garage.id)}
                  />
                ))}
              </div>

              {garagesData && (
                <Pagination
                  page={garagesData.page}
                  totalPages={garagesData.totalPages}
                  totalElements={garagesData.totalElements}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          ) : (
            <div className="card p-12 text-center empty-state">
              <span className="material-symbols-outlined text-5xl text-slate-500 mb-2">search_off</span>
              <h3 className="text-xl font-bold text-white">No workshops matched your criteria</h3>
              <p className="text-secondary text-sm mt-1 max-w-md mx-auto">
                Try expanding your search to other cities or unchecking the "Verified Only" filter.
              </p>
              <button
                type="button"
                className="btn btn-secondary mt-5"
                onClick={handleResetFilters}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
