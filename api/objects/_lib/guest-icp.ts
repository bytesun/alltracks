import { Actor, HttpAgent } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import type { GuestInput } from './guest-security.js';

// IMPORTANT: this interface is a PROPOSED extension of the EXISTING AllTracks
// Motoko canister, not a claim that its currently-deployed version supports it.
// Never fall back to createCheckpoint or any generic authenticated write method.
const idlFactory = ({ IDL }: { IDL: any }) => {
  const action = IDL.Variant({ found: IDL.Null, carried: IDL.Null, left: IDL.Null });
  const input = IDL.Record({
    objectId: IDL.Text,
    latitude: IDL.Float64,
    longitude: IDL.Float64,
    accuracyMeters: IDL.Nat,
    action,
    note: IDL.Text,
    requestId: IDL.Text,
  });
  const err = IDL.Variant({
    unauthorized: IDL.Null,
    notFound: IDL.Null,
    disabled: IDL.Null,
    invalid: IDL.Null,
    duplicate: IDL.Null,
    rateLimited: IDL.Null,
  });
  return IDL.Service({
    submitGuestCheckin: IDL.Func([input], [IDL.Variant({ ok: IDL.Nat, err })], []),
  });
};
type GuestResult = { ok: bigint } | { err: {
  unauthorized?: null; notFound?: null; disabled?: null;
  invalid?: null; duplicate?: null; rateLimited?: null;
} };

export async function writeGuestCheckinToExistingCanister(
  input: GuestInput,
  secretJson: string,
  canisterId: string,
): Promise<GuestResult> {
  if (canisterId !== 'r6cnt-kyaaa-aaaal-aab3a-cai') {
    throw new Error('Refusing a non-AllTracks destination');
  }
  // Secret is injected at runtime by the server, NEVER by Vite or GitHub.
  const identity = Ed25519KeyIdentity.fromJSON(secretJson);
  const agent = new HttpAgent({ identity, host: 'https://ic0.app' });
  const service = Actor.createActor<{ submitGuestCheckin(input: {
    objectId: string; latitude: number; longitude: number;
    accuracyMeters: bigint; action: { found: null } | { carried: null } | { left: null };
    note: string; requestId: string;
  }): Promise<GuestResult> }>(idlFactory, { agent, canisterId });
  return service.submitGuestCheckin({
    objectId: input.objectId,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: BigInt(input.accuracyMeters),
    action: { [input.action]: null } as { found: null } | { carried: null } | { left: null },
    note: input.note,
    requestId: input.requestId,
  });
}
