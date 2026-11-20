import { Actor, type ActorSubclass, type HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import type { AuthorizedStorageActor } from './iceStorageActorTransport';

export const ICESTORAGE_BACKEND_CANISTER_ID = '5pqgi-saaaa-aaaal-aaavq-cai';

/**
 * Only the four upload methods are declared. Their Candid signatures must
 * stay in sync with ICEvent/icestorage/src/declarations/backend/backend.did.
 */
const idlFactory: ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => IDL.ServiceClass =
  ({ IDL }) => {
    const ResourceError = IDL.Variant({
      alreadyExists: IDL.Null,
      conflict: IDL.Record({ currentRevision: IDL.Nat64 }),
      forbidden: IDL.Null,
      internal: IDL.Text,
      invalid: IDL.Text,
      notFound: IDL.Null,
    });
    const Status = IDL.Variant({
      aborted: IDL.Null,
      complete: IDL.Null,
      uploading: IDL.Null,
    });
    const Session = IDL.Record({
      chunkCount: IDL.Nat,
      clientRequestId: IDL.Opt(IDL.Text),
      completedAt: IDL.Opt(IDL.Int),
      createdAt: IDL.Int,
      mimeType: IDL.Text,
      objectId: IDL.Text,
      sessionId: IDL.Text,
      sha256: IDL.Opt(IDL.Vec(IDL.Nat8)),
      size: IDL.Nat,
      status: Status,
    });
    const UploadRequest = IDL.Record({
      clientRequestId: IDL.Opt(IDL.Text),
      fileName: IDL.Opt(IDL.Text),
      mimeType: IDL.Text,
      sha256: IDL.Opt(IDL.Vec(IDL.Nat8)),
      size: IDL.Nat,
    });
    const SessionResult = IDL.Variant({ err: ResourceError, ok: Session });
    const UnitResult = IDL.Variant({ err: ResourceError, ok: IDL.Null });
    return IDL.Service({
      beginAuthorizedObjectUpload: IDL.Func([IDL.Text, UploadRequest], [SessionResult], []),
      uploadObjectChunk: IDL.Func([IDL.Text, IDL.Nat, IDL.Vec(IDL.Nat8)], [UnitResult], []),
      finalizeObjectUpload: IDL.Func([IDL.Text], [SessionResult], []),
      abortObjectUpload: IDL.Func([IDL.Text], [UnitResult], []),
    });
  };

/**
 * Pass the same authenticated HttpAgent used by the Alltracks Backend actor.
 * Do not construct an anonymous agent or expose a project secret here.
 */
export function createIceStorageUploadActor(agent: HttpAgent): AuthorizedStorageActor {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: ICESTORAGE_BACKEND_CANISTER_ID,
  }) as unknown as ActorSubclass<AuthorizedStorageActor>;
}
