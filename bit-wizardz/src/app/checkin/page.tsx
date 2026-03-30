'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import FaceScanner from '@/components/FaceScanner';
import QrCodeScanner from '@/components/QrCodeScanner';
import { loadEncryptedEmbeddings } from '@/lib/encryption';
import { verifyFaceMatch } from '@/lib/face-util';
import { getPrivateKey, getPublicKey } from '@/lib/auth-crypto';
import { signNonce, sendVerification } from '@/lib/checkin-auth';
import '../login.css';
import '../page-shell.css';

interface RegisteredFace {
    name: string;
    descriptor: Float32Array;
}

function CheckInContent() {
    const router = useRouter();
    const searchParams = useSearchParams(); // Hook to read URL params

    // Standard State
    const [targetFace, setTargetFace] = useState<RegisteredFace | null>(null);

    // Secure Check-in flow state
    const [checkinStep, setCheckinStep] = useState<'scan-qr' | 'scan-face' | 'verifying-server' | 'complete'>('scan-qr');
    const [nonce, setNonce] = useState('');
    const [matchedName, setMatchedName] = useState('');
    const [allocatedRoom, setAllocatedRoom] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

    useEffect(() => {
        // Auto-Check Nonce from URL
        const urlNonce = searchParams.get('nonce');
        if (urlNonce) {
            setNonce(urlNonce);
            // Small timeout to allow state update before "scanning"
            setTimeout(() => {
                handleQrScan(urlNonce);
            }, 500);
        }
    }, [searchParams]);

    // 1. Simulate QR Scan (Enter Nonce)
    const handleQrScan = async (overrideNonce?: string) => {
        const currentNonce = overrideNonce || nonce;
        if (!currentNonce) {
            alert('Enter a Session Nonce (QR Code)');
            return;
        }

        try {
            // Securely ask the server for the face descriptor linked to this session
            const res = await fetch('/api/admin/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer 1670` },
                body: JSON.stringify({ action: 'get_face_descriptor', nonce: currentNonce })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(`Error: ${data.error}`);
                return;
            }

            // Convert array back to Float32Array
            setTargetFace({
                name: data.name,
                descriptor: new Float32Array(data.descriptor)
            });
            if (data.room) setAllocatedRoom(data.room);

            setCheckinStep('scan-face');
        } catch (e) {
            alert('Failed to connect to server');
        }
    };

    // 2. Face Scanned -> Verify -> Sign -> Send
    const handleFaceScan = async (liveDescriptor: Float32Array) => {
        if (!targetFace) return;

        // A. Verify Face locally
        const isMatch = await verifyFaceMatch(targetFace.descriptor, liveDescriptor, 0.45);

        if (!isMatch) {
            setVerificationStatus('failed');
            setTimeout(() => setVerificationStatus('scanning'), 2000);
            return;
        }

        setMatchedName(targetFace.name);
        setVerificationStatus('success'); // Found local match
        setCheckinStep('verifying-server');

        // B. Sign & Send to Server
        try {
            // Fetch Public Key FIRST to ensure if regeneration happens, we get the fresh Private Key after.
            const publicKey = await getPublicKey();
            const privateKey = await getPrivateKey();

            if (!privateKey || !publicKey) {
                alert('Device keys missing! Go to Dashboard -> Auth.');
                setCheckinStep('scan-face'); // Go back
                return;
            }

            const signature = await signNonce(privateKey, nonce);

            if (signature) {
                const { success, error, room } = await sendVerification(signature, nonce, publicKey, targetFace.name);
                if (success) {
                    // Success!
                    // Save Guest Session locally
                    if (room || allocatedRoom) {
                        localStorage.setItem('guest_room', room || allocatedRoom || '');
                        setAllocatedRoom(room || allocatedRoom); // Keep state just in case
                    }
                    localStorage.setItem('guest_name', targetFace!.name);
                    localStorage.setItem('guest_session', nonce);

                    setCheckinStep('complete');

                    // Redirect to Guest Home
                    setTimeout(() => {
                        window.location.href = '/guest';
                    }, 1500);

                } else {
                    alert(`❌ Verification Failed: ${error || 'Server rejected signature'}`);
                    setCheckinStep('scan-face');
                }
            } else {
                alert('Signing failed.');
                setCheckinStep('scan-face');
            }
        } catch (e) {
            console.error(e);
            alert('Error during secure verification.');
            setCheckinStep('scan-face');
        }
    };

    return (
        <main className="fi-page" style={{ color: '#e6eef8', overflow: 'hidden' }}>
            <header className="top-header">
                <div style={{ width: 120, display: 'flex', alignItems: 'center', paddingLeft: 20 }}>
                    <button className="fi-navbar__back" onClick={() => router.back()}>← Back</button>
                </div>
                <div className="header-brand">FastInn</div>
                <div style={{ flex: 1 }} />
                <div style={{ width: 120 }} />
            </header>

            <div className="w-full flex items-center justify-center" style={{ padding: '3.5rem 1rem' }}>
                <div style={{ width: '100%', maxWidth: 1100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Secure Check-in</h1>
                        <BackButton />
                    </div>

                    {/* Step cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 18 }}>
                        {/* QR Card */}
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: 18, borderRadius: 12, boxShadow: '0 10px 30px rgba(2,6,23,0.4)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: checkinStep === 'scan-qr' ? 12 : 0 }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>1. Scan Booking QR</div>
                                    <div style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>Scan the QR or enter the session ID provided at the hotel desk.</div>
                                </div>
                                <div>
                                    {checkinStep !== 'scan-qr' && (
                                        <button
                                            onClick={() => setCheckinStep('scan-qr')}
                                            style={{ background: '#ffffff', color: '#000', padding: '10px 14px', borderRadius: 10, fontWeight: 800 }}
                                        >
                                            Scan
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Scanner / Input Area */}
                            {checkinStep === 'scan-qr' && (
                                <div className="flex flex-col gap-4 animate-fade-in mt-4">
                                    {/* Option A: Scanner */}
                                    <div className="bg-black rounded-xl overflow-hidden shadow-2xl mx-auto w-full max-w-sm relative">
                                        <QrCodeScanner
                                            onScanSuccess={(decodedText: string) => {
                                                console.log("QR Scanned:", decodedText);

                                                // Extract Nonce if it's a URL
                                                let finalId = decodedText;
                                                try {
                                                    const url = new URL(decodedText);
                                                    const pid = url.searchParams.get('nonce');
                                                    if (pid) finalId = pid;
                                                } catch (e) {
                                                    // Not a URL, use as is
                                                }

                                                setNonce(finalId);
                                                // Slight delay to show success state before transition
                                                setTimeout(() => handleQrScan(finalId), 300);
                                            }}
                                            onScanFailure={(err: any) => {
                                                // console.warn(err); 
                                            }}
                                        />
                                        {/* Scan Success Overlay */}
                                        {nonce && (
                                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center animate-in fade-in duration-200 z-10">
                                                <div className="text-4xl">✨</div>
                                                <p className="text-white font-bold mt-2">QR Detected!</p>
                                                <div className="animate-spin h-5 w-5 border-2 border-green-500 rounded-full border-t-transparent mt-4"></div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 my-2">
                                        <div className="h-px bg-slate-700 flex-1"></div>
                                        <span className="text-slate-500 text-xs font-bold uppercase">Or Enter Manually</span>
                                        <div className="h-px bg-slate-700 flex-1"></div>
                                    </div>

                                    {/* Option B: Manual Input */}
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nonce (e.g. FASTINN-XYZ)"
                                            className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 outline-none font-mono text-sm"
                                            value={nonce}
                                            onChange={e => setNonce(e.target.value)}
                                        />
                                        <button
                                            onClick={() => handleQrScan()}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-500"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Face Card */}
                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, boxShadow: '0 10px 30px rgba(2,6,23,0.35)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>2. Webcam Face Scan</div>
                                    <div style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>Position your face in the frame and follow the on-screen guidance.</div>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setCheckinStep('scan-face')}
                                        style={checkinStep === 'scan-face' ? { background: '#000', color: '#fff', padding: '10px 14px', borderRadius: 10, fontWeight: 800 } : { background: '#ffffff', color: '#000', padding: '10px 14px', borderRadius: 10, fontWeight: 800 }}
                                    >
                                        {checkinStep === 'scan-face' ? 'Start Scan' : 'Open'}
                                    </button>
                                </div>
                            </div>

                            {checkinStep === 'scan-face' && (
                                <div style={{ marginTop: 12 }}>
                                    <FaceScanner onScan={handleFaceScan} />
                                    <p style={{ marginTop: 8, fontWeight: 700, textAlign: 'center' }}>{verificationStatus === 'success' ? `Hello, ${matchedName}!` : 'Look at the camera...'}</p>
                                </div>
                            )}
                        </div>

                        {/* Finalize Card */}
                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, boxShadow: '0 10px 30px rgba(2,6,23,0.32)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>3. Finalize</div>
                                    <div style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>After successful scan, we process verification and provide your room key.</div>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setCheckinStep('verifying-server')}
                                        style={checkinStep === 'verifying-server' ? { background: '#000', color: '#fff', padding: '10px 14px', borderRadius: 10, fontWeight: 800 } : { background: '#ffffff', color: '#000', padding: '10px 14px', borderRadius: 10, fontWeight: 800 }}
                                    >
                                        {checkinStep === 'verifying-server' ? 'Processing' : 'Finalize'}
                                    </button>
                                </div>
                            </div>

                            {checkinStep === 'verifying-server' && (
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                        <div style={{ color: '#c7d2fe' }}>Verifying with Server...</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Step 3: Face Scan */}
                    {(checkinStep === 'scan-face' || checkinStep === 'verifying-server') && (
                        <div className="w-full max-w-md flex flex-col items-center gap-4">
                            <FaceScanner onScan={handleFaceScan} />

                            <p className="text-center mt-2 font-bold text-lg h-8">
                                {verificationStatus === 'success' ? `Hello, ${matchedName}!` : 'Look at the camera...'}
                            </p>

                            {checkinStep === 'verifying-server' && (
                                <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded flex items-center gap-2">
                                    <div className="animate-spin h-4 w-4 border-2 border-blue-700 rounded-full border-t-transparent"></div>
                                    Verifying with Server...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Success -> Redirecting */}
                    {checkinStep === 'complete' && (
                        <div className="text-center p-8 bg-green-100 rounded-lg flex flex-col items-center shadow-lg">
                            <div className="text-6xl mb-4">✅</div>
                            <h2 className="text-3xl font-bold text-green-700 mb-2">Check-in Confirmed!</h2>
                            <p className="text-lg">Redirecting to your Room Key...</p>
                            <div className="animate-spin h-6 w-6 border-2 border-green-700 rounded-full border-t-transparent mt-4"></div>
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}

export default function CheckInPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CheckInContent />
        </Suspense>
    );
}
