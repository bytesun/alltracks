import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline as LeafletPolyline, Marker as LeafletMarker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Load Leaflet CSS dynamically
if (typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  if (!document.querySelector('link[href*="leaflet.css"]')) {
    document.head.appendChild(link);
  }
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map region updates
function MapRegionUpdater({ region }: any) {
  const map = useMap();
  
  useEffect(() => {
    if (region) {
      map.setView([region.latitude, region.longitude], 13);
    }
  }, [region, map]);
  
  return null;
}

// Web MapView component using OpenStreetMap
export default function MapView({ children, style, region, initialRegion, ...props }: any) {
  const centerRegion = region || initialRegion || {
    latitude: 37.78825,
    longitude: -122.4324,
  };

  return (
    <div style={{ flex: 1, height: '100%', width: '100%', position: 'relative', zIndex: 0, ...(style || {}) }}>
      <MapContainer
        center={[centerRegion.latitude, centerRegion.longitude]}
        zoom={13}
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
        {...props}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRegionUpdater region={region} />
        {children}
      </MapContainer>
    </div>
  );
}

// Polyline component for web
export function Polyline({ coordinates, strokeColor, strokeWidth, ...props }: any) {
  if (!coordinates || coordinates.length === 0) return null;
  
  const positions = coordinates.map((coord: any) => [coord.latitude, coord.longitude]);
  
  return (
    <LeafletPolyline
      positions={positions}
      pathOptions={{
        color: strokeColor || '#0000FF',
        weight: strokeWidth || 3,
      }}
      {...props}
    />
  );
}

// Marker component for web
export function Marker({ coordinate, title, description, pinColor, ...props }: any) {
  if (!coordinate) return null;
  
  const icon = pinColor ? new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${pinColor}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }) : undefined;
  
  return (
    <LeafletMarker
      position={[coordinate.latitude, coordinate.longitude]}
      icon={icon}
      title={title}
      {...props}
    />
  );
}
