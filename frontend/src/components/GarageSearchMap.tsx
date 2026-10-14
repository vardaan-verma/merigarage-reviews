import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GarageSummaryDto } from '../api/types';

interface GarageSearchMapProps {
  garages: GarageSummaryDto[];
  selectedGarageId: number | null;
  onSelectGarage: (garageId: number) => void;
  loading: boolean;
}

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<void>;
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps) {
    return Promise.resolve();
  }
  if (window.__googleMapsLoadingPromise) {
    return window.__googleMapsLoadingPromise;
  }

  window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });

  return window.__googleMapsLoadingPromise;
}

export const GarageSearchMap: React.FC<GarageSearchMapProps> = ({
  garages,
  selectedGarageId,
  onSelectGarage,
  loading,
}) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const activeInfoWindowRef = useRef<any>(null);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const garagesWithCoords = garages.filter(
    (g) =>
      g.latitude != null &&
      g.longitude != null &&
      !isNaN(Number(g.latitude)) &&
      !isNaN(Number(g.longitude))
  );

  const selectedGarage =
    garages.find((g) => g.id === selectedGarageId) ||
    garagesWithCoords[0] ||
    null;

  // Try loading Google Maps JS SDK if key is provided
  useEffect(() => {
    if (!apiKey) return;

    let isMounted = true;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (isMounted) setScriptLoaded(true);
      })
      .catch((err) => {
        if (isMounted) {
          setScriptError('Google Maps JavaScript API could not be loaded. Check your API key.');
          console.warn('Google Maps script failed to load:', err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Initialize and update Google Map instance when SDK is loaded
  useEffect(() => {
    if (!scriptLoaded || !window.google?.maps || !mapElementRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter =
        garagesWithCoords.length > 0
          ? { lat: Number(garagesWithCoords[0].latitude), lng: Number(garagesWithCoords[0].longitude) }
          : { lat: 20.5937, lng: 78.9629 }; // India center fallback

      mapInstanceRef.current = new window.google.maps.Map(mapElementRef.current, {
        center: defaultCenter,
        zoom: garagesWithCoords.length > 0 ? 12 : 5,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
      });
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    if (garagesWithCoords.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    garagesWithCoords.forEach((garage) => {
      const pos = { lat: Number(garage.latitude), lng: Number(garage.longitude) };
      bounds.extend(pos);

      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: garage.name,
      });

      const infoContent = `
        <div style="color: #0b0f19; padding: 4px; max-width: 200px; font-family: sans-serif;">
          <h4 style="font-weight: 700; font-size: 13px; margin: 0 0 4px 0;">${garage.name}</h4>
          <p style="font-size: 11px; margin: 0 0 6px 0; color: #64748b;">${garage.city}, ${garage.state}</p>
          ${garage.isVerified ? '<span style="background: #10b981; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">✓ Verified</span><br/><br/>' : ''}
          <a href="/garages/${garage.slug}" style="font-size: 11px; color: #2563eb; font-weight: 600; text-decoration: underline;">View Workshop →</a>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent,
      });

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;
        onSelectGarage(garage.id);
      });

      markersRef.current.set(garage.id, { marker, infoWindow });
    });

    if (garagesWithCoords.length > 1) {
      map.fitBounds(bounds);
    } else if (garagesWithCoords.length === 1) {
      map.setCenter({
        lat: Number(garagesWithCoords[0].latitude),
        lng: Number(garagesWithCoords[0].longitude),
      });
      map.setZoom(13);
    }
  }, [scriptLoaded, garagesWithCoords, onSelectGarage]);

  // Center on selected garage
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedGarageId) return;
    const entry = markersRef.current.get(selectedGarageId);
    if (entry) {
      mapInstanceRef.current.panTo(entry.marker.getPosition());
      mapInstanceRef.current.setZoom(14);
      if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
      entry.infoWindow.open(mapInstanceRef.current, entry.marker);
      activeInfoWindowRef.current = entry.infoWindow;
    }
  }, [selectedGarageId]);

  return (
    <div className="card p-4 flex flex-col h-full bg-surface-raised border border-border sticky top-4">
      <div className="flex-between items-center mb-3">
        <div>
          <h3 className="section-title text-sm mb-0">Dynamic Map</h3>
          <span className="text-xs text-muted">
            {garagesWithCoords.length} of {garages.length} workshops have coordinates
          </span>
        </div>
        {selectedGarage && selectedGarage.latitude && selectedGarage.longitude && (
          <a
            href={
              selectedGarage.googleMapsUrl ||
              `https://www.google.com/maps/search/?api=1&query=${selectedGarage.latitude},${selectedGarage.longitude}`
            }
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-secondary btn-xs"
            title="Open in Google Maps"
          >
            Open in Google Maps ↗
          </a>
        )}
      </div>

      {loading ? (
        <div className="center-loader py-16 flex-1 flex flex-col items-center justify-center">
          <div className="spinner mb-2"></div>
          <span className="text-xs text-muted">Updating map markers...</span>
        </div>
      ) : apiKey && scriptLoaded && !scriptError ? (
        <div
          ref={mapElementRef}
          className="w-full flex-1 min-h-[380px] rounded border border-border"
          style={{ minHeight: '380px' }}
        />
      ) : (
        /* Clear, reported fallback when Google Maps API key is not configured or in sandboxed mode */
        <div className="flex-1 flex flex-col">
          <div className="p-3 bg-surface rounded border border-border text-xs mb-3 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-accent">
              <span>📍 Interactive Map View</span>
            </div>
            <p className="text-muted leading-relaxed">
              {apiKey
                ? scriptError || 'Loading Google Maps layer...'
                : 'Google Maps JS Key not configured. To render full interactive vector tiles, configure VITE_GOOGLE_MAPS_API_KEY in your frontend environment.'}
            </p>
          </div>

          {/* Embedded responsive map preview for focused garage */}
          {selectedGarage ? (
            <div className="rounded border border-border overflow-hidden mb-3 bg-surface" style={{ height: '240px' }}>
              <iframe
                title={`Map view for ${selectedGarage.name}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  selectedGarage.latitude && selectedGarage.longitude
                    ? `${selectedGarage.latitude},${selectedGarage.longitude}`
                    : selectedGarage.googleMapsUrl && !selectedGarage.googleMapsUrl.includes('goo.gl')
                    ? selectedGarage.googleMapsUrl
                    : `${selectedGarage.name}, ${selectedGarage.addressLine1}, ${selectedGarage.city}`
                )}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted border border-border rounded mb-3 bg-surface">
              Select a workshop from the list to preview location and directions.
            </div>
          )}

          {/* Plotted Garages Coordinate Pins List */}
          <div className="flex-1 overflow-y-auto max-h-[180px] space-y-1.5 pr-1">
            <span className="text-xs font-semibold text-muted block mb-1">
              Workshops on Map ({garagesWithCoords.length}):
            </span>
            {garagesWithCoords.length > 0 ? (
              garagesWithCoords.map((g) => {
                const isSelected = g.id === selectedGarageId;
                return (
                  <div
                    key={g.id}
                    onClick={() => onSelectGarage(g.id)}
                    className={`p-2 rounded text-xs flex-between items-center cursor-pointer transition ${
                      isSelected
                        ? 'bg-primary text-white font-semibold'
                        : 'bg-surface hover:bg-surface-raised text-foreground'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="block truncate">{g.name}</span>
                      <span className={`text-[10px] block ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                        📍 {Number(g.latitude).toFixed(4)}, {Number(g.longitude).toFixed(4)} ({g.city})
                      </span>
                    </div>
                    <Link
                      to={`/garages/${g.slug}`}
                      className={`text-[11px] underline flex-shrink-0 ${isSelected ? 'text-white' : 'text-primary'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View ↗
                    </Link>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted italic">
                None of the current search results include coordinates. Add coordinates or Google Maps URLs when submitting garages.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
