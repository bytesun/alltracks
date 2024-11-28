import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CheckPoint {
  'latitude' : number,
  'elevation' : number,
  'isIncident' : boolean,
  'note' : [] | [string],
  'createdBy' : Principal,
  'groupId' : [] | [string],
  'trackId' : string,
  'longitude' : number,
  'timestamp' : Time,
  'isPublic' : boolean,
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
  'badge' : [] | [string],
}
export interface NewCheckPoint {
  'latitude' : number,
  'elevation' : number,
  'isIncident' : boolean,
  'note' : [] | [string],
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
  'badge' : [] | [string],
}
export interface NewTrack {
  'id' : string,
  'duration' : number,
  'elevation' : number,
  'startime' : Time,
  'trackfile' : StorageFile,
  'name' : string,
  'description' : string,
  'groupId' : [] | [string],
  'length' : number,
  'isPublic' : boolean,
}
export interface NewTrail {
  'duration' : number,
  'ttype' : TrailType,
  'trailfile' : StorageFile,
  'difficulty' : Difficulty,
  'name' : string,
  'rate' : number,
  'tags' : Array<string>,
  'description' : string,
  'distance' : number,
  'elevationGain' : number,
  'photos' : Array<string>,
}
export interface Photo {
  'createdBy' : Principal,
  'tags' : Array<string>,
  'photoUrl' : string,
  'groupId' : [] | [string],
  'trackId' : string,
  'timestamp' : bigint,
}
export type Result = { 'ok' : bigint } |
  { 'err' : string };
export type Result_1 = { 'ok' : Trail } |
  { 'err' : string };
export type Result_2 = { 'ok' : Track } |
  { 'err' : string };
export type Result_3 = { 'ok' : Group } |
  { 'err' : string };
export interface StorageFile { 'url' : string, 'fileType' : string }
export type Time = bigint;
export interface Track {
  'id' : string,
  'duration' : number,
  'elevation' : number,
  'startime' : Time,
  'trackfile' : StorageFile,
  'name' : string,
  'createdBy' : Principal,
  'description' : string,
  'groupId' : [] | [string],
  'length' : number,
  'isPublic' : boolean,
}
export type TrackFilter = { 'user' : Principal } |
  { 'group' : string };
export interface Trail {
  'id' : bigint,
  'duration' : number,
  'ttype' : TrailType,
  'trailfile' : StorageFile,
  'difficulty' : Difficulty,
  'name' : string,
  'createdAt' : Time,
  'createdBy' : Principal,
  'rate' : number,
  'tags' : Array<string>,
  'description' : string,
  'distance' : number,
  'elevationGain' : number,
  'photos' : Array<string>,
}
export type TrailFilter = { 'ttype' : TrailType } |
  { 'difficulty' : Difficulty };
export type TrailType = { 'tloop' : null } |
  { 'outandback' : null } |
  { 'pointto' : null };
export interface UserStats {
  'totalHours' : number,
  'firstHikeDate' : Time,
  'completedTrails' : bigint,
  'totalDistance' : number,
  'hikerId' : Principal,
  'totalElevation' : number,
}
export interface _SERVICE {
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
    Result
  >,
  'createCheckpoint' : ActorMethod<[NewCheckPoint], Result>,
  'createGroup' : ActorMethod<[NewGroup], Result_3>,
  'createTrack' : ActorMethod<[NewTrack], Result_2>,
  'createTrail' : ActorMethod<[NewTrail], Result_1>,
  'getCheckPointsByTrackId' : ActorMethod<[string], Array<CheckPoint>>,
  'getCheckpoints' : ActorMethod<
    [CheckpointFilter, Time, Time],
    Array<CheckPoint>
  >,
  'getGroup' : ActorMethod<[string], [] | [Group]>,
  'getGroupPhotos' : ActorMethod<[string, Time, Time], Array<Photo>>,
  'getMyGroups' : ActorMethod<[], Array<Group>>,
  'getMyPhotos' : ActorMethod<[Time, Time], Array<Photo>>,
  'getMyTrails' : ActorMethod<[], Array<Trail>>,
  'getTrack' : ActorMethod<[string], [] | [Track]>,
  'getTrackPhotos' : ActorMethod<[string, Time, Time], Array<Photo>>,
  'getTracks' : ActorMethod<[TrackFilter], Array<Track>>,
  'getTrail' : ActorMethod<[bigint], [] | [Trail]>,
  'getTrails' : ActorMethod<[TrailFilter], Array<Trail>>,
  'getUserstats' : ActorMethod<[Principal], [] | [UserStats]>,
  'searchPhotosByTags' : ActorMethod<[Array<string>], Array<Photo>>,
  'searchTrails' : ActorMethod<[string], Array<Trail>>,
  'updateGroup' : ActorMethod<[string, NewGroup], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
