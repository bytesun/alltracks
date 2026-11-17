import { Actor, HttpAgent } from '@dfinity/agent';
import type { ActorMethod, ActorSubclass } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

export interface CheckInLocation {
  id: bigint;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  createdBy: Principal;
  createdAt: bigint;
  active: boolean;
}

export interface CheckInEntry {
  id: bigint;
  locationId: bigint;
  name: string;
  note: string;
  createdAt: bigint;
  createdBy: [] | [Principal];
}

export type CheckInResult<T> = { ok: T } | { err: string };

export interface CheckInService {
  createLocation: ActorMethod<[string, string, number, number], CheckInResult<CheckInLocation>>;
  getLocation: ActorMethod<[bigint], [] | [CheckInLocation]>;
  listLocations: ActorMethod<[bigint, bigint], CheckInLocation[]>;
  setLocationActive: ActorMethod<[bigint, boolean], CheckInResult<CheckInLocation>>;
  checkIn: ActorMethod<[bigint, string, string], CheckInResult<CheckInEntry>>;
  listCheckIns: ActorMethod<[bigint, bigint, bigint], CheckInEntry[]>;
  removeCheckIn: ActorMethod<[bigint], CheckInResult<boolean>>;
}

const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const Location = IDL.Record({
    id: IDL.Nat,
    name: IDL.Text,
    description: IDL.Text,
    latitude: IDL.Float64,
    longitude: IDL.Float64,
    createdBy: IDL.Principal,
    createdAt: IDL.Int,
    active: IDL.Bool,
  });
  const CheckIn = IDL.Record({
    id: IDL.Nat,
    locationId: IDL.Nat,
    name: IDL.Text,
    note: IDL.Text,
    createdAt: IDL.Int,
    createdBy: IDL.Opt(IDL.Principal),
  });
  const result = (ok: IDL.Type) => IDL.Variant({ ok, err: IDL.Text });
  return IDL.Service({
    createLocation: IDL.Func([IDL.Text, IDL.Text, IDL.Float64, IDL.Float64], [result(Location)], []),
    getLocation: IDL.Func([IDL.Nat], [IDL.Opt(Location)], ['query']),
    listLocations: IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(Location)], ['query']),
    setLocationActive: IDL.Func([IDL.Nat, IDL.Bool], [result(Location)], []),
    checkIn: IDL.Func([IDL.Nat, IDL.Text, IDL.Text], [result(CheckIn)], []),
    listCheckIns: IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat], [IDL.Vec(CheckIn)], ['query']),
    removeCheckIn: IDL.Func([IDL.Nat], [result(IDL.Bool)], []),
  });
};

// Must point to the deployed QR check-in canister; no temporary/local-browser storage.
export const checkInCanisterId = import.meta.env.VITE_CHECKIN_CANISTER_ID?.trim() || '';

export function createCheckInActor(agent: HttpAgent): ActorSubclass<CheckInService> | null {
  if (!checkInCanisterId) return null;
  return Actor.createActor<CheckInService>(idlFactory, {
    agent,
    canisterId: checkInCanisterId,
  });
}

export const checkInDate = (nanos: bigint): string =>
  new Date(Number(nanos / 1_000_000n)).toLocaleString();
