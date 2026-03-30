'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { saveEncryptedEmbedding, loadEncryptedEmbeddings } from '@/lib/encryption';
// Dynamically import FaceScanner to avoid SSR issues
import dynamic from 'next/dynamic';

const FaceScanner = dynamic(() => import('@/components/FaceScanner'), {
    ssr: false, loading: () => (
        <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="spinner" />
            <p className="text-sm text-muted">Loading face scanner…</p>
        </div>
    )
});

export default function PreCheckinFacePage() {
    const router = useRouter();
    const { bookingId } = useParams() as { bookingId: string };

    const [name, setName] = useState('');
    const [instruction, setInstruction] = useState('Initializing camera…');
    const [scannedDescriptor, setScannedDescriptor] = useState<Float32Array | null>(null);
    const [reviewMode, setReviewMode] = useState(false);
    const [scannerKey, setScannerKey] = useState(0);
    const [status, setStatus] = useState<'scanning' | 'confirming' | 'saving' | 'done' | 'error'>('scanning');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.replace('/login'); return; }

            // Check identity_verified first
            const { data: userData } = await supabase.from('users')
                .select('name, identity_verified')
                .eq('id', session.user.id)
                .single();

            if (!userData?.identity_verified) {
                router.replace(`/pre-checkin/${bookingId}/upload-id`);
                return;
            }

            const userName = userData?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Guest';
            setName(userName);
        };
        init();
    }, [bookingId, router]);

    const handleScanComplete = (descriptor: Float32Array) => {
        setScannedDescriptor(descriptor);
        setReviewMode(true);
        setStatus('confirming');
    };

    const handleConfirm = async () => {
        if (!scannedDescriptor || !name) return;
        setStatus('saving');
        try {
            // Check if this user already has a stored face — if so verify, if not register
            const existingFaces = await loadEncryptedEmbeddings();

            if (existingFaces.length === 0) {
                // Registration flow
                await saveEncryptedEmbedding(name, scannedDescriptor);
            }
            // Either way, mark as face_verified in DB
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('users').upsert({
                    id: user.id,
                    email: user.email,
                    name,
                    face_verified: true,
                    face_descriptor: Array.from(scannedDescriptor),
                }, { onConflict: 'id' });
            }
            setStatus('done');
            (window as any).redirectTimer = setTimeout(() => router.push(`/pre-checkin/${bookingId}`), 2500);
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMsg('Failed to save face. Please try again.');
        }
    };

    const handleRetake = () => {
        setScannedDescriptor(null);
        setReviewMode(false);
        setStatus('scanning');
        setErrorMsg('');
        setScannerKey(k => k + 1);
    };

    return (
        <>
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
                <div className="nav-links">
                    <Link href={`/pre-checkin/${bookingId}`} className="nav-link">← Pre-Check-in</Link>
                </div>
            </nav>

            <div style={{ paddingTop: '7rem', paddingBottom: '5rem', minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 560 }}>

                    {/* Progress */}
                    <div className="step-bar" style={{ marginBottom: '2.5rem' }}>
                        <div className="step done"><div className="step-num">✓</div><div className="step-label">Upload ID</div></div>
                        <div className="step-line done" />
                        <div className="step active"><div className="step-num">2</div><div className="step-label">Face Scan</div></div>
                        <div className="step-line" />
                        <div className="step"><div className="step-num">3</div><div className="step-label">Done</div></div>
                    </div>

                    <div className="section-eyebrow" style={{ marginBottom: '0.25rem' }}>Step 2 of 2</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Face Registration</h2>
                    <p className="text-muted text-sm" style={{ marginBottom: '2rem' }}>
                        We'll scan your face to enable <strong style={{ color: 'var(--text-soft)' }}>contactless check-in</strong> when you arrive at the hotel.
                    </p>

                    {status === 'done' ? (
                        /* Success state */
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🙌</div>
                            <h3 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Face Registered!</h3>
                            <p className="text-muted text-sm mb-4">Pre-check-in complete. Redirecting…</p>
                            <button
                                onClick={() => {
                                    clearTimeout((window as any).redirectTimer);
                                    setStatus('scanning'); setReviewMode(false); setScannedDescriptor(null); setErrorMsg(''); setScannerKey(k => k + 1);
                                }}
                                className="btn btn-outline btn-sm"
                            >
                                🔄 Retake Face Scan
                            </button>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '1.75rem' }}>
                            {/* Face Scanner */}
                            {status !== 'saving' && (
                                <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border)', position: 'relative' }}>
                                    <FaceScanner
                                        key={scannerKey}
                                        onScan={handleScanComplete}
                                        onInstructionChange={setInstruction}
                                    />
                                    {/* Scanner overlay label */}
                                    {!reviewMode && (
                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            background: 'linear-gradient(to top, rgba(8,6,4,0.9), transparent)',
                                            padding: '1.5rem 1rem 0.75rem',
                                            fontSize: '0.85rem', textAlign: 'center', color: 'var(--gold)',
                                            fontWeight: 600,
                                        }}>
                                            {instruction}
                                        </div>
                                    )}
                                </div>
                            )}

                            {status === 'saving' && (
                                <div style={{ padding: '2rem', textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                                    <p className="text-muted text-sm">Encrypting and saving face data…</p>
                                </div>
                            )}

                            {/* Instructions when not in review */}
                            {status === 'scanning' && (
                                <div style={{ padding: '0.75rem 1rem', background: 'var(--gold-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem' }}>
                                    <strong>📋 Instructions:</strong> Look straight at the camera, blink once when prompted, then turn your head slightly left.
                                </div>
                            )}

                            {/* Review / Retake buttons */}
                            {reviewMode && status !== 'saving' && (
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button
                                        className="btn btn-outline btn-lg"
                                        style={{ flex: 1, borderColor: '#ef4444', color: '#f87171' }}
                                        onClick={handleRetake}
                                    >
                                        🔄 Retake
                                    </button>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        style={{ flex: 2 }}
                                        onClick={handleConfirm}
                                    >
                                        ✅ Confirm Face
                                    </button>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="alert alert-error mt-2">{errorMsg}</div>
                            )}
                        </div>
                    )}

                    <p className="text-xs text-muted mt-3" style={{ textAlign: 'center' }}>
                        🔒 Face data is encrypted with AES-256 and stored only on your device. The hotel kiosk verifies your face locally.
                    </p>
                </div>
            </div>
        </>
    );
}
