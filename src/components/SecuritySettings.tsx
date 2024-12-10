import React, { useState, useEffect } from 'react';
import { createPasskey } from '../utils/passkey';
import { createEncryptedWallet, decryptWallet } from '../utils/wallet';
import { useNotification } from '../context/NotificationContext';
import { useGlobalContext, useAlltracks, useSetWallet } from '../components/Store';
import { deriveKey } from '../utils/crypto';
import { UserCredential } from '../api/alltracks/backend.did.d';
import { Result } from '../api/alltracks/backend.did.d';
import { bufferToBase64url, base64ToBuffer } from '../utils/base64';
import { arweave, arweaveExplore } from '../utils/arweave';

import '../styles/SecuritySettings.css';

export const SecuritySettings: React.FC = () => {

    const { state: { principal, wallet } } = useGlobalContext();
    const setWallet = useSetWallet();
    const [hasArweaveWallet, setHasArweaveWallet] = useState(false);
    const alltracks = useAlltracks();
    const [walletInfo, setWalletInfo] = useState<{
        address: string;
        balance: string;
    } | null>(null);

    const { showNotification } = useNotification();

    useEffect(() => {
        if (!wallet) {
            handleDecryptWallet();
        } else {
            retrieveWallet(wallet)
        }
    }, [wallet]);

    const retrieveWallet = async (strwallet) => {
        const address = await arweave.wallets.jwkToAddress(strwallet);
        const balance = await arweave.wallets.getBalance(address);

        setWalletInfo({
            address,
            balance: arweave.ar.winstonToAr(balance)
        });
    };

    const handleCreateWallet = async () => {
        try {
            const credential = await createPasskey(principal.toText());
            if (credential) {

                const response = credential.response as AuthenticatorAttestationResponse;
                // const credentialId = credential.rawId;/
                const credentialId = bufferToBase64url(credential.rawId);
                const publicKey = response.getPublicKey();
                // console.log('Credential rawId:', credential.rawId);
                const symmetricKey = await deriveKey(credential);
                // console.log('Symmetric key:', symmetricKey);
                const encrypted = await createEncryptedWallet(symmetricKey);
                // console.log('Encrypted wallet:', encrypted);

                showNotification('Wallet created successfully', 'success');
                //save to backend
                const userCredential: UserCredential = {
                    credentialId: credentialId,
                    publicKey: publicKey.toString(),
                    createdAt: BigInt(new Date().getTime()),
                    encryptedWallet: encrypted
                };
                // console.log('UserCredential:', userCredential);
                const result: Result = await alltracks.createUserCredential(userCredential);

                if ('ok' in result) {
                    showNotification('Wallet saved successfully', 'success');
                    handleDecryptWallet();
                } else {
                    showNotification('Failed to save wallet' + result.err, 'error');
                }

            }
        } catch (error) {
            console.error('Wallet creation failed:', error);
            showNotification('Failed to create wallet', 'error');
        }
    };

    const handleDecryptWallet = async () => {
        try {
            const [cred] = await alltracks.getMyCredential();
            if (cred) {
                setHasArweaveWallet(true);
                const userCredential: UserCredential = cred;

                const base64 = userCredential.credentialId.replace(/-/g, '+').replace(/_/g, '/');

                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge: new Uint8Array(32),
                        rpId: window.location.hostname,
                        allowCredentials: [{
                            id: base64ToBuffer(base64),
                            type: 'public-key'
                        }]
                    }
                }) as PublicKeyCredential;

                const symmetricKey = await deriveKey(assertion);
                const encrypted = {
                    iv: Array.from(userCredential.encryptedWallet.iv),
                    data: Array.from(userCredential.encryptedWallet.data)
                };
                const decrypted = await decryptWallet(encrypted, symmetricKey);
                setWallet(decrypted);

            } else {
                showNotification('no wallet found', 'info');
            }

        } catch (error) {
            console.error('Decryption failed:', error);
        }
    };


    return (


        <div className="setting-section">
            <h4>Storage Wallet</h4>
            {walletInfo && (
                <div className="wallet-info">
                    <p>Address: <a
                        href={`${arweaveExplore}/address/${walletInfo.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {walletInfo.address}
                    </a></p>
                    <p>Balance: {walletInfo.balance} AR</p>
                </div>
            )}
            <div className="setting-row">

                {!wallet && <button
                    onClick={handleCreateWallet}
                >
                    Create Wallet
                </button>}

            </div>
        </div>

    );
};
