import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon, LatLngTuple } from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

import { Spinner } from '../components/Spinner';
import { useAlltracks } from '../components/Store';
import { Trail } from '../types/Trail';
import { parseTrailFile, parseTrails } from '../utils/trailUtils';
import './TrailDetail.css';

const marker = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const formatLabel = (value: string) => value.replace(/-/g, ' ');

export const TrailDetail = () => {
  const { trailId } = useParams();
  const alltracks = useAlltracks();

  const [trail, setTrail] = useState<Trail | null>(null);
  const [trailPath, setTrailPath] = useState<LatLngTuple[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrail = async () => {
      if (!trailId) {
        setError('Trail ID is missing.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const result = await alltracks.getTrail(BigInt(trailId));
        if (!result.length) {
          setTrail(null);
          setError('Trail not found.');
          return;
        }

        const [formattedTrail] = parseTrails(result);
        setTrail(formattedTrail);

        const points = await parseTrailFile(formattedTrail.trailfile.url, formattedTrail.trailfile.fileType);
        setTrailPath(points);
      } catch (loadError) {
        console.error('Error loading trail details:', loadError);
        setError('Unable to load trail details right now.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTrail();
  }, [alltracks, trailId]);

  if (isLoading) {
    return (
      <div className="trail-detail-state">
        <Spinner />
      </div>
    );
  }

  if (error || !trail) {
    return (
      <div className="trail-detail-state">
        <Link to="/trails" className="trail-detail-back-link">← Back to trails</Link>
        <h1>Trail unavailable</h1>
        <p>{error ?? 'This trail could not be loaded.'}</p>
      </div>
    );
  }

  const coverPhoto = trail.photos[0] || '/alltracks_hero.png';
  const mapCenter: LatLngTuple = trail.startPoint
    ? [trail.startPoint.latitude, trail.startPoint.longitude]
    : trailPath[0] || [49.2827, -123.1207];

  return (
    <div className="trail-detail-page">
      <section className="trail-detail-hero">
        <div className="trail-detail-copy">
          <Link to="/trails" className="trail-detail-back-link">← Back to trails</Link>
          <div className="trail-detail-badges">
            <span className={`trail-detail-badge difficulty-${trail.difficulty}`}>{trail.difficulty}</span>
            <span className="trail-detail-badge trail-detail-badge--muted">{formatLabel(trail.routeType)}</span>
            <span className="trail-detail-badge trail-detail-badge--muted">{trail.rating}/5 rating</span>
          </div>
          <h1>{trail.name}</h1>
          <p>{trail.description || 'No description has been added for this trail yet.'}</p>

          <div className="trail-detail-stats">
            <div>
              <span>Distance</span>
              <strong>{trail.distance} km</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>{trail.duration} hours</strong>
            </div>
            <div>
              <span>Elevation gain</span>
              <strong>{trail.elevationGain} m</strong>
            </div>
            <div>
              <span>Start point</span>
              <strong>
                {trail.startPoint.latitude.toFixed(4)}, {trail.startPoint.longitude.toFixed(4)}
              </strong>
            </div>
          </div>

          <div className="trail-detail-actions">
            <a href={trail.trailfile.url} download className="trail-detail-action">
              <span className="material-icons">download</span>
              Download trail file
            </a>
          </div>
        </div>

        <div className="trail-detail-cover">
          <img src={coverPhoto} alt={trail.name} />
        </div>
      </section>

      <section className="trail-detail-grid">
        <div className="trail-detail-map-card">
          <div className="trail-detail-section-heading">
            <div>
              <p className="trail-detail-eyebrow">Route</p>
              <h2>Trail map</h2>
            </div>
          </div>
          <MapContainer center={mapCenter} zoom={11} className="trail-detail-map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {trail.startPoint && (
              <Marker
                position={[trail.startPoint.latitude, trail.startPoint.longitude]}
                icon={marker}
              />
            )}
            {trailPath.length > 0 && (
              <Polyline positions={trailPath} color="#ff5a1f" weight={4} />
            )}
          </MapContainer>
        </div>

        <aside className="trail-detail-side">
          <div className="trail-detail-card">
            <p className="trail-detail-eyebrow">Trail info</p>
            <h2>Overview</h2>
            <dl className="trail-detail-meta-list">
              <div>
                <dt>Difficulty</dt>
                <dd>{trail.difficulty}</dd>
              </div>
              <div>
                <dt>Route type</dt>
                <dd>{formatLabel(trail.routeType)}</dd>
              </div>
              <div>
                <dt>Rating</dt>
                <dd>{trail.rating}/5</dd>
              </div>
              <div>
                <dt>File format</dt>
                <dd>{trail.trailfile.fileType}</dd>
              </div>
            </dl>
          </div>

          <div className="trail-detail-card">
            <p className="trail-detail-eyebrow">Tags</p>
            <h2>Trail labels</h2>
            {trail.tags.length > 0 ? (
              <div className="trail-detail-tags">
                {trail.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            ) : (
              <p>No tags added yet.</p>
            )}
          </div>

          {trail.photos.length > 1 && (
            <div className="trail-detail-card">
              <p className="trail-detail-eyebrow">Gallery</p>
              <h2>More photos</h2>
              <div className="trail-detail-gallery">
                {trail.photos.slice(1).map((photo, index) => (
                  <img key={`${photo}-${index}`} src={photo} alt={`${trail.name} ${index + 2}`} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};
