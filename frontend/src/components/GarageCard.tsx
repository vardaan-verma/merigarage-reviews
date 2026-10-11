import React from 'react';
import { Link } from 'react-router-dom';
import type { GarageSummaryDto } from '../api/types';
import { api } from '../api/client';

interface GarageCardProps {
  garage: GarageSummaryDto;
}

export const GarageCard: React.FC<GarageCardProps> = ({ garage }) => {
  const photoUrl = garage.coverPhotoId
    ? api.garages.getPhotoUrl(garage.id, garage.coverPhotoId)
    : null;

  return (
    <article className="garage-card card animate-fade-in" id={`garage-${garage.id}`}>
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
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3.3C2 11.5 2 11.7 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          <span className="text-xs text-muted mt-1">{garage.city}</span>
        </div>

        {garage.isVerified && (
          <span className="badge badge-verified garage-badge-floating">
            ✓ Verified
          </span>
        )}
      </div>

      <div className="card-body garage-card-content">
        <div className="garage-card-header">
          <h3 className="garage-title">
            <Link to={`/garages/${garage.slug}`} className="garage-title-link">
              {garage.name}
            </Link>
          </h3>
          <p className="garage-city-label text-muted text-xs">
            📍 {garage.city}, {garage.state}
          </p>
        </div>

        <p className="garage-address text-xs text-secondary">
          {garage.addressLine1}
        </p>

        {garage.phoneNumber && (
          <p className="garage-phone text-xs text-muted">
            📞 {garage.phoneNumber}
          </p>
        )}

        <div className="garage-card-footer mt-auto pt-3">
          <Link to={`/garages/${garage.slug}`} className="btn btn-outline btn-sm w-full">
            View Details & Reviews →
          </Link>
        </div>
      </div>
    </article>
  );
};
