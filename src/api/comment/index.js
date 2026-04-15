import { Actor } from "@dfinity/agent";

import { idlFactory } from './comment.did.js';
export { idlFactory } from './comment.did.js';

export const canisterId = "pxu6k-jaaaa-aaaap-aaamq-cai";

/**
 * @param {import("@dfinity/agent").HttpAgent} agent
 * @param {{actorOptions?: import("@dfinity/agent").ActorConfig}} [options]
 * @return {import("@dfinity/agent").ActorSubclass<import("./comment.did.js")._SERVICE>}
 */
export const createActor = (agent, options) => {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options?.actorOptions,
  });
};
