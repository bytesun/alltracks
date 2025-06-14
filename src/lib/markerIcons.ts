import { icon } from 'leaflet';

const defaultMarkerSVG = `<svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="16" rx="12" ry="12" fill="#2E7DFF"/><path d="M16 48C16 48 28 32 28 20C28 10.0589 21.9411 4 16 4C10.0589 4 4 10.0589 4 20C4 32 16 48 16 48Z" fill="#2E7DFF" stroke="#fff" stroke-width="2"/><circle cx="16" cy="20" r="5" fill="#fff"/></svg>`;

const selectedMarkerSVG = `<svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="16" rx="12" ry="12" fill="#FFC107"/><path d="M16 48C16 48 28 32 28 20C28 10.0589 21.9411 4 16 4C10.0589 4 4 10.0589 4 20C4 32 16 48 16 48Z" fill="#FFC107" stroke="#fff" stroke-width="2"/><circle cx="16" cy="20" r="5" fill="#fff"/></svg>`;

export const locationIcon = icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(defaultMarkerSVG)}`,
  iconSize: [32, 48],
  iconAnchor: [16, 44],
});

export const selectedLocationIcon = icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(selectedMarkerSVG)}`,
  iconSize: [32, 48],
  iconAnchor: [16, 44],
});
