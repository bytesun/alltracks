import { Trail as TrailType } from '../api/alltracks/backend.did';
import { Trail } from '../types/Trail';
import { LatLngTuple } from 'leaflet';

export const routeTypeMap = {
  'loop': { tloop: null },
  'out-and-back': { outandback: null },
  'point-to-point': { pointto: null }
};

export const difficultyMap = {
  'easy': { easy: null },
  'moderate': { moderate: null },
  'hard': { hard: null },
  'expert': { expert: null }
};

export const parseTrails = (trails: TrailType[]): Trail[] => {
  return trails.map((trail) => {
    const {
      id,
      name,
      description,
      distance,
      elevationGain,
      duration,
      ttype,
      difficulty,
      rate,
      tags,
      trailfile,
      photos,
      startPoint
    } = trail;

    return {
      id,
      name,
      description,
      distance: Number(distance.toFixed(2)),
      elevationGain: Number(elevationGain.toFixed(2)),
      duration: Number(duration.toFixed(2)),
      routeType: Object.getOwnPropertyNames(ttype)[0],
      difficulty: Object.getOwnPropertyNames(difficulty)[0],
      rating: Number(rate.toFixed(2)),
      tags,
      trailfile,
      photos,
      startPoint
    };
  }
  );

};

export const parseTrailFile = async (url: string, fileType: string): Promise<LatLngTuple[]> => {
  const response = await fetch(url);
  const data = await response.text();
  const parser = new DOMParser();

  switch (fileType) {
    case 'application/gpx+xml': {
      const gpx = parser.parseFromString(data, 'text/xml');
      return Array.from(gpx.querySelectorAll('trkpt')).map((point) => [
        Number(point.getAttribute('lat')),
        Number(point.getAttribute('lon')),
      ] as LatLngTuple);
    }

    case 'application/json': {
      const json = JSON.parse(data);
      return json.features?.[0]?.geometry?.coordinates?.map(([lon, lat]) =>
        [lat, lon] as LatLngTuple
      ) || [];
    }

    case 'application/vnd.google-earth.kml+xml': {
      const kml = parser.parseFromString(data, 'text/xml');
      return kml.querySelector('coordinates')?.textContent
        ?.trim()
        .split(/\s+/)
        .map((coord) => {
          const [lon, lat] = coord.split(',');
          return [Number(lat), Number(lon)] as LatLngTuple;
        }) || [];
    }

    case 'text/csv':
      return data
        .split('\n')
        .slice(1)
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
          const [lat, lon] = row.split(',');
          return [Number(lat), Number(lon)] as LatLngTuple;
        });

    default:
      return [];
  }
};
