import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { GarageSummaryDto, PagedResponse } from '../api/types';
import { GarageCard } from '../components/GarageCard';
import { Pagination } from '../components/Pagination';
import { Alert } from '../components/Alert';

export const GaragesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query state
  const cityParam = searchParams.get('city') || '';
  const verifiedOnlyParam = searchParams.get('verified') === 'true';
  const sortByParam = searchParams.get('sortBy') || 'name';
  const sortDirParam = (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc';
  const pageParam = parseInt(searchParams.get('page') || '0', 10);

  // Local state for inputs
  const [localCity, setLocalCity] = useState(cityParam);
  const [localVerifiedOnly, setLocalVerifiedOnly] = useState(verifiedOnlyParam);
  const [localSortBy, setLocalSortBy] = useState(sortByParam);
  const [localSortDir, setLocalSortDir] = useState(sortDirParam);

  // Data state
  const [garagesData, setGaragesData] = useState<PagedResponse<GarageSummaryDto> | null>(null);
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
        sortBy: sortByParam,
        sortDir: sortDirParam,
      };

      if (cityParam) params.city = cityParam;
      if (verifiedOnlyParam) params.isVerified = true;

      const res = await api.garages.list(params);
      setGaragesData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch garages');
    } finally {
      setLoading(false);
    }
  }, [cityParam, verifiedOnlyParam, sortByParam, sortDirParam, pageParam]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  // Keep local inputs in sync with URL
  useEffect(() => {
    setLocalCity(cityParam);
    setLocalVerifiedOnly(verifiedOnlyParam);
    setLocalSortBy(sortByParam);
    setLocalSortDir(sortDirParam);
  }, [cityParam, verifiedOnlyParam, sortByParam, sortDirParam]);

  // Apply filters to URL
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams();

    if (localCity.trim()) nextParams.set('city', localCity.trim());
    if (localVerifiedOnly) nextParams.set('verified', 'true');
    if (localSortBy) nextParams.set('sortBy', localSortBy);
    if (localSortDir) nextParams.set('sortDir', localSortDir);
    nextParams.set('page', '0');

    setSearchParams(nextParams);
  };

  const handleResetFilters = () => {
    setLocalCity('');
    setLocalVerifiedOnly(false);
    setLocalSortBy('name');
    setLocalSortDir('asc');
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
      <div className="page-header mb-6">
        <h1 className="page-title">Explore Verified Garages</h1>
        <p className="text-secondary text-sm">
          Browse vetted auto repair shops, mechanics, and specialized automotive centers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-6 mb-8 filter-panel">
        <form onSubmit={handleApplyFilters} className="filter-form">
          <div className="filter-grid">
            <div className="form-group">
              <label htmlFor="filter-city" className="form-label">
                Filter by City / Region
              </label>
              <input
                id="filter-city"
                type="text"
                className="form-control"
                placeholder="e.g. Delhi, Jaipur, Mumbai..."
                value={localCity}
                onChange={(e) => setLocalCity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="filter-sort-by" className="form-label">
                Sort Field
              </label>
              <select
                id="filter-sort-by"
                className="form-control"
                value={localSortBy}
                onChange={(e) => setLocalSortBy(e.target.value)}
              >
                <option value="name">Garage Name</option>
                <option value="city">City</option>
                <option value="createdAt">Date Listed</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="filter-sort-dir" className="form-label">
                Direction
              </label>
              <select
                id="filter-sort-dir"
                className="form-control"
                value={localSortDir}
                onChange={(e) => setLocalSortDir(e.target.value as 'asc' | 'desc')}
              >
                <option value="asc">Ascending (A-Z, Oldest)</option>
                <option value="desc">Descending (Z-A, Newest)</option>
              </select>
            </div>
          </div>

          <div className="filter-actions flex-between items-center mt-4 pt-4 border-t border-border">
            <label className="checkbox-label flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localVerifiedOnly}
                onChange={(e) => setLocalVerifiedOnly(e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-sm font-medium">Show Verified Garages Only</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetFilters}
              >
                Reset
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {/* Results grid */}
      {loading ? (
        <div className="center-loader py-12">
          <div className="spinner"></div>
          <p className="text-muted mt-2">Fetching garages matching criteria...</p>
        </div>
      ) : garagesData && garagesData.content.length > 0 ? (
        <>
          <div className="garage-grid mb-8">
            {garagesData.content.map((garage) => (
              <GarageCard key={garage.id} garage={garage} />
            ))}
          </div>

          <Pagination
            page={garagesData.page}
            totalPages={garagesData.totalPages}
            totalElements={garagesData.totalElements}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className="card p-12 text-center empty-state">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-bold">No garages matched your filters</h3>
          <p className="text-secondary text-sm mt-1 max-w-md mx-auto">
            Try adjusting your search criteria, clearing city filters, or removing the verified requirement.
          </p>
          <button
            type="button"
            className="btn btn-secondary mt-4"
            onClick={handleResetFilters}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
