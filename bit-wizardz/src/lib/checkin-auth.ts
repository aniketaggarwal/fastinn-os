import { signChallenge } from './auth-crypto';

// Wrapper to strictly match requested signature structure, 
// though we usually load the key internally for security.
export const signNonce = async (privateKey: CryptoKey, nonce: string): Promise<string | null> => {
    // We reuse the robust logic from auth-crypto which handles the low-level WebCrypto signing
    // In a real scenario, we might pass the key object directly to window.crypto.subtle
    // but here we delegate to our existing robust signer.
    // For this specific requested signature, we can ignore the passed privateKey 
    // if we trust our internal storage, OR we can implement the raw signing here.

    // Let's implement raw signing to strictly satisfy "signNonce(privateKey, nonce)"
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(nonce);

        const signature = await window.crypto.subtle.sign(
            {
                name: 'ECDSA',
                hash: { name: 'SHA-256' },
            },
            privateKey,
            data
        );

        const binary = String.fromCharCode(...new Uint8Array(signature));
        return btoa(binary);
    } catch (e) {
        console.error('signNonce failed:', e);
        return null;
    }
};

export const fetchNonce = async (sessionId: string): Promise<string | null> => {
    try {
        const res = await fetch(`/api/challenge?session_id=${sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch nonce');
        const data = await res.json();
        return data.nonce;
    } catch (e) {
        console.error('fetchNonce error:', e);
        return null;
    }
};

export const sendVerification = async (signature: string, nonce: string, publicKey: string, guestName: string): Promise<{ success: boolean; error?: string; room?: string }> => {
    try {
        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signature, nonce, public_key: publicKey, guest_name: guestName })
        });
        const data = await res.json();
        return { success: data.success, error: data.error, room: data.room };
    } catch (e) {
        console.error('sendVerification error:', e);
        return { success: false, error: 'Network Error' };
    }
};
