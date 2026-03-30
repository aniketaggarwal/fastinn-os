'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type CheckinStatus = {
    identity_verified: boolean;
    face_verified: boolean;
    booking_status: string;
    hotel_name: string;
    check_in_date: string;
    room_type: string;
};

export default function PreCheckinOverviewPage() {
    const { bookingId } = useParams() as { bookingId: string };
    const router = useRouter();
    const [status, setStatus] = useState<CheckinStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.replace('/login'); return; }

            const [{ data: userData }, { data: bookingData }] = await Promise.all([
                supabase.from('users').select('identity_verified, face_verified').eq('id', session.user.id).single(),
                supabase.from('bookings').select('status, check_in_date, hotel:hotels(name), room_type:room_types(name)').eq('id', bookingId).single(),
            ]);

            if (!bookingData) { router.replace('/my-bookings'); return; }
            setStatus({
                identity_verified: userData?.identity_verified ?? false,
                face_verified: userData?.face_verified ?? false,
                booking_status: (bookingData as any).status,
                hotel_name: (bookingData as any).hotel?.name || 'Your Hotel',
                check_in_date: (bookingData as any).check_in_date,
                room_type: (bookingData as any).room_type?.name || 'Room',
            });
            setLoading(false);
        };
        load();
    }, [bookingId, router]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
        </div>
    );

    const steps = [
        {
            num: 1, label: 'Upload Identity', icon: '🪪',
            desc: 'Upload your Aadhaar card for identity verification.',
            done: status?.identity_verified,
            href: `/pre-checkin/${bookingId}/upload-id`,
        },
        {
            num: 2, label: 'Face Registration', icon: '🫵',
            desc: 'Scan your face for contactless check-in at the hotel.',
            done: status?.face_verified,
            href: `/pre-checkin/${bookingId}/face`,
        },
        {
            num: 3, label: 'All Set!', icon: '✅',
            desc: 'Pre-check-in complete. Just walk in on your arrival day.',
            done: status?.identity_verified && status?.face_verified,
            href: `/my-bookings/${bookingId}`,
        },
    ];

    const allDone = status?.identity_verified && status?.face_verified;
    const nextStep = steps.find(s => !s.done);

    return (
        <>
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
                <div className="nav-links">
                    <Link href={`/my-bookings/${bookingId}`} className="nav-link">← Back to Booking</Link>
                </div>
            </nav>

            <div style={{ paddingTop: '7rem', paddingBottom: '5rem', minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 680 }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <div className="section-eyebrow">Online Check-in</div>
                        <h1>Pre-Check-in</h1>
                        <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                            {status?.hotel_name} · {status?.room_type} · {status?.check_in_date && new Date(status.check_in_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>

                    {allDone && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem' }}>🎉</span>
                            <div>
                                <div style={{ fontWeight: 700, color: '#4ade80' }}>Pre-check-in complete!</div>
                                <div className="text-sm text-muted">You're all set for a seamless check-in experience.</div>
                            </div>
                        </div>
                    )}

                    {/* Steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        {steps.map((step, i) => {
                            const isLocked = !step.done && steps.slice(0, i).some(s => !s.done);
                            return (
                                <div key={step.num} style={{
                                    display: 'flex', alignItems: 'center', gap: '1.25rem',
                                    padding: '1.25rem 1.5rem',
                                    background: step.done ? 'rgba(34,197,94,0.06)' : 'var(--surface)',
                                    border: `1px solid ${step.done ? 'rgba(34,197,94,0.2)' : isLocked ? 'var(--border)' : 'var(--border-2)'}`,
                                    borderRadius: 'var(--radius)',
                                    opacity: isLocked ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                }}>
                                    {/* Step icon */}
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                                        background: step.done ? 'rgba(34,197,94,0.15)' : 'var(--surface-2)',
                                        border: `2px solid ${step.done ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.4rem',
                                    }}>
                                        {step.done ? '✓' : step.icon}
                                    </div>
                                    {/* Step info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            Step {step.num}: {step.label}
                                            {step.done && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: 20, fontWeight: 600 }}>Completed</span>}
                                        </div>
                                        <div className="text-sm text-muted">{step.desc}</div>
                                    </div>
                                    {/* CTA */}
                                    {!isLocked && !step.done && step.num !== 3 && (
                                        <Link href={step.href} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                                            Start →
                                        </Link>
                                    )}
                                    {step.done && step.num !== 3 && (
                                        <Link href={step.href} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                                            Redo
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* CTA */}
                    {!allDone && nextStep && nextStep.num !== 3 && (
                        <Link href={nextStep.href} className="btn btn-primary btn-lg w-full">
                            {nextStep.icon} Continue: {nextStep.label} →
                        </Link>
                    )}
                    {allDone && (
                        <Link href={`/my-bookings/${bookingId}`} className="btn btn-primary btn-lg w-full">
                            View My Booking →
                        </Link>
                    )}

                    <p className="text-xs text-muted mt-3" style={{ textAlign: 'center' }}>
                        🔒 Your identity data is encrypted and stored securely. It's only used for hotel check-in.
                    </p>
                </div>
            </div>
        </>
    );
}
