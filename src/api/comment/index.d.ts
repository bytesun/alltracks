import type { ActorSubclass, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import type { _SERVICE } from './comment.did';

export declare const idlFactory: IDL.InterfaceFactory;
export declare const canisterId: string;

export declare const createActor: (
  agent: HttpAgent,
  options?: { actorOptions?: import("@dfinity/agent").ActorConfig }
) => ActorSubclass<_SERVICE>;
