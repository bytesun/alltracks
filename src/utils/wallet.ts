import { arweave } from './arweave';

export async function createEncryptedWallet(symmetricKey: CryptoKey) {
  const wallet = await arweave.wallets.generate();
  const walletStr = JSON.stringify(wallet);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(walletStr);
  
  const encryptedWallet = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    symmetricKey,
    encoded
  );
  
  // Return both IV and encrypted data
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encryptedWallet))
  };
}

export async function decryptWallet(
    encryptedData: { iv: number[], data: number[] },
    symmetricKey: CryptoKey
  ) {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(encryptedData.iv)
      },
      symmetricKey,
      new Uint8Array(encryptedData.data)
    );
    
    const walletStr = new TextDecoder().decode(decrypted);
    return JSON.parse(walletStr);
  }
  