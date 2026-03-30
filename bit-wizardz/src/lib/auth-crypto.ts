import { storage } from './storage';

const KEY_STORAGE_NAME = 'auth-private-key';
const PUBLIC_KEY_STORAGE_NAME = 'auth-public-key'; // Store public key too for easy retrieval
const ALGORITHM_NAME = 'ECDSA';
const NAMED_CURVE = 'P-256';

// 1. Key Generation
export const generateKeypair = async (): Promise<CryptoKeyPair> => {
    // Check if keys already exist
    const storedPrivateKey = await storage.getItem<CryptoKey>(KEY_STORAGE_NAME);
    const storedPublicKey = await storage.getItem<CryptoKey>(PUBLIC_KEY_STORAGE_NAME);

    if (storedPrivateKey && storedPublicKey) {
        return { privateKey: storedPrivateKey, publicKey: storedPublicKey };
    }

    // Generate new pair
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: ALGORITHM_NAME,
            namedCurve: NAMED_CURVE,
        },
        false, // Private key non-extractable (secure)
        ['sign', 'verify']
    );

    // Persist keys
    await storage.setItem(KEY_STORAGE_NAME, keyPair.privateKey);
    await storage.setItem(PUBLIC_KEY_STORAGE_NAME, keyPair.publicKey);

    return keyPair;
};

// 2. Get Private Key (from storage)
export const getPrivateKey = async (): Promise<CryptoKey | null> => {
    return await storage.getItem<CryptoKey>(KEY_STORAGE_NAME);
};

// 3. Get Public Key (Exported as Base64 encdoed JWK)
export const getPublicKey = async (): Promise<string | null> => {
    let publicKey = await storage.getItem<CryptoKey>(PUBLIC_KEY_STORAGE_NAME);

    if (!publicKey) {
        // Try generating if missing
        const pair = await generateKeypair();
        publicKey = pair.publicKey;
    }

    try {
        // Export as JWK (JSON Web Key) as requested
        const exported = await window.crypto.subtle.exportKey('jwk', publicKey);
        // Convert JSON object to string, then Base64
        return btoa(JSON.stringify(exported));
    } catch (error) {
        console.error('Failed to export public key:', error);
        return null;
    }
};

// 3. Sign Challenge
export const signChallenge = async (challenge: string): Promise<string | null> => {
    const privateKey = await storage.getItem<CryptoKey>(KEY_STORAGE_NAME);

    if (!privateKey) {
        console.error('No private key found for signing');
        return null;
    }

    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(challenge);

        const signature = await window.crypto.subtle.sign(
            {
                name: ALGORITHM_NAME,
                hash: { name: 'SHA-256' },
            },
            privateKey,
            data
        );

        // Return signature as Base64
        const binary = String.fromCharCode(...new Uint8Array(signature));
        return btoa(binary);
    } catch (error) {
        console.error('Signing failed:', error);
        return null;
    }
};

// 4. Verify locally (Helper for testing)
export const verifySignatureLocally = async (challenge: string, signatureBase64: string): Promise<boolean> => {
    const publicKey = await storage.getItem<CryptoKey>(PUBLIC_KEY_STORAGE_NAME);
    if (!publicKey) return false;

    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(challenge);

        const signatureBinary = atob(signatureBase64);
        const signature = new Uint8Array(signatureBinary.length);
        for (let i = 0; i < signatureBinary.length; i++) {
            signature[i] = signatureBinary.charCodeAt(i);
        }

        return await window.crypto.subtle.verify(
            {
                name: ALGORITHM_NAME,
                hash: { name: 'SHA-256' },
            },
            publicKey,
            signature,
            data
        );
    } catch (error) {
        console.error('Verification failed:', error);
        return false;
    }
};
