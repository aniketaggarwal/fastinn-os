'use client';

import { useState, useEffect } from 'react';
import { generateKeypair, getPublicKey, signChallenge, verifySignatureLocally } from '@/lib/auth-crypto';

export default function AuthKeyManager() {
    const [publicKey, setPublicKey] = useState<string>('');
    const [testSignature, setTestSignature] = useState<string>('');
    const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

    useEffect(() => {
        // Initialize keys on load
        generateKeypair().then(() => {
            getPublicKey().then(key => setPublicKey(key || ''));
        });
    }, []);

    // Auto-Sync Effect
    useEffect(() => {
        if (publicKey && syncStatus === 'idle') {
            const syncDevice = async () => {
                setSyncStatus('syncing');
                try {
                    const res = await fetch('/api/devices/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ publicKey, name: 'Admin Dashboard' })
                    });
                    const data = await res.json();
                    if (data.success) {
                        setSyncStatus('synced');
                    } else {
                        console.error('Sync failed:', data.error);
                        setSyncStatus('error');
                    }
                } catch (e) {
                    console.error('Network error during sync', e);
                    setSyncStatus('error');
                }
            };
            syncDevice();
        }
    }, [publicKey, syncStatus]);

    const handleTestSign = async () => {
        const challenge = `test-challenge-${Date.now()}`;
        const sig = await signChallenge(challenge);
        if (sig) {
            setTestSignature(sig);
            // Verify immediately
            const isValid = await verifySignatureLocally(challenge, sig);
            setVerificationResult(isValid);
        }
    };

    return (
        <div className="flex flex-col gap-4 text-slate-200">
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-400">Device Identity Key</label>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${syncStatus === 'synced' ? 'bg-green-900/30 text-green-400 border-green-500/30' :
                        syncStatus === 'syncing' ? 'bg-blue-900/30 text-blue-400 border-blue-500/30 animate-pulse' :
                            'bg-red-900/30 text-red-400 border-red-500/30'
                        }`}>
                        {syncStatus === 'synced' ? '✅ CLOUD SYNCED' :
                            syncStatus === 'syncing' ? '🔄 SYNCING...' : '⚠️ SYNC REQUIRED'}
                    </span>
                </div>
                <div className="mt-1 flex gap-2">
                    <code className="block w-full p-3 bg-slate-950 text-green-400 rounded-lg text-xs break-all border border-slate-700 font-mono shadow-inner">
                        {publicKey || 'Generating Secure Identity...'}
                    </code>
                    <button
                        onClick={() => { navigator.clipboard.writeText(publicKey); alert('Copied!'); }}
                        className="px-4 py-1 bg-slate-700 rounded-lg hover:bg-slate-600 text-xs font-bold text-slate-300 border border-slate-600 transition-colors"
                    >
                        COPY
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    This cryptographic key uniquely identifies this browser session to the server.
                </p>
            </div>

            {/* Manual Sync Retry (Only if error) */}
            {syncStatus === 'error' && (
                <div className="border-t border-slate-700 pt-4">
                    <button
                        onClick={() => setSyncStatus('idle')}
                        className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-bold shadow-lg"
                    >
                        Retry Cloud Sync
                    </button>
                </div>
            )}

            <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-2">Test Signing</h3>
                <button
                    onClick={handleTestSign}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                    Sign & Verify Test Challenge
                </button>

                {testSignature && (
                    <div className="mt-2 text-sm">
                        <p><strong>Signature:</strong> <span className="font-mono text-xs">{testSignature.substring(0, 50)}...</span></p>
                        <p className={verificationResult ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            Verification: {verificationResult ? "VALID ✅" : "INVALID ❌"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
