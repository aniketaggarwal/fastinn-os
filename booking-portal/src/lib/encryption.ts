import { storage } from './storage';

const KEY_STORAGE_NAME = 'master-encryption-key';
const ALGORITHM = 'AES-GCM';
const FACE_STORE_PREFIX = 'face_record_';

// 1. Key Management
export const getEncryptionKey = async (): Promise<CryptoKey> => {
    try {
        const storedKeyJWK = await storage.getItem<JsonWebKey>(KEY_STORAGE_NAME);

        // Validate if it looks like a real JWK
        if (storedKeyJWK && storedKeyJWK.kty) {
            try {
                return await window.crypto.subtle.importKey(
                    'jwk',
                    storedKeyJWK,
                    { name: ALGORITHM, length: 256 },
                    false, // non-extractable
                    ['encrypt', 'decrypt']
                );
            } catch (importError) {
                console.warn('Stored key was found but invalid. Regenerating...', importError);
                // Fall through to regeneration
            }
        }

        console.log('Generating new master encryption key...');
        // Generate new key if none exists or import failed
        const newKey = await window.crypto.subtle.generateKey(
            { name: ALGORITHM, length: 256 },
            true, // extractable (MUST be true to save it as JWK)
            ['encrypt', 'decrypt']
        );

        const exportedKey = await window.crypto.subtle.exportKey('jwk', newKey);
        await storage.setItem(KEY_STORAGE_NAME, exportedKey);
        return newKey;

    } catch (error) {
        console.error('Key management error:', error);
        throw error;
    }
};

// 2. Converters (Binary <-> Base64)
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};

const float32ToUint8 = (float32: Float32Array): Uint8Array => {
    return new Uint8Array(float32.buffer, float32.byteOffset, float32.byteLength);
};

const uint8ToFloat32 = (uint8: Uint8Array): Float32Array => {
    const buffer = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
    return new Float32Array(buffer);
};

// 3. Types
interface EncryptedData {
    cipherText: ArrayBuffer;
    iv: Uint8Array;
}

// 4. Encrypt
export const encryptFaceData = async (descriptor: Float32Array): Promise<EncryptedData> => {
    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const data = float32ToUint8(descriptor);

    const cipherText = await window.crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        data as any
    );

    return { cipherText, iv };
};

// 5. Decrypt
export const decryptFaceData = async (encrypted: EncryptedData): Promise<Float32Array> => {
    const key = await getEncryptionKey();
    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: ALGORITHM, iv: encrypted.iv as any },
            key,
            encrypted.cipherText as any
        );
        return uint8ToFloat32(new Uint8Array(decryptedBuffer));
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt face data');
    }
};

// 6. Storage Helpers (Base64 Enforced)
interface StoredFaceRecord {
    name: string;
    encryptedData: {
        cipherText: string; // Base64
        iv: string;         // Base64
    };
    timestamp: number;
}

export const saveEncryptedEmbedding = async (name: string, descriptor: Float32Array) => {
    try {
        const encrypted = await encryptFaceData(descriptor);

        // Convert to Base64 for safe storage
        const record: StoredFaceRecord = {
            name,
            encryptedData: {
                cipherText: arrayBufferToBase64(encrypted.cipherText),
                iv: arrayBufferToBase64(encrypted.iv.buffer as any)
            },
            timestamp: Date.now(),
        };

        await storage.setItem(`${FACE_STORE_PREFIX}${name}`, record);
    } catch (error) {
        console.error(`[Encryption] Failed to save face for ${name}`, error);
        throw error;
    }
};

export const loadEncryptedEmbeddings = async (): Promise<{ name: string; descriptor: Float32Array }[]> => {
    const faces: { name: string; descriptor: Float32Array }[] = [];
    try {
        const keys = await storage.keys();
        for (const key of keys) {
            if (key.startsWith(FACE_STORE_PREFIX)) {
                try {
                    const value = await storage.getItem<StoredFaceRecord>(key);
                    if (!value) continue;

                    // Convert back from Base64
                    const encryptedObj = {
                        cipherText: base64ToArrayBuffer(value.encryptedData.cipherText),
                        iv: new Uint8Array(base64ToArrayBuffer(value.encryptedData.iv))
                    };

                    const descriptor = await decryptFaceData(encryptedObj);
                    faces.push({ name: value.name, descriptor });
                } catch (e) {
                    console.warn(`[Encryption] bad data in ${key} (wrong key?), deleting...`);
                    await storage.removeItem(key);
                }
            }
        }
    } catch (err) {
        console.error('[Encryption] Load error:', err);
    }

    return faces;
};

// 7. Emergency Clear
export const clearSecureStorage = async () => {
    console.warn('[Encryption] Wiping all secure data...');
    await storage.clear();
    console.log('[Encryption] Storage cleared.');
};
