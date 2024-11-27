import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CheckPoint {
  'latitude' : number,
  'elevation' : number,
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
  { 'groupId' : string } |
  { 'trackId' : string };
export type Difficulty = { 'easy' : null } |
  { 'hard' : null } |
  { 'extreme' : null } |
  { 'medium' : null };
export interface Group {
  'id' : string,
  'members' : Array<Principal>,
  'admin' : Principal,
  'name' : string,
  'createdAt' : Time,
  'createdBy' : Principal,
  'description' : string,
}
export interface NewCheckPoint {
  'latitude' : number,
  'elevation' : number,
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
}
export interface NewTrack {
  'id' : string,
  'duration' : number,
  'elevation' : number,
  'startime' : Time,
  'trackfile' : string,
  'name' : string,
  'description' : string,
  'groupId' : [] | [string],
  'length' : number,
  'isPublic' : boolean,
}
export interface NewTrail {
  'duration' : number,
  'ttype' : TrailType,
  'trailfile' : string,
  'difficulty' : Difficulty,
  'name' : string,
  'rate' : number,
  'tags' : Array<string>,
  'description' : string,
  'distance' : number,
  'elevationGain' : number,
  'photos' : Array<string>,
}
export type Result = { 'ok' : bigint } |
  { 'err' : string };
export type Result_1 = { 'ok' : Trail } |
  { 'err' : string };
export type Result_2 = { 'ok' : Track } |
  { 'err' : string };
export type Result_3 = { 'ok' : Group } |
  { 'err' : string };
export type Time = bigint;
export interface Track {
  'id' : string,
  'duration' : number,
  'elevation' : number,
  'startime' : Time,
  'trackfile' : string,
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
  'trailfile' : string,
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
  'createCheckpoint' : ActorMethod<[NewCheckPoint], Result>,
  'createGroup' : ActorMethod<[NewGroup], Result_3>,
  'createTrack' : ActorMethod<[NewTrack], Result_2>,
  'createTrail' : ActorMethod<[NewTrail], Result_1>,
  'getCheckpoints' : ActorMethod<[CheckpointFilter], Array<CheckPoint>>,
  'getGroup' : ActorMethod<[string], [] | [Group]>,
  'getMyGroups' : ActorMethod<[], Array<Group>>,
  'getTrack' : ActorMethod<[string], [] | [Track]>,
  'getTracks' : ActorMethod<[TrackFilter], Array<Track>>,
  'getTrail' : ActorMethod<[bigint], [] | [Trail]>,
  'getTrails' : ActorMethod<[TrailFilter], Array<Trail>>,
  'getUserstats' : ActorMethod<[Principal], [] | [UserStats]>,
  'searchTrails' : ActorMethod<[string], Array<Trail>>,
  'updateGroup' : ActorMethod<[string, NewGroup], Result>,
  'updateUserStats' : ActorMethod<[number, number, number], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
