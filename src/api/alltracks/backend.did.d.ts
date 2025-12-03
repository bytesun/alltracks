import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type ActivityType = { 'track' : null } |
  { 'hiking' : null } |
  { 'cycling' : null } |
  { 'rowing' : null } |
  { 'running' : null };
export interface CheckPoint {
  'latitude' : number,
  'elevation' : number,
  'note' : string,
  'createdBy' : Principal,
  'groupId' : [] | [string],
  'trackId' : string,
  'longitude' : number,
  'timestamp' : Time,
  'isPublic' : boolean,
  'photo' : [] | [string],
}
export interface CheckpointComment {
  'checkpointCreatedBy' : Principal,
  'createdBy' : Principal,
  'comment' : string,
  'checkpointTimestamp' : Time,
  'timestamp' : Time,
  'photo' : [] | [string],
}
export type CheckpointFilter = { 'user' : Principal } |
  { 'groupId' : string };
export type Difficulty = { 'easy' : null } |
  { 'hard' : null } |
  { 'expert' : null } |
  { 'moderate' : null };
export interface Group {
  'id' : string,
  'members' : Array<Principal>,
  'admin' : Principal,
  'name' : string,
  'createdAt' : Time,
  'createdBy' : Principal,
  'description' : string,
  'badge' : string,
}
export type IncidentCategory = { 'other' : null } |
  { 'wildlife' : null } |
  { 'obstacle' : null } |
  { 'hazard' : null } |
  { 'weather' : null };
export interface IncidentPoint {
  'latitude' : number,
  'elevation' : number,
  'note' : string,
  'createdBy' : Principal,
  'groupId' : [] | [string],
  'trackId' : string,
  'longitude' : number,
  'timestamp' : Time,
  'category' : IncidentCategory,
  'severity' : Severity,
  'photo' : [] | [string],
}
export interface NewCheckPoint {
  'latitude' : number,
  'elevation' : number,
  'note' : string,
  'groupId' : [] | [string],
  'trackId' : string,
  'longitude' : number,
  'timestamp' : Time,
  'isPublic' : boolean,
  'photo' : [] | [string],
}
export interface NewGroup {
  'id' : string,
  'members' : Array<Principal>,
  'admin' : Principal,
  'name' : string,
  'description' : string,
  'badge' : string,
}
export interface NewIncidentPoint {
  'latitude' : number,
  'elevation' : number,
  'note' : string,
  'groupId' : [] | [string],
  'trackId' : string,
  'longitude' : number,
  'timestamp' : Time,
  'category' : IncidentCategory,
  'severity' : Severity,
  'photo' : [] | [string],
}
export interface NewSavedPoint {
  'latitude' : number,
  'description' : string,
  'longitude' : number,
  'category' : string,
}
export interface NewSpot {
  'name' : string,
  'tags' : Array<string>,
  'description' : string,
}
export interface NewTrack {
  'id' : string,
  'duration' : number,
  'elevation' : number,
  'trackType' : TrackType,
  'startime' : Time,
  'trackfile' : TrackFile,
  'name' : string,
  'description' : string,
  'groupId' : [] | [string],
  'length' : number,
  'isPublic' : boolean,
  'startPoint' : Point,
}
export interface NewTrackathon {
  'startTime' : Time,
  'duration' : number,
  'activityType' : ActivityType,
  'endTime' : Time,
  'name' : string,
  'description' : string,
  'groupId' : [] | [string],
}
export interface NewTrail {
  'duration' : number,
  'ttype' : TrailType,
  'trailfile' : TrailFile,
  'difficulty' : Difficulty,
  'name' : string,
  'rate' : number,
  'tags' : Array<string>,
  'description' : string,
  'distance' : number,
  'elevationGain' : number,
  'startPoint' : Point,
  'photos' : Array<string>,
}
export interface Photo {
  'createdBy' : Principal,
  'tags' : Array<string>,
  'photoUrl' : string,
  'groupId' : [] | [string],
  'trackId' : string,
  'timestamp' : Time,
}
export interface Point { 'latitude' : number, 'longitude' : number }
export type Result = { 'ok' : Spot } |
  { 'err' : string };
export type Result_1 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_2 = { 'ok' : string } |
  { 'err' : string };
export type Result_3 = { 'ok' : TrackathonBadge } |
  { 'err' : string };
export type Result_4 = { 'ok' : Trail } |
  { 'err' : string };
export type Result_5 = { 'ok' : Trackathon } |
  { 'err' : string };
export type Result_6 = { 'ok' : Track } |
  { 'err' : string };
export type Result_7 = { 'ok' : SpotV2 } |
  { 'err' : string };
export type Result_8 = { 'ok' : SavedPoint } |
  { 'err' : string };
export type Result_9 = { 'ok' : Group } |
  { 'err' : string };
export interface SavedPoint {
  'latitude' : number,
  'createdAt' : Time,
  'createdBy' : Principal,
  'description' : string,
  'longitude' : number,
  'category' : string,
}
export type Severity = { 'low' : null } |
  { 'high' : null } |
  { 'critical' : null } |
  { 'medium' : null };
export interface Spot {
  'name' : string,
  'createdAt' : Time,
  'createdBy' : Principal,
  'tags' : Array<string>,
  'description' : string,
}
export interface SpotV2 {
  'id' : bigint,
  'name' : string,
  'createdAt' : Time,
  'createdBy' : Principal,
  'tags' : Array<string>,
  'description' : string,
}
export type Time = bigint;
export interface Track {
  'id' : string,
  'duration' : number,
  'elevation' : number,
  'trackType' : TrackType,
  'startime' : Time,
  'trackfile' : TrackFile,
  'name' : string,
  'createdBy' : Principal,
  'description' : string,
  'groupId' : [] | [string],
  'length' : number,
  'isPublic' : boolean,
  'startPoint' : Point,
}
export interface TrackFile { 'url' : string, 'fileType' : string }
export type TrackFilter = { 'user' : Principal } |
  { 'group' : string };
export type TrackType = { 'fly' : null } |
  { 'run' : null } |
  { 'ski' : null } |
  { 'other' : null } |
  { 'bike' : null } |
  { 'hike' : null } |
  { 'travel' : null } |
  { 'climb' : null } |
  { 'drive' : null } |
  { 'paddle' : null };
export interface Trackathon {
  'id' : string,
  'startTime' : Time,
  'duration' : number,
  'activityType' : ActivityType,
  'endTime' : Time,
  'name' : string,
  'createdAt' : Time,
  'createdBy' : Principal,
  'description' : string,
  'groupId' : [] | [string],
  'registrations' : Array<Principal>,
}
export interface TrackathonBadge {
  'participantPrincipal' : Principal,
  'trackathonName' : string,
  'duration' : number,
  'activityType' : ActivityType,
  'completionDate' : Time,
  'participantName' : string,
  'rank' : [] | [bigint],
  'distance' : number,
  'elevationGain' : number,
  'routeImage' : string,
  'trackathonId' : string,
}
export interface TrackathonParticipant {
  'startedAt' : [] | [Time],
  'principal' : Principal,
  'username' : string,
  'trackPoints' : Array<TrackathonPoint>,
  'totalDistance' : number,
  'totalElevationGain' : number,
  'hasMintedBadge' : boolean,
}
export interface TrackathonPoint {
  'lat' : number,
  'lng' : number,
  'elevation' : [] | [number],
  'note' : [] | [string],
  'timestamp' : Time,
}
export interface Trail {
  'id' : bigint,
  'duration' : number,
  'ttype' : TrailType,
  'trailfile' : TrailFile,
  'difficulty' : Difficulty,
  'name' : string,
  'createdAt' : Time,
  'createdBy' : Principal,
  'rate' : number,
  'tags' : Array<string>,
  'description' : string,
  'distance' : number,
  'elevationGain' : number,
  'startPoint' : Point,
  'photos' : Array<string>,
}
export interface TrailFile { 'url' : string, 'fileType' : string }
export type TrailFilter = { 'ttype' : TrailType } |
  { 'difficulty' : Difficulty };
export type TrailType = { 'tloop' : null } |
  { 'outandback' : null } |
  { 'pointto' : null };
export interface UserCredential {
  'encryptedWallet' : {
    'iv' : Uint8Array | number[],
    'data' : Uint8Array | number[],
  },
  'publicKey' : string,
  'createdAt' : bigint,
  'credentialId' : string,
}
export interface UserStats {
  'id' : string,
  'totalHours' : number,
  'firstHikeDate' : Time,
  'completedTrails' : bigint,
  'totalDistance' : number,
  'totalElevation' : number,
}
export interface _SERVICE {
  'addCheckpointComment' : ActorMethod<
    [
      Time,
      Principal,
      { 'comment' : string, 'timestamp' : Time, 'photo' : [] | [string] },
    ],
    Result_1
  >,
  'addPhoto' : ActorMethod<
    [
      {
        'tags' : Array<string>,
        'photoUrl' : string,
        'groupId' : [] | [string],
        'trackId' : string,
        'timestamp' : Time,
      },
    ],
    Result_1
  >,
  'createCheckpoint' : ActorMethod<[NewCheckPoint], Result_1>,
  'createGroup' : ActorMethod<[NewGroup], Result_9>,
  'createIncidentPoint' : ActorMethod<[NewIncidentPoint], Result_1>,
  'createSavedPoint' : ActorMethod<[NewSavedPoint], Result_8>,
  'createSpot' : ActorMethod<[NewSpot], Result_7>,
  'createTrack' : ActorMethod<[NewTrack], Result_6>,
  'createTrackathon' : ActorMethod<[NewTrackathon], Result_5>,
  'createTrail' : ActorMethod<[NewTrail], Result_4>,
  'createUserCredential' : ActorMethod<[UserCredential], Result_1>,
  'deletePhoto' : ActorMethod<[string], Result_1>,
  'deleteSpot' : ActorMethod<[string], Result_1>,
  'deleteTrail' : ActorMethod<[bigint], Result_1>,
  'getAllTrackathons' : ActorMethod<[], Array<Trackathon>>,
  'getCheckPointsByTrackId' : ActorMethod<[string], Array<CheckPoint>>,
  'getCheckpointComments' : ActorMethod<
    [Time, Principal],
    Array<CheckpointComment>
  >,
  'getCheckpoints' : ActorMethod<
    [CheckpointFilter, Time, Time],
    Array<CheckPoint>
  >,
  'getGroup' : ActorMethod<[string], [] | [Group]>,
  'getGroupPhotos' : ActorMethod<[string, Time, Time], Array<Photo>>,
  'getIncidentCheckpoints' : ActorMethod<[Time, Time], Array<IncidentPoint>>,
  'getIncidentPointsByCategory' : ActorMethod<
    [IncidentCategory],
    Array<IncidentPoint>
  >,
  'getIncidentPointsBySeverity' : ActorMethod<[Severity], Array<IncidentPoint>>,
  'getIncidentPointsByTimeRange' : ActorMethod<
    [Time, Time],
    Array<IncidentPoint>
  >,
  'getIncidentPointsByTrack' : ActorMethod<[string], Array<IncidentPoint>>,
  'getLatestCheckpoints' : ActorMethod<[], Array<CheckPoint>>,
  'getListCounts' : ActorMethod<
    [],
    {
      'incidentPoints' : bigint,
      'tracks' : bigint,
      'trails' : bigint,
      'checkpoints' : bigint,
      'photos' : bigint,
    }
  >,
  'getMyCredential' : ActorMethod<[], [] | [UserCredential]>,
  'getMyGroups' : ActorMethod<[], Array<Group>>,
  'getMyPhotos' : ActorMethod<[Time, Time], Array<Photo>>,
  'getMySavedPoints' : ActorMethod<[], Array<SavedPoint>>,
  'getMySpots' : ActorMethod<[bigint, bigint], Array<SpotV2>>,
  'getMyTrackathonProgress' : ActorMethod<
    [string],
    [] | [TrackathonParticipant]
  >,
  'getMyTrackathons' : ActorMethod<[], Array<Trackathon>>,
  'getMyTrails' : ActorMethod<[], Array<Trail>>,
  'getSavedPointsByCategory' : ActorMethod<[string], Array<SavedPoint>>,
  'getSpotById' : ActorMethod<[bigint], [] | [SpotV2]>,
  'getSpots' : ActorMethod<[bigint, bigint], Array<SpotV2>>,
  'getTrack' : ActorMethod<[string], [] | [Track]>,
  'getTrackPhotos' : ActorMethod<[string, Time, Time], Array<Photo>>,
  'getTrackathon' : ActorMethod<[string], [] | [Trackathon]>,
  'getTrackathonParticipants' : ActorMethod<
    [string],
    Array<TrackathonParticipant>
  >,
  'getTracks' : ActorMethod<[TrackFilter], Array<Track>>,
  'getTrail' : ActorMethod<[bigint], [] | [Trail]>,
  'getTrails' : ActorMethod<[TrailFilter], Array<Trail>>,
  'getTrailsInBounds' : ActorMethod<
    [{ 'east' : number, 'west' : number, 'south' : number, 'north' : number }],
    Array<Trail>
  >,
  'getUserstats' : ActorMethod<[string], [] | [UserStats]>,
  'mintTrackathonBadge' : ActorMethod<[string], Result_3>,
  'recordTrackathonPoint' : ActorMethod<[string, TrackathonPoint], Result_2>,
  'registerForTrackathon' : ActorMethod<[string], Result_2>,
  'savePoints' : ActorMethod<[Array<NewSavedPoint>], Result_1>,
  'searchPhotosByTags' : ActorMethod<[Array<string>], Array<Photo>>,
  'searchSpotsByTag' : ActorMethod<[string, bigint, bigint], Array<SpotV2>>,
  'searchTrails' : ActorMethod<[string], Array<Trail>>,
  'updateGroup' : ActorMethod<[string, NewGroup], Result_1>,
  'updateSpot' : ActorMethod<[string, NewSpot], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
