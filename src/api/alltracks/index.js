import { Actor, HttpAgent } from "@dfinity/agent";

// Imports and re-exports candid interface
import { idlFactory } from './backend.did.js';
export { idlFactory } from './backend.did.js';
// CANISTER_ID is replaced by webpack based on node environment
export const canisterId = "r6cnt-kyaaa-aaaal-aab3a-cai"

/**
 * 
 * @param {string | import("@dfinity/principal").Principal} canisterId Canister ID of Agent
 * @param {{agentOptions?: import("@dfinity/agent").HttpAgentOptions; actorOptions?: import("@dfinity/agent").ActorConfig}} [options]
 * @return {import("@dfinity/agent").ActorSubclass<import("./icevent.did.js")._SERVICE>}
 */
 export const createActor = (agent, actorOptions) => {
  //const agent = new HttpAgent({ ...options?.agentOptions });
  
  // Fetch root key for certificate validation during development
  // if(process.env.NODE_ENV !== "production") {
  //   agent.fetchRootKey().catch(err=>{
  //     console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
  //     console.error(err);
  //   });
  // }

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    actorOptions,
  });
};
  
/**
 * A ready-to-use agent for the hello canister
 * @type {import("@dfinity/agent").ActorSubclass<import("./hello.did.js")._SERVICE>}
 */
//  export const icevent = createActor(canisterId,{
//   agentOptions: {
//     host: "https://ic0.app",//process.env.NEXT_PUBLIC_IC_HOST,
//   },
// });