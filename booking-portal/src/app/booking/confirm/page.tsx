'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Booking = {
    id: string; status: string; payment_status: string;
    check_in_date: string; check_out_date: string; total_amount: number;
    room_type: { name: string } | null;
    hotel: { id: string; name: string; city: string } | null;
};

export default function ConfirmPage() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('booking_id');
    const [booking, setBooking] = useState<Booking | null>(null);

    useEffect(() => {
        if (!bookingId) return;
        supabase.auth.getSession().then(({ data }) => {
            fetch(`/api/my-bookings?id=${bookingId}`, {
                headers: { 'Authorization': `Bearer ${data.session?.access_token}` }
            }).then(r => r.json()).then(d => setBooking(d.bookings?.[0] || null));
        });
    }, [bookingId]);

    const nights = booking
        ? Math.max(0, (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000)
        : 0;

    return (
        <>
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
                <div className="nav-links">
                    <Link href="/my-bookings" className="nav-link">My Bookings</Link>
                    <Link href="/" className="nav-link">Browse Hotels</Link>
                </div>
            </nav>

            <div style={{ paddingTop: '7rem', paddingBottom: '5rem', minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 600 }}>
                    <div className="step-bar">
                        <div className="step done"><div className="step-num">✓</div><div className="step-label">Select Dates</div></div>
                        <div className="step-line done" />
                        <div className="step done"><div className="step-num">✓</div><div className="step-label">Payment</div></div>
                        <div className="step-line done" />
                        <div className="step active"><div className="step-num">3</div><div className="step-label">Confirmation</div></div>
                    </div>

                    {/* Confirmation card */}
                    <div className="card animate-fade-up" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        {/* Celebration */}
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', display: 'inline-block' }} className="animate-pulse">
                            🎉
                        </div>

                        <h2 style={{ marginBottom: '0.5rem', fontFamily: "'Playfair Display',serif" }}>Booking Confirmed!</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            Your reservation is confirmed. A confirmation email is on its way.
                        </p>

                        {booking && (
                            <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
                                {/* Hotel header */}
                                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ fontSize: '1.5rem' }}>🏨</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{booking.hotel?.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {booking.hotel?.city}</div>
                                        </div>
                                        <span className="badge badge-green" style={{ marginLeft: 'auto' }}>
                                            {booking.status}
                                        </span>
                                    </div>
                                    {[
                                        ['Room', booking.room_type?.name || '—'],
                                        ['Check-in', booking.check_in_date],
                                        ['Check-out', booking.check_out_date],
                                        ['Duration', `${nights} Night${nights !== 1 ? 's' : ''}`],
                                        ['Total Paid', `₹${Number(booking.total_amount).toLocaleString()}`],
                                    ].map(([label, val]) => (
                                        <div key={label} style={{ padding: '0.7rem 1.25rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{val}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'var(--gold-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--gold)' }}>🔑</span>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--gold)', fontFamily: 'monospace' }}>
                                        Reference: {booking.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link href="/my-bookings" className="btn btn-primary btn-lg">View My Bookings →</Link>
                            <Link href="/" className="btn btn-outline">Browse More Hotels</Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
