'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type BookingDetail = {
    id: string; status: string; payment_status: string;
    check_in_date: string; check_out_date: string; total_amount: number;
    created_at: string;
    room_type: { id: string; name: string; description: string | null; base_price: number; capacity: number } | null;
    hotel: { id: string; name: string; city: string; location?: string; images?: string[]; star_rating?: number } | null;
    room: { room_no: string } | null;
};

const STATUS_STEPS = ['pending', 'confirmed', 'checked_in', 'completed'];
const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending', confirmed: 'Confirmed',
    checked_in: 'Checked In', completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_BADGE: Record<string, string> = {
    pending: 'badge-amber', confirmed: 'badge-green',
    cancelled: 'badge-red', checked_in: 'badge-gold', completed: 'badge-gold',
};
const PAYMENT_ICONS: Record<string, string> = {
    unpaid: '⏳', offline: '💵', paid: '✅', partial: '🔸',
};

export default function BookingDetailPage() {
    const router = useRouter();
    const params = useParams();
    const bookingId = params.id as string;

    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState('');
    const [userVerified, setUserVerified] = useState({ identity: false, face: false });

    const fetchBooking = async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) { router.replace('/login'); return; }
        const res = await fetch(`/api/my-bookings?id=${bookingId}`, {
            headers: { 'Authorization': `Bearer ${data.session.access_token}` },
        });
        const json = await res.json();
        const b = json.bookings?.[0];
        if (!b) { router.replace('/my-bookings'); return; }
        setBooking(b);
        // Fetch user verification status
        const { data: uv } = await supabase.from('users')
            .select('identity_verified, face_verified')
            .eq('id', data.session.user.id)
            .single();
        setUserVerified({ identity: uv?.identity_verified ?? false, face: uv?.face_verified ?? false });
        setLoading(false);
    };

    useEffect(() => { fetchBooking(); }, [bookingId]);

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        setCancelling(true);
        setError('');
        const { data } = await supabase.auth.getSession();
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' },
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error || 'Failed to cancel.'); setCancelling(false); return; }
        setBooking(b => b ? { ...b, status: 'cancelled' } : b);
        setCancelling(false);
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
        </div>
    );
    if (!booking) return null;

    const nights = Math.max(0,
        (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000
    );
    const pricePerNight = booking.room_type?.base_price || (nights > 0 ? booking.total_amount / nights : 0);
    const isCancellable = ['pending', 'confirmed'].includes(booking.status) && new Date(booking.check_in_date) > new Date();
    const statusIndex = STATUS_STEPS.indexOf(booking.status);
    const hotelImg = (booking.hotel as any)?.images?.[0];
    const ref = booking.id.slice(0, 8).toUpperCase();

    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <>
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
                <div className="nav-links">
                    <Link href="/my-bookings" className="nav-link">← My Bookings</Link>
                    <Link href="/" className="nav-link">Hotels</Link>
                </div>
            </nav>

            <div style={{ paddingTop: '7rem', paddingBottom: '5rem', minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 960 }}>

                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        <Link href="/my-bookings" style={{ color: 'var(--gold)' }}>My Bookings</Link>
                        <span>/</span>
                        <span>#{ref}</span>
                    </div>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                        <div>
                            <div className="section-eyebrow">Booking #{ref}</div>
                            <h1 style={{ marginBottom: '0.25rem' }}>{booking.hotel?.name}</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                📍 {booking.hotel?.city}
                                {(booking.hotel as any)?.location && ` — ${(booking.hotel as any).location}`}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span className={`badge ${STATUS_BADGE[booking.status] || 'badge-gold'}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}>
                                {STATUS_LABELS[booking.status]}
                            </span>
                            {isCancellable && (
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ borderColor: '#ef4444', color: '#f87171' }}
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                >
                                    {cancelling ? 'Cancelling…' : 'Cancel Booking'}
                                </button>
                            )}
                        </div>
                    </div>

                    {error && <div className="alert alert-error mb-3">{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
                        {/* ── LEFT: Main Content ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* Hotel photo */}
                            {hotelImg && (
                                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', height: 280 }}>
                                    <img src={hotelImg} alt={booking.hotel?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}

                            {/* Booking Timeline */}
                            {booking.status !== 'cancelled' && (
                                <div className="card" style={{ padding: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '1.25rem' }}>Booking Progress</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                        {STATUS_STEPS.map((step, i) => (
                                            <React.Fragment key={step}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: '50%',
                                                        border: `2px solid ${i <= statusIndex ? 'var(--gold)' : 'var(--border)'}`,
                                                        background: i < statusIndex ? 'var(--gold)' : i === statusIndex ? 'var(--gold-dim)' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.75rem', color: i <= statusIndex ? (i < statusIndex ? '#080604' : 'var(--gold)') : 'var(--text-muted)',
                                                        fontWeight: 700,
                                                    }}>
                                                        {i < statusIndex ? '✓' : i + 1}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: i <= statusIndex ? 'var(--gold)' : 'var(--text-muted)', textAlign: 'center', fontWeight: i === statusIndex ? 700 : 400 }}>
                                                        {STATUS_LABELS[step]}
                                                    </div>
                                                </div>
                                                {i < STATUS_STEPS.length - 1 && (
                                                    <div key={`line-${i}`} style={{ flex: 1, height: 2, background: i < statusIndex ? 'var(--gold)' : 'var(--border)', marginBottom: '1.2rem', opacity: i < statusIndex ? 0.6 : 1 }} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stay Details */}
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h4 style={{ marginBottom: '1.25rem' }}>Stay Details</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    {[
                                        { label: 'Check-in', value: formatDate(booking.check_in_date), icon: '📅' },
                                        { label: 'Check-out', value: formatDate(booking.check_out_date), icon: '📅' },
                                        { label: 'Duration', value: `${nights} Night${nights !== 1 ? 's' : ''}`, icon: '🌙' },
                                        { label: 'Room Type', value: booking.room_type?.name || '—', icon: '🛏️' },
                                        { label: 'Guests', value: `Up to ${booking.room_type?.capacity || 2}`, icon: '👥' },
                                        { label: 'Payment', value: `${PAYMENT_ICONS[booking.payment_status] || ''} ${booking.payment_status}`, icon: '' },
                                    ].map(({ label, value, icon }) => (
                                        <div key={label} style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>
                                                {icon && `${icon} `}{label}
                                            </div>
                                            <div style={{ fontWeight: 600, textTransform: 'capitalize', lineHeight: 1.3 }}>{value}</div>
                                        </div>
                                    ))}
                                </div>

                                {booking.room_type?.description && (
                                    <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>
                                            About Your Room
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-soft)', lineHeight: 1.7 }}>
                                            {booking.room_type.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT: Summary Sidebar ── */}
                        <div style={{ position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* Pre-Check-in Card — visible for confirmed upcoming bookings */}
                            {['confirmed', 'pending'].includes(booking.status) && new Date(booking.check_in_date) >= new Date(new Date().toISOString().split('T')[0]) && (
                                <div style={{ background: 'var(--surface)', border: `1px solid ${userVerified.identity && userVerified.face ? 'rgba(34,197,94,0.3)' : 'var(--gold)'}`, borderRadius: 'var(--radius)', padding: '1.25rem', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.5rem' }}>
                                        ✈️ Online Check-in
                                    </div>
                                    <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                                        {userVerified.identity && userVerified.face ? '🎉 Pre-check-in Complete!' : '⚡ Pre-Check-in Available'}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                                        {[
                                            { label: 'Upload Identity', done: userVerified.identity },
                                            { label: 'Face Registration', done: userVerified.face },
                                        ].map(({ label, done }) => (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                                <span style={{ color: done ? '#4ade80' : 'var(--text-muted)', fontSize: '0.75rem' }}>{done ? '✓' : '○'}</span>
                                                <span style={{ color: done ? 'var(--text-soft)' : 'var(--text-muted)', textDecoration: done ? 'none' : 'none' }}>{label}</span>
                                                {done && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#4ade80', fontWeight: 600 }}>Done</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    {(!userVerified.identity || !userVerified.face) ? (
                                        <Link
                                            href={`/pre-checkin/${bookingId}`}
                                            className="btn btn-primary w-full"
                                            style={{ fontSize: '0.8rem', padding: '0.6rem 1rem' }}
                                        >
                                            🚀 Start Pre-Check-in →
                                        </Link>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {/* Show Self Check-in if it's the check-in day or later */}
                                            {new Date().toISOString().split('T')[0] >= booking.check_in_date ? (
                                                <Link
                                                    href={`/my-bookings/${bookingId}/checkin`}
                                                    className="btn btn-primary w-full"
                                                    style={{ fontSize: '0.85rem', padding: '0.6rem 1rem', background: '#22c55e', color: '#000', border: 'none', marginBottom: '0.5rem' }}
                                                >
                                                    📱 Self Check-in Now
                                                </Link>
                                            ) : (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                                                    Come back on {formatDate(booking.check_in_date)} to self check-in from your phone.
                                                </div>
                                            )}

                                            <Link
                                                href={`/pre-checkin/${bookingId}`}
                                                className="btn btn-outline w-full"
                                                style={{ fontSize: '0.8rem', padding: '0.6rem 1rem', borderColor: 'rgba(255,255,255,0.1)' }}
                                            >
                                                Edit Pre-Check-in details →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Digital Key Card — visible after check-in */}
                            {booking.status === 'checked_in' && (
                                <div style={{ background: 'var(--surface)', border: `1px solid var(--gold)`, borderRadius: 'var(--radius)', padding: '1.25rem', overflow: 'hidden', position: 'relative', boxShadow: '0 0 40px rgba(197, 163, 101, 0.1)' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.25rem' }}>📱</span> Digital Key
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Room Number</div>
                                            <div style={{ fontWeight: 700, fontSize: '2rem', fontFamily: "'Playfair Display',serif", color: '#fff', lineHeight: 1 }}>
                                                {booking.room?.room_no || 'Assigned'}
                                            </div>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                        Hold your phone near the door lock at {booking.hotel?.name} to enter your room.
                                    </p>
                                    <button className="btn btn-primary w-full" onClick={() => alert("Simulating NFC unlock request using FastInn OS...")} style={{ padding: '1rem', fontSize: '1rem', background: 'var(--gold)', color: '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '0.75rem', fontWeight: 'bold' }}>
                                        <span style={{ fontSize: '1.25rem' }}>🔓</span> Unlock Room Door
                                    </button>
                                </div>
                            )}

                            {/* Price Breakdown */}
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h4 style={{ marginBottom: '1.25rem', fontFamily: "'Playfair Display',serif" }}>Price Breakdown</h4>
                                <div>
                                    {[
                                        [`₹${Number(pricePerNight).toLocaleString()} × ${nights} night${nights !== 1 ? 's' : ''}`, `₹${(pricePerNight * nights).toLocaleString()}`],
                                        ['Taxes & fees', 'Included'],
                                        ['Service charge', '₹0'],
                                    ].map(([label, val]) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-soft)' }}>
                                            <span>{label}</span>
                                            <span style={{ fontWeight: 500 }}>{val}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', marginTop: '0.25rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total Paid</span>
                                        <span style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--gold)', fontFamily: "'Playfair Display',serif" }}>
                                            ₹{Number(booking.total_amount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Reference */}
                            <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem', fontWeight: 700 }}>
                                    🔑 Booking Reference
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--gold)' }}>
                                    FAST-{ref}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                    Booked on {new Date(booking.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {booking.hotel?.id && (
                                    <Link href={`/hotel/${booking.hotel.id}`} className="btn btn-primary w-full">
                                        View Hotel Details →
                                    </Link>
                                )}
                                <Link href="/my-bookings" className="btn btn-outline w-full">
                                    ← Back to My Bookings
                                </Link>
                            </div>

                            {/* Help note */}
                            <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                💬 Need help? Contact the hotel directly or reach FastInn support. Reference your booking ID: <strong style={{ color: 'var(--text-soft)' }}>FAST-{ref}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
