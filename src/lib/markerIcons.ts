import { icon } from 'leaflet';

const defaultMarkerSVG = `<svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="16" rx="12" ry="12" fill="#2E7DFF"/><path d="M16 48C16 48 28 32 28 20C28 10.0589 21.9411 4 16 4C10.0589 4 4 10.0589 4 20C4 32 16 48 16 48Z" fill="#2E7DFF" stroke="#fff" stroke-width="2"/><circle cx="16" cy="20" r="5" fill="#fff"/></svg>`;

const selectedMarkerSVG = `<svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="16" rx="12" ry="12" fill="#FFC107"/><path d="M16 48C16 48 28 32 28 20C28 10.0589 21.9411 4 16 4C10.0589 4 4 10.0589 4 20C4 32 16 48 16 48Z" fill="#FFC107" stroke="#fff" stroke-width="2"/><circle cx="16" cy="20" r="5" fill="#fff"/></svg>`;

// Hiker: walking pose, backpack and hiking stick, with two legs in a walking stride
const hikingHumanSVG = `<svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Head -->
  <circle cx="16" cy="11" r="5" fill="#222"/>
  <!-- Body -->
  <rect x="15" y="16" width="4" height="14" rx="2" fill="#1976D2"/>
  <!-- Left leg (forward stride) -->
  <rect x="13" y="30" width="4" height="10" rx="2" transform="rotate(-25 13 30)" fill="#388E3C"/>
  <!-- Right leg (back stride) -->
  <rect x="17" y="30" width="4" height="10" rx="2" transform="rotate(25 17 30)" fill="#388E3C"/>
  <!-- Left arm (forward, holding stick) -->
  <rect x="12" y="18" width="3" height="9" rx="1.5" transform="rotate(-30 12 18)" fill="#FBC02D"/>
  <!-- Right arm (back) -->
  <rect x="17" y="18" width="3" height="9" rx="1.5" transform="rotate(30 17 18)" fill="#FBC02D"/>
  <!-- Backpack -->
  <ellipse cx="13" cy="21" rx="2.2" ry="5.2" fill="#6D4C41"/>
  <!-- Hiking stick -->
  <rect x="10" y="27" width="1.2" height="14" rx="0.6" transform="rotate(-15 10 27)" fill="#795548"/>
</svg>`;

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

export const hikingHumanIcon = icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(hikingHumanSVG)}`,
  iconSize: [32, 48],
  iconAnchor: [16, 44],
});
