import React from 'react';
import { Link } from 'react-router-dom';
import type { GarageSummaryDto } from '../api/types';
import { api } from '../api/client';

interface GarageCardProps {
  garage: GarageSummaryDto;
  isSelected?: boolean;
  onSelect?: () => void;
  distanceKm?: number | null;
}

export const GarageCard: React.FC<GarageCardProps> = ({ garage, isSelected, onSelect, distanceKm }) => {
  const photoUrl = garage.coverPhotoId
    ? api.garages.getPhotoUrl(garage.id, garage.coverPhotoId)
    : null;

  return (
    <article
      className={`garage-card ${isSelected ? 'is-selected' : ''}`}
      id={`garage-${garage.id}`}
      onClick={onSelect}
    >
      <div className="garage-card-media">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={garage.name}
            className="garage-card-img"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) {
                const placeholder = parent.querySelector('.garage-placeholder');
                if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
              }
            }}
          />
        ) : null}

        <div
          className="garage-placeholder"
          style={{ display: photoUrl ? 'none' : 'flex' }}
        >
          <span className="material-symbols-outlined text-4xl text-slate-500">garage</span>
          <span className="text-xs text-muted mt-1">{garage.city}</span>
        </div>

        {garage.isVerified && (
          <span className="badge badge-verified garage-badge-floating">
            <span className="material-symbols-outlined text-xs">verified</span> Verified
          </span>
        )}

        {garage.latitude != null && garage.longitude != null && (
          <span
            className="badge badge-secondary text-[10px] font-mono absolute top-3 right-3 px-2 py-0.5 shadow"
            title={`GPS: ${Number(garage.latitude).toFixed(4)}, ${Number(garage.longitude).toFixed(4)}`}
          >
            📍 GPS Pin
          </span>
        )}

        {distanceKm != null && (
          <span
            className="badge badge-accent text-[11px] font-bold absolute bottom-3 left-3 px-2 py-0.5 shadow-md flex items-center gap-1"
            title={`${distanceKm.toFixed(2)} km from current location`}
          >
            <span className="material-symbols-outlined text-xs">near_me</span>
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`}
          </span>
        )}
      </div>

      <div className="garage-card-content">
        <div className="garage-card-header">
          <div>
            <h3 className="garage-title">
              <Link to={`/garages/${garage.slug}`} className="garage-title-link">
                {garage.name}
              </Link>
            </h3>
            <p className="garage-city-label">
              📍 {garage.city}, {garage.state}
            </p>
          </div>
        </div>

        <p className="garage-address">
          {garage.addressLine1}
          {garage.addressLine2 ? `, ${garage.addressLine2}` : ''}
        </p>

        {garage.phoneNumber && (
          <p className="garage-phone">
            📞 {garage.phoneNumber}
          </p>
        )}

        {garage.serviceNames && garage.serviceNames.length > 0 && (
          <div className="flex flex-wrap gap-1 my-2">
            {garage.serviceNames.slice(0, 3).map((sName) => (
              <span
                key={sName}
                className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-surface-raised text-secondary border border-border"
              >
                🛠️ {sName}
              </span>
            ))}
            {garage.serviceNames.length > 3 && (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-muted bg-surface-raised">
                +{garage.serviceNames.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="garage-card-footer">
          <span className="text-xs text-muted">
            Independent Workshop
          </span>
          <Link to={`/garages/${garage.slug}`} className="btn btn-outline btn-sm">
            View Profile →
          </Link>
        </div>
      </div>
    </article>
  );
};
