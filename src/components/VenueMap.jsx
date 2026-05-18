import React, { useEffect, useRef, useState } from 'react';

// Predefined venue coordinates (campus locations)
const VENUE_COORDS = {
  'main auditorium': { lat: 12.9716, lng: 77.5946, label: 'Main Auditorium, Block A' },
  'block a': { lat: 12.9716, lng: 77.5946, label: 'Block A' },
  'seminar hall': { lat: 12.9720, lng: 77.5952, label: 'Seminar Hall, Block B' },
  'block b': { lat: 12.9720, lng: 77.5952, label: 'Block B' },
  'open ground': { lat: 12.9710, lng: 77.5940, label: 'Open Ground, Campus Center' },
  'campus center': { lat: 12.9710, lng: 77.5940, label: 'Campus Center' },
  'open air theatre': { lat: 12.9714, lng: 77.5935, label: 'Open Air Theatre' },
  'lab 301': { lat: 12.9722, lng: 77.5958, label: 'Lab 301, Block C' },
  'block c': { lat: 12.9722, lng: 77.5958, label: 'Block C' },
  'block d': { lat: 12.9718, lng: 77.5962, label: 'Block D' },
  'library': { lat: 12.9712, lng: 77.5948, label: 'Central Library' },
  'sports complex': { lat: 12.9706, lng: 77.5938, label: 'Sports Complex' },
  'cafeteria': { lat: 12.9708, lng: 77.5950, label: 'College Cafeteria' },
};

const DEFAULT_COORDS = { lat: 12.9716, lng: 77.5946, label: 'Campus' };

function getVenueCoords(venue) {
  if (!venue) return DEFAULT_COORDS;
  const lower = venue.toLowerCase();
  for (const [key, coords] of Object.entries(VENUE_COORDS)) {
    if (lower.includes(key)) return { ...coords, label: venue };
  }
  return { ...DEFAULT_COORDS, label: venue };
}

function VenueMap({ venue, height = 200 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // Prevent re-initializing
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const coords = getVenueCoords(venue);

    const map = window.L.map(mapRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 17,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Custom marker icon
    const customIcon = window.L.divIcon({
      className: 'venue-map-marker',
      html: `<div class="venue-marker-pin"><span>📍</span></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    window.L.marker([coords.lat, coords.lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(
        `<div style="text-align:center;font-family:Inter,sans-serif;padding:4px 8px;">
          <strong style="font-size:13px;color:#4f46e5;">📍 ${coords.label}</strong><br/>
          <span style="font-size:11px;color:#64748b;">Event Venue</span>
        </div>`,
        { maxWidth: 250 }
      )
      .openPopup();

    // Add a subtle circle around the venue
    window.L.circle([coords.lat, coords.lng], {
      color: '#6366f1',
      fillColor: '#6366f1',
      fillOpacity: 0.08,
      radius: 80,
      weight: 2,
      opacity: 0.4,
    }).addTo(map);

    mapInstanceRef.current = map;
    setIsLoaded(true);

    // Fix map rendering when container becomes visible
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [venue]);

  return (
    <div className="venue-map-container" style={{ height: `${height}px` }}>
      {!isLoaded && (
        <div className="venue-map-loading">
          <div className="venue-map-loading__spinner"></div>
          <span>Loading map...</span>
        </div>
      )}
      <div ref={mapRef} className="venue-map" style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

export default VenueMap;
