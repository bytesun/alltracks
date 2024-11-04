import { TrackPoint } from '../types/TrackPoint';

interface DensityPoint {
  x: number;
  y: number;
  density: number;
}

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const calculateInstantSpeed = (point1: TrackPoint, point2: TrackPoint): number => {
  const distance = calculateDistance(
    point1.latitude, point1.longitude,
    point2.latitude, point2.longitude
  );
  const timeDiff = (point2.timestamp - point1.timestamp) / (1000 * 3600); // Convert to hours
  return distance / timeDiff;
};

export const calculateMovingTime = (trackPoints: TrackPoint[]): number => {
  let movingTime = 0;
  const speedThreshold = 0.5; // km/h
  
  for (let i = 1; i < trackPoints.length; i++) {
    const speed = calculateInstantSpeed(trackPoints[i-1], trackPoints[i]);
    if (speed > speedThreshold) {
      movingTime += trackPoints[i].timestamp - trackPoints[i-1].timestamp;
    }
  }
  return movingTime;
};

export const calculateAverageSpeed = (trackPoints: TrackPoint[]): number => {
  if (trackPoints.length < 2) return 0;
  const totalDistance = calculateTotalDistance(trackPoints);
  const totalTime = (trackPoints[trackPoints.length - 1].timestamp - trackPoints[0].timestamp) / (1000 * 3600);
  return totalDistance / totalTime;
};

export const calculateCentroid = (points: TrackPoint[]): TrackPoint => {
  const sum = points.reduce((acc, point) => ({
    latitude: acc.latitude + point.latitude,
    longitude: acc.longitude + point.longitude,
    elevation: (acc.elevation || 0) + (point.elevation || 0),
    timestamp: acc.timestamp + point.timestamp
  }), {
    latitude: 0,
    longitude: 0,
    elevation: 0,
    timestamp: 0
  });

  return {
    latitude: sum.latitude / points.length,
    longitude: sum.longitude / points.length,
    elevation: (sum.elevation || 0) / points.length,
    timestamp: Math.round(sum.timestamp / points.length)
  };
};


export const calculateTotalDistance = (trackPoints: TrackPoint[]): number => {
  let total = 0;
  for (let i = 1; i < trackPoints.length; i++) {
    total += calculateDistance(
      trackPoints[i-1].latitude,
      trackPoints[i-1].longitude,
      trackPoints[i].latitude,
      trackPoints[i].longitude
    );
  }
  return total;
};

export const calculateTotalAscent = (trackPoints: TrackPoint[]): number => {
  let totalAscent = 0;
  for (let i = 1; i < trackPoints.length; i++) {
    const elevDiff = (trackPoints[i].elevation ?? 0) - (trackPoints[i-1].elevation ?? 0);
    if (elevDiff > 0) totalAscent += elevDiff;
  }
  return totalAscent;
};
export const getDuration = (trackPoints: TrackPoint[]): number => {
  if (trackPoints.length < 2) return 0;
  return trackPoints[trackPoints.length - 1].timestamp - trackPoints[0].timestamp;
};

export const calculateGradient = (point1: TrackPoint, point2: TrackPoint): number => {
  const distance = calculateDistance(point1.latitude, point1.longitude, point2.latitude, point2.longitude) * 1000;
  const elevationChange = (point2.elevation ?? 0) - (point1.elevation ?? 0);
  return (elevationChange / distance) * 100;
};

export const calculateGradientFactor = (trackPoints: TrackPoint[]): number => {
  const gradients = trackPoints.slice(1).map((point, index) => 
    calculateGradient(trackPoints[index], point)
  );
  return Math.max(...gradients.map(Math.abs)) / 45;
};

export const calculateElevationFactor = (trackPoints: TrackPoint[]): number => {
  const totalAscent = calculateTotalAscent(trackPoints);
  const distance = calculateTotalDistance(trackPoints);
  return totalAscent / (distance * 1000);
};

export const calculateDistanceFactor = (trackPoints: TrackPoint[]): number => {
  const distance = calculateTotalDistance(trackPoints);
  return Math.min(distance / 50, 1);
};

export const calculateSimilarityScore = (trackA: TrackPoint[], trackB: TrackPoint[]): number => {
  const distanceSimilarity = Math.abs(calculateTotalDistance(trackA) - calculateTotalDistance(trackB));
  const elevationSimilarity = Math.abs(calculateTotalAscent(trackA) - calculateTotalAscent(trackB));
  const timeSimilarity = Math.abs(getDuration(trackA) - getDuration(trackB));
  return 1 - (distanceSimilarity + elevationSimilarity + timeSimilarity) / 3;
};

export const calculateGradients = (trackPoints: TrackPoint[]): number[] => {
  const gradients: number[] = [];
  for (let i = 1; i < trackPoints.length; i++) {
    gradients.push(calculateGradient(trackPoints[i-1], trackPoints[i]));
  }
  return gradients;
};

export const calculateDensity = (trackPoints: TrackPoint[]): DensityPoint[] => {
  const densityPoints: DensityPoint[] = [];
  const bounds = getBounds(trackPoints);
  
  trackPoints.forEach(point => {
    const x = normalize(point.longitude, bounds.minLon, bounds.maxLon);
    const y = normalize(point.latitude, bounds.minLat, bounds.maxLat);
    const density = calculatePointDensity(x, y, trackPoints, bounds);
    densityPoints.push({ x, y, density });
  });
  
  return densityPoints;
};

export const calculateSpeeds = (trackPoints: TrackPoint[]): number[] => {
  const speeds: number[] = [];
  for (let i = 1; i < trackPoints.length; i++) {
    speeds.push(calculateInstantSpeed(trackPoints[i-1], trackPoints[i]));
  }
  return speeds;
};

export const formatDuration = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getBounds = (points: TrackPoint[]) => ({
  minLat: Math.min(...points.map(p => p.latitude)),
  maxLat: Math.max(...points.map(p => p.latitude)),
  minLon: Math.min(...points.map(p => p.longitude)),
  maxLon: Math.max(...points.map(p => p.longitude))
});

const normalize = (value: number, min: number, max: number): number => 
  (value - min) / (max - min);

const calculatePointDensity = (x: number, y: number, points: TrackPoint[], bounds: any): number => {
  return points.reduce((acc, p) => {
    const px = normalize(p.longitude, bounds.minLon, bounds.maxLon);
    const py = normalize(p.latitude, bounds.minLat, bounds.maxLat);
    const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
    return acc + (distance < 0.05 ? 1 : 0);
  }, 0);
};