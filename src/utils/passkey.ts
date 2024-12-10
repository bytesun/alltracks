import type { 
  PublicKeyCredential,
  AuthenticatorAttestationResponse 
} from '@simplewebauthn/types';

export async function createPasskey(username: string) {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  
  const createCredentialOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "AllTracks",
      id: window.location.hostname
    },
    user: {
      id: new Uint8Array(16),
      name: username,
      displayName: username
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 }
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required"
    }
  };

  const credential = await navigator.credentials.create({
    publicKey: createCredentialOptions
  }) as PublicKeyCredential;;

  return credential;
}
