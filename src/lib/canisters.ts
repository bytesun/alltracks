import { HttpAgent } from "@dfinity/agent";

export const HOST =
  "https://ic0.app";

export const IDENTITY_PROVIDER = 'https://identity.ic0.app';
export const IDENTITY_PROVIDER_v2 = 'https://id.ai';

export const defaultAgent = new HttpAgent({
  host: HOST,
});

