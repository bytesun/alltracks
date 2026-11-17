import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Action = { found: null } | { carried: null } | { left: null };
export interface CheckinInput {
  latitude: number;
  longitude: number;
  accuracyMeters: [] | [bigint];
  action: Action;
  note: string;
}
export interface Checkin {
  id: bigint;
  objectId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: [] | [bigint];
  action: Action;
  note: string;
  createdAt: bigint;
}
export type SubmitResult = { ok: Checkin } | { err: string };
export interface _SERVICE {
  getCheckins: ActorMethod<[string], Checkin[]>;
  addCheckin: ActorMethod<[string, CheckinInput], SubmitResult>;
}
export declare const idlFactory: IDL.InterfaceFactory;
