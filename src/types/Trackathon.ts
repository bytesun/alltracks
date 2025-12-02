export type ActivityType = 'hiking' | 'running' | 'cycling' | 'rowing' | 'track';

export interface Trackathon {
  id: string;
  name: string;
  description: string;
  startTime: number; // When trackathon starts (registration closes)
  endTime: number; // When trackathon ends (no more point recording allowed)
  duration: number; // Challenge duration in hours from startTime
  activityType: ActivityType;
  groupId?: string;
  registrations: string[]; // Principal IDs of registered users
  createdBy: string;
  createdAt: number;
}

export interface TrackathonParticipant {
  principal: string;
  username: string;
  startedAt?: number; // When participant started tracking (undefined if registered but not started)
  totalDistance: number; // in km
  totalElevationGain: number; // in meters
  trackPoints: TrackathonPoint[]; // All recorded points
  hasMintedBadge?: boolean; // Whether participant has minted their completion badge NFT
}

export interface TrackathonPoint {
  lat: number;
  lng: number;
  elevation?: number; // Elevation in meters for elevation gain calculation
  timestamp: number;
  note?: string;
}

export interface NewTrackathon {
  name: string;
  description: string;
  startTime: number; // When trackathon starts
  endTime: number; // When trackathon ends
  duration: number; // Challenge duration in hours from startTime
  activityType: ActivityType;
  groupId?: string;
}

export interface TrackathonBadge {
  trackathonId: string;
  trackathonName: string;
  participantPrincipal: string;
  participantName: string;
  completionDate: number;
  distance: number;
  elevationGain: number;
  duration: number;
  activityType: ActivityType;
  routeImage: string; // Base64 encoded image of the route map
  rank?: number; // Participant's rank in the trackathon
}
