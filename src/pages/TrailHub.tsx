import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { Icon, LatLngTuple } from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import './TrailHub.css';

type TrailPoint = {
  id: string;
  name: string;
  km: number;
  type: 'trailhead' | 'camp' | 'poi' | 'hazard';
  position: LatLngTuple;
  tags: string[];
  notes: string;
};

type TrailSegment = {
  from: string;
  to: string;
  distance: string;
  terrain: string;
  planningNote: string;
};

type Discussion = {
  title: string;
  channel: string;
  replies: number;
  lastActive: string;
};

const wctPath: LatLngTuple[] = [
  [48.8747, -124.5915],
  [48.9071, -124.6804],
  [48.9382, -124.7276],
  [48.973, -124.802],
  [49.0008, -124.8564],
  [49.039, -124.8808],
  [49.0798, -124.9481],
  [49.1167, -125.0206],
  [49.1738, -125.1156],
  [49.2474, -125.2134],
];

const points: TrailPoint[] = [
  {
    id: 'gordon-river',
    name: 'Gordon River Trailhead',
    km: 75,
    type: 'trailhead',
    position: [48.8747, -124.5915],
    tags: ['NOBO start', 'orientation', 'ferry access'],
    notes: 'Southern access point. Good place to surface permits, shuttle notes, and start logistics.',
  },
  {
    id: 'thrasher-cove',
    name: 'Thrasher Cove',
    km: 70,
    type: 'camp',
    position: [48.9071, -124.6804],
    tags: ['camp', 'beach', 'steep access'],
    notes: 'Useful for early NOBO pacing notes and user-submitted recent conditions.',
  },
  {
    id: 'owen-point',
    name: 'Owen Point',
    km: 67,
    type: 'poi',
    position: [48.9382, -124.7276],
    tags: ['tide aware', 'sea caves', 'photo spot'],
    notes: 'A tide-sensitive highlight. The hub can attach tide windows and community confirmations here.',
  },
  {
    id: 'walbran-creek',
    name: 'Walbran Creek',
    km: 53,
    type: 'camp',
    position: [49.0008, -124.8564],
    tags: ['camp', 'water', 'bear cache'],
    notes: 'Camp detail page candidate: tent spots, water source, toilets, photos, and comments.',
  },
  {
    id: 'carmanah',
    name: 'Carmanah Lighthouse Area',
    km: 44,
    type: 'poi',
    position: [49.039, -124.8808],
    tags: ['landmark', 'history', 'rest stop'],
    notes: 'Good example for POI pages with history, media, and nearby hazards.',
  },
  {
    id: 'tsusiat-falls',
    name: 'Tsusiat Falls',
    km: 25,
    type: 'camp',
    position: [49.1167, -125.0206],
    tags: ['camp', 'waterfall', 'popular'],
    notes: 'A natural MVP showcase for media, camp reports, and crowding discussions.',
  },
  {
    id: 'pachena-bay',
    name: 'Pachena Bay Trailhead',
    km: 0,
    type: 'trailhead',
    position: [49.2474, -125.2134],
    tags: ['SOBO start', 'NOBO finish', 'trailhead'],
    notes: 'Northern access point. Useful for finish logistics, shuttle coordination, and completion posts.',
  },
];

const segments: TrailSegment[] = [
  {
    from: 'Gordon River',
    to: 'Thrasher Cove',
    distance: '~5 km',
    terrain: 'Forest, ladders, beach access',
    planningNote: 'Good first-day decision point for NOBO hikers; keep tide and fatigue notes visible.',
  },
  {
    from: 'Thrasher Cove',
    to: 'Walbran Creek',
    distance: '~17 km',
    terrain: 'Beach routes, rocks, forest bypasses',
    planningNote: 'Segment cards should expose tide-sensitive alternatives and recent hazard reports.',
  },
  {
    from: 'Walbran Creek',
    to: 'Carmanah',
    distance: '~9 km',
    terrain: 'Mixed beach and forest',
    planningNote: 'Good place to show POI media, water notes, and lighthouse-area discussions.',
  },
  {
    from: 'Carmanah',
    to: 'Tsusiat Falls',
    distance: '~19 km',
    terrain: 'Boardwalk, cable cars, beach',
    planningNote: 'Candidate for daily itinerary splitting and campsite recommendation logic.',
  },
  {
    from: 'Tsusiat Falls',
    to: 'Pachena Bay',
    distance: '~25 km',
    terrain: 'Forest trail, beach sections',
    planningNote: 'Finish-day logistics, pickup coordination, and completion timeline posts fit here.',
  },
];

const discussions: Discussion[] = [
  { title: 'Anyone starting NOBO this week?', channel: 'Planning', replies: 12, lastActive: '2h ago' },
  { title: 'Owen Point tide window reports', channel: 'Conditions', replies: 8, lastActive: '5h ago' },
  { title: 'Best 6-day campsite split?', channel: 'Itinerary', replies: 18, lastActive: '1d ago' },
  { title: 'Ride share from Victoria to Gordon River', channel: 'Ride Share', replies: 5, lastActive: '1d ago' },
];

const stats = [
  { label: 'Distance', value: '75 km' },
  { label: 'Typical Plan', value: '6-8 days' },
  { label: 'Direction', value: 'NOBO / SOBO' },
  { label: 'Focus', value: 'Tide + Camps' },
];

const pointIcon = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const TrailHub = () => {
  const [selectedPointId, setSelectedPointId] = useState(points[0].id);
  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedPointId) ?? points[0],
    [selectedPointId]
  );

  return (
    <div className="trail-hub-page">
      <section className="trail-hub-hero">
        <div>
          <Link to="/trails" className="trail-hub-back-link">← Trails</Link>
          <p className="trail-hub-eyebrow">Trail Hub MVP</p>
          <h1>West Coast Trail</h1>
          <p className="trail-hub-subtitle">
            A first version of a living trail space: route overview, key points, segment planning,
            conditions, and hiker discussions in one place.
          </p>
          <div className="trail-hub-actions">
            <button>Plan Itinerary</button>
            <button className="secondary">Report Condition</button>
          </div>
        </div>
        <div className="trail-hub-summary-card">
          <span className="material-icons">terrain</span>
          <h2>Trail OS Starter</h2>
          <p>
            Static WCT seed data today. Later this can connect to official notices, tide APIs,
            user tracks, media, and ICEvent trip plans.
          </p>
        </div>
      </section>

      <section className="trail-hub-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="trail-hub-stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </section>

      <section className="trail-hub-grid">
        <div className="trail-hub-map-card">
          <div className="trail-hub-section-heading">
            <div>
              <p className="trail-hub-eyebrow">Interactive Route</p>
              <h2>Route, camps, POIs, hazards</h2>
            </div>
            <span className="trail-hub-live-pill">Prototype</span>
          </div>
          <MapContainer center={[49.04, -124.91]} zoom={9} className="trail-hub-map">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution=""
              maxZoom={17}
            />
            <Polyline positions={wctPath} weight={5} opacity={0.8} />
            {points.map((point) => (
              <Marker
                key={point.id}
                position={point.position}
                icon={pointIcon}
                eventHandlers={{ click: () => setSelectedPointId(point.id) }}
              >
                <Popup>
                  <strong>{point.name}</strong>
                  <p>{point.tags.join(' · ')}</p>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <aside className="trail-hub-detail-card">
          <p className="trail-hub-eyebrow">Selected Point</p>
          <h2>{selectedPoint.name}</h2>
          <div className="trail-hub-point-meta">
            <span>KM {selectedPoint.km}</span>
            <span>{selectedPoint.type}</span>
          </div>
          <p>{selectedPoint.notes}</p>
          <div className="trail-hub-tags">
            {selectedPoint.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className="trail-hub-mini-actions">
            <button>Add photo</button>
            <button>Add comment</button>
            <button>Save to itinerary</button>
          </div>
        </aside>
      </section>

      <section className="trail-hub-content-grid">
        <div className="trail-hub-panel">
          <div className="trail-hub-section-heading">
            <div>
              <p className="trail-hub-eyebrow">Segments</p>
              <h2>Planning breakdown</h2>
            </div>
          </div>
          <div className="trail-hub-segments">
            {segments.map((segment) => (
              <article key={`${segment.from}-${segment.to}`} className="trail-hub-segment-card">
                <div>
                  <strong>{segment.from} → {segment.to}</strong>
                  <span>{segment.distance}</span>
                </div>
                <p>{segment.terrain}</p>
                <small>{segment.planningNote}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="trail-hub-panel">
          <div className="trail-hub-section-heading">
            <div>
              <p className="trail-hub-eyebrow">Community</p>
              <h2>Hiker discussions</h2>
            </div>
          </div>
          <div className="trail-hub-discussions">
            {discussions.map((discussion) => (
              <article key={discussion.title} className="trail-hub-discussion-card">
                <span>{discussion.channel}</span>
                <h3>{discussion.title}</h3>
                <p>{discussion.replies} replies · active {discussion.lastActive}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="trail-hub-roadmap">
        <p className="trail-hub-eyebrow">Next integrations</p>
        <h2>What this page should connect to next</h2>
        <div className="trail-hub-roadmap-grid">
          <div><strong>Tides</strong><span>Attach passable windows to beach POIs.</span></div>
          <div><strong>Conditions</strong><span>User reports with confirmation counts.</span></div>
          <div><strong>Itinerary</strong><span>Export daily plan to ICEvent calendar.</span></div>
          <div><strong>Tracks</strong><span>Overlay real GPX/KML tracks and checkpoint media.</span></div>
        </div>
      </section>
    </div>
  );
};
