import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ServiceDto } from '../api/types';
import { Alert } from '../components/Alert';

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filtered = services.filter((s) => {
    const q = filterQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  const categories = Array.from(new Set(filtered.map((s) => s.category || 'General Maintenance')));

  return (
    <div className="container py-8">
      <div className="page-header mb-6">
        <h1 className="page-title">Automotive Service Catalogue</h1>
        <p className="text-secondary text-sm">
          Browse standardized automotive service categories and locate trusted partner workshops.
        </p>
      </div>

      <div className="card p-4 mb-8 flex-between items-center flex-wrap gap-4">
        <div className="search-input-group flex-1">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search service name or maintenance category..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted">
          Showing {filtered.length} of {services.length} services
        </span>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {loading ? (
        <div className="center-loader py-12">
          <div className="spinner"></div>
          <p className="text-muted mt-2">Loading service catalogue...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center empty-state">
          <h3 className="text-base font-bold">No services found</h3>
          <p className="text-muted text-xs mt-1">Try another search keyword.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryServices = filtered.filter(
              (s) => (s.category || 'General Maintenance') === category
            );

            return (
              <section key={category} className="category-block">
                <div className="category-header mb-4 flex items-center gap-2">
                  <span className="badge badge-accent">{category.replace('_', ' ')}</span>
                  <div className="h-px bg-border flex-1"></div>
                </div>

                <div className="grid grid-3 gap-4">
                  {categoryServices.map((svc) => (
                    <div key={svc.id} className="service-card card p-5 flex flex-col">
                      <div className="flex-between items-start mb-2">
                        <h3 className="service-card-title font-bold text-base text-foreground">
                          {svc.name}
                        </h3>
                        {svc.isActive ? (
                          <span className="badge badge-success text-xs">Active</span>
                        ) : (
                          <span className="badge badge-warning text-xs">Inactive</span>
                        )}
                      </div>

                      {svc.description && (
                        <p className="service-card-desc text-xs text-secondary leading-relaxed mb-4 flex-1">
                          {svc.description}
                        </p>
                      )}

                      <div className="mt-auto pt-3 border-t border-border flex-between items-center">
                        <Link
                          to={`/garages`}
                          className="btn btn-outline btn-xs w-full text-center"
                        >
                          Find Garages for this Service →
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
    </div>
  );
};
