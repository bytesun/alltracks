export async function deriveKey(credential: PublicKeyCredential): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(credential.id);
  
  const key = await window.crypto.subtle.importKey(
    "raw",
    keyMaterial,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(16),
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}