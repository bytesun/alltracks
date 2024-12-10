export interface UserCredential {
  credentialId: string;    // Base64 encoded rawId
  publicKey: string;       // For verification
  createdAt: BigInt;
  encryptedWallet: {      // Optional for users without wallet
    iv: number[];         // Initialization vector
    data: number[];       // Encrypted wallet data
  };
}
