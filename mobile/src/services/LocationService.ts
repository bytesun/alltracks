import * as Location from 'expo-location';
import { TrackPoint } from '../types';

export class LocationService {
  private static subscription: Location.LocationSubscription | null = null;
  private static lastLocation: Location.LocationObject | null = null;

  static async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  static async requestBackgroundPermissions(): Promise<boolean> {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  }

  static async getCurrentLocation(): Promise<TrackPoint | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.lastLocation = location;

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        elevation: location.coords.altitude || undefined,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  static async startTracking(
    callback: (point: TrackPoint) => void,
    options: {
      distanceInterval?: number;
      timeInterval?: number;
    } = {}
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    // Request background permission for continuous tracking
    await this.requestBackgroundPermissions();

    const { distanceInterval = 10, timeInterval = 5000 } = options;

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval,
        timeInterval,
      },
      (location) => {
        this.lastLocation = location;
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          elevation: location.coords.altitude || undefined,
          timestamp: location.timestamp,
        });
      }
    );
  }

  static stopTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  static getLastLocation(): Location.LocationObject | null {
    return this.lastLocation;
  }

  static calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}
