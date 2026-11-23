import { TrackPoint } from "../types/TrackPoint"

export const hasValidCoordinates = (point: TrackPoint): boolean =>
  Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
  Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;

const coordinate = (value: string | null | undefined): number =>
  value == null || value.trim() === '' ? NaN : Number(value);

export const parseCSV = (content: string): TrackPoint[] => {
  const lines = content.split('\n');
  const points = lines.slice(1).filter(line => line.trim() !== '').map(line => {
    const [timestamp, latitude, longitude, elevation, comment, photo] = line.split(',');
    return {
      timestamp: Number(timestamp),
      latitude: coordinate(latitude),
      longitude: coordinate(longitude),
      elevation: elevation ? Number(elevation) : undefined,
      comment: comment?.trim(),
      photo: photo?.trim()
    };
  });
  return points.filter(hasValidCoordinates);
};

export const parseGPX = (content: string): TrackPoint[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const trackpoints = Array.from(doc.getElementsByTagName('trkpt'));
  
  return trackpoints.map(trkpt => ({
    latitude: coordinate(trkpt.getAttribute('lat')),
    longitude: coordinate(trkpt.getAttribute('lon')),
    elevation: Number(trkpt.getElementsByTagName('ele')[0]?.textContent) || undefined,
    timestamp: new Date(trkpt.getElementsByTagName('time')[0]?.textContent || '').getTime(),
    comment: trkpt.getElementsByTagName('cmt')[0]?.textContent || undefined
    
  })).filter(hasValidCoordinates);
};

export const parseKML = (content: string): TrackPoint[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const coordinatesElement = doc.getElementsByTagName('coordinates')[0];
  const coordinates = coordinatesElement?.textContent || '';
  
  return coordinates.trim().split(/\s+/).map(coord => {
    const [longitude, latitude, elevation] = coord.trim().split(',');
    return {
      latitude: coordinate(latitude),
      longitude: coordinate(longitude),
      elevation: Number(elevation),
      timestamp: Date.now()
    };
  }).filter(hasValidCoordinates);
};