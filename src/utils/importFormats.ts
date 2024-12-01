import { TrackPoint } from "../types/TrackPoint"

export const parseCSV = (content: string): TrackPoint[] => {
  const lines = content.split('\n');
  const points = lines.slice(1).map(line => {
    const [timestamp, latitude, longitude, elevation, comment, photo] = line.split(',');
    return {
      timestamp: Number(timestamp),
      latitude: Number(latitude),
      longitude: Number(longitude),
      elevation: elevation ? Number(elevation) : undefined,
      comment: comment?.trim(),
      photo: photo?.trim()
    };
  });
  return points;
};

export const parseGPX = (content: string): TrackPoint[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const trackpoints = Array.from(doc.getElementsByTagName('trkpt'));
  
  return trackpoints.map(trkpt => ({
    latitude: Number(trkpt.getAttribute('lat')),
    longitude: Number(trkpt.getAttribute('lon')),
    elevation: Number(trkpt.getElementsByTagName('ele')[0]?.textContent) || undefined,
    timestamp: new Date(trkpt.getElementsByTagName('time')[0]?.textContent || '').getTime(),
    comment: trkpt.getElementsByTagName('cmt')[0]?.textContent || undefined
    
  }));
};

export const parseKML = (content: string): TrackPoint[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const coordinatesElement = doc.getElementsByTagName('coordinates')[0];
  const coordinates = coordinatesElement?.textContent || '';
  
  return coordinates.trim().split('\n').map(coord => {
    const [longitude, latitude, elevation] = coord.trim().split(',');
    return {
      latitude: Number(latitude),
      longitude: Number(longitude),
      elevation: Number(elevation),
      timestamp: Date.now()
    };
  });
};