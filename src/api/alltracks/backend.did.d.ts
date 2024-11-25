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
export type Result = { 'ok' : bigint } |
  { 'err' : string };
export type Time = bigint;
export interface UserStats {
  'totalHours' : number,
  'firstHikeDate' : Time,
  'completedTrails' : bigint,
  'totalDistance' : number,
  'hikerId' : Principal,
  'totalElevation' : number,
}
export interface _SERVICE {
  'createCheckpoint' : ActorMethod<[NewCheckPoint], CheckPoint>,
  'createGroup' : ActorMethod<[NewGroup], Result>,
  'getCheckpoints' : ActorMethod<[CheckpointFilter], Array<CheckPoint>>,
  'getGroup' : ActorMethod<[string], [] | [Group]>,
  'getMyGroups' : ActorMethod<[], Array<Group>>,
  'getUserstats' : ActorMethod<[Principal], [] | [UserStats]>,
  'updateGroup' : ActorMethod<[string, NewGroup], Result>,
  'updateUserStats' : ActorMethod<[number, number, number], UserStats>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
