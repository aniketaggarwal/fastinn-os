'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FaceScanner from '@/components/FaceScanner';
import QrCodeScanner from '@/components/QrCodeScanner';
import { verifyFaceMatch } from '@/lib/face-util';
import Link from 'next/link';

export default function MobileCheckinPage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    const bookingId = unwrappedParams.id;

    const router = useRouter();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [step, setStep] = useState<'intro' | 'qr' | 'face' | 'verifying' | 'success'>('intro');
    const [nonce, setNonce] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
    const [roomNo, setRoomNo] = useState<string | null>(null);

    useEffect(() => {
        const fetchBooking = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch(`/api/checkin/mobile?bookingId=${bookingId}`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                const json = await res.json();

                if (!res.ok) {
                    setError(json.error || 'Failed to fetch booking details.');
                } else if (!json.booking?.users?.face_descriptor) {
                    setError('You must complete Face Registration in Pre-Check-in before using Mobile Check-in.');
                } else {
                    const b = json.booking;
                    setBooking({ ...b, guest: b.users });
                    // If already checked in
                    if (b.status === 'checked_in' && b.room_id) {
                        setStep('success');
                        // Could pre-fetch roomNo here, but assuming it happens before
                    }
                }
            } catch (err) {
                console.error("Fetch Error:", err);
                setError('Network error loading checkin data.');
            }
            setLoading(false);
        };
        fetchBooking();
    }, [bookingId, router]);

    const handleVerifyLocation = () => {
        setStep('qr');
    };

    const handleQrScan = async (scannedText: string) => {
        // Extract Nonce if it's a URL (admin dashboard generates http://localhost:3000/checkin?nonce=XXX)
        let finalId = scannedText;
        try {
            const url = new URL(scannedText);
            const pid = url.searchParams.get('nonce');
            if (pid) finalId = pid;
        } catch (e) {
            // Not a URL, use as is
        }

        if (!finalId) return;
        setNonce(finalId);

        // Wait a second to show success, then move to face scan
        setTimeout(() => setStep('face'), 1500);
    };

    const handleFaceScan = async (liveDescriptor: Float32Array) => {
        if (!booking?.guest?.face_descriptor) return;

        setVerificationStatus('scanning');

        // 1. Verify Face against the one saved in the database during pre-checkin
        const savedDescriptor = new Float32Array(booking.guest.face_descriptor);
        const isMatch = await verifyFaceMatch(savedDescriptor, liveDescriptor, 0.45);

        if (!isMatch) {
            setVerificationStatus('failed');
            setTimeout(() => setVerificationStatus('scanning'), 2000);
            return;
        }

        // 2. Success! Proceed to Check-in
        setVerificationStatus('success');
        setStep('verifying');

        try {
            const { data: { session } } = await supabase.auth.getSession();

            // Update booking status securely
            const res = await fetch('/api/checkin/mobile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ bookingId: booking.id, nonce: nonce })
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to check-in');

            // Generate a fake room key
            if (json.roomNo) setRoomNo(json.roomNo);
            setStep('success');

        } catch (err: any) {
            alert('Failed to finalize check-in: ' + err.message);
            setStep('face');
        }
    };

    if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-mono">Loading data...</div>;

    // Fix: Unstyled / broken text overlap is solved by correct HTML hierarchy
    if (error) return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '2rem', borderRadius: '1rem', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171', marginBottom: '1rem', letterSpacing: '-0.025em' }}>Cannot Check In</h1>
                <p style={{ color: '#9ca3af', marginBottom: '2rem', lineHeight: '1.625', fontSize: '15px' }}>{error}</p>
                <Link href={`/my-bookings/${bookingId}`} style={{ display: 'block', width: '100%', padding: '1rem 1.5rem', backgroundColor: 'white', color: 'black', fontWeight: 'bold', borderRadius: '0.75rem', textDecoration: 'none', transition: 'background-color 0.2s' }}>
                    ← Go Back to Booking
                </Link>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', margin: 0 }}>
            {/* Header */}
            <header style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent', position: 'absolute', top: 0, width: '100%', zIndex: 50, boxSizing: 'border-box' }}>
                <Link href={`/my-bookings/${bookingId}`} style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#9ca3af', textDecoration: 'none' }}>
                    ← Back
                </Link>
                <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', color: '#6b7280' }}>FastInn Key</div>
                <div style={{ width: '48px' }}></div>
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '440px', margin: '0 auto', position: 'relative', padding: '1.5rem', boxSizing: 'border-box', paddingTop: '5rem' }}>

                {step === 'intro' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ width: '5rem', height: '5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '9999px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', marginBottom: '1.5rem', boxShadow: '0 0 40px -10px #2563eb' }}>
                                📲
                            </div>
                            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.75rem', letterSpacing: '-0.025em' }}>Hotel Check-in</h1>
                            <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '1.625' }}>
                                Get your digital room key. Please scan the QR code provided by the front desk to link your session.
                            </p>
                        </div>

                        <div style={{ backgroundColor: '#111', border: '1px solid #222', padding: '1.25rem', borderRadius: '1rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>📷</span>
                                <div>
                                    <h3 style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>Scan Desk QR</h3>
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>Connects your phone to the hotel system.</p>
                                </div>
                            </div>
                            <div style={{ height: '1px', backgroundColor: '#222', margin: '1rem 0' }}></div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>👤</span>
                                <div>
                                    <h3 style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>Verify Identity</h3>
                                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>A quick selfie validates your pre-check-in registration.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleVerifyLocation}
                            style={{ width: '100%', padding: '1rem', backgroundColor: 'white', color: 'black', fontWeight: 'bold', borderRadius: '0.75rem', fontSize: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(255,255,255,0.1)' }}
                        >
                            Next
                        </button>
                    </div>
                )}

                {step === 'qr' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Scan Session QR</h2>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Point your camera at the front desk screen.</p>
                        </div>

                        <div style={{ width: '100%', maxWidth: '384px', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #333', backgroundColor: 'black', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', minHeight: '300px' }}>
                            <QrCodeScanner
                                onScanSuccess={handleQrScan}
                                onScanFailure={() => { }}
                            />

                            {/* Overlay States */}
                            {nonce !== '' && (
                                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(30, 58, 138, 0.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 20 }}>
                                    <span style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'white' }}>QR Scanned!</span>
                                    <span style={{ fontSize: '0.75rem', color: '#bfdbfe', marginTop: '0.25rem' }}>{nonce}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0', width: '100%' }}>
                            <div style={{ height: '1px', backgroundColor: '#374151', flex: 1 }}></div>
                            <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Or Enter Manually</span>
                            <div style={{ height: '1px', backgroundColor: '#374151', flex: 1 }}></div>
                        </div>

                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
                            <input
                                type="text"
                                placeholder="Nonce (e.g. FASTINN-XYZ)"
                                style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', outline: 'none', fontFamily: 'monospace', fontSize: '0.875rem' }}
                                value={nonce}
                                onChange={e => setNonce(e.target.value)}
                            />
                            <button
                                onClick={() => { if (nonce) handleQrScan(nonce); }}
                                style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                )}

                {step === 'face' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Face Verification</h2>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>Look directly at the camera to unlock your room.</p>
                        </div>

                        <div style={{ width: '100%', maxWidth: '384px', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #333', backgroundColor: 'black', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>
                            <FaceScanner onScan={handleFaceScan} />

                            {/* Overlay States */}
                            {verificationStatus === 'failed' && (
                                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(127, 29, 29, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 20 }}>
                                    <span style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'white' }}>Face Mismatch</span>
                                    <span style={{ fontSize: '0.75rem', color: '#fecaca', marginTop: '0.25rem' }}>Try again</span>
                                </div>
                            )}
                            {verificationStatus === 'success' && (
                                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(20, 83, 45, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 20 }}>
                                    <span style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'white' }}>Identity Confirmed</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 'verifying' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ width: '4rem', height: '4rem', border: '4px solid #333', borderTopColor: 'white', borderRadius: '50%', marginBottom: '1.5rem', animation: 'spin 1s linear infinite' }}></div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Issuing Key...</h2>
                        <p style={{ color: '#9ca3af', margin: 0 }}>Verifying session with property management</p>
                    </div>
                )}

                {step === 'success' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '384px', margin: '0 auto' }}>
                        <div style={{ backgroundColor: '#111', border: '1px solid #222', padding: '2rem', borderRadius: '1.5rem', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
                            <div style={{ width: '5rem', height: '5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', marginBottom: '1.5rem', boxShadow: '0 0 50px -10px #22c55e' }}>
                                🔑
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'white' }}>You're Checked In!</h2>
                            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.625', margin: '0 0 1.5rem 0' }}>
                                Welcome to {booking.hotel?.name}. Your room is
                                <strong style={{ color: 'white', marginLeft: '0.5rem', fontSize: '1.125rem' }}>
                                    {roomNo || 'Assigned'}
                                </strong>.
                            </p>

                            <Link href={`/my-bookings/${booking.id}`} style={{ display: 'block', width: '100%', padding: '1rem', backgroundColor: 'white', color: 'black', fontWeight: 'bold', borderRadius: '0.75rem', fontSize: '15px', textDecoration: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' }}>
                                View Digital Key & Room
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
