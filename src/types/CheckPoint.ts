export interface CheckPoint {
    elevation: number;
    groupId?: string;
    isPublic: boolean;
    latitude: number;
    longitude: number;
    note?: string;
    photo?: string;
    timestamp: number;
    trackId: string;
}