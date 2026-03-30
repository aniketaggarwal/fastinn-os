'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Booking = {
    id: string; status: string; payment_status: string;
    check_in_date: string; check_out_date: string; total_amount: number;
    room_type: { name: string } | null;
    hotel: { id: string; name: string; city: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
    pending: 'badge-amber', confirmed: 'badge-green',
    cancelled: 'badge-red', checked_in: 'badge-gold', completed: 'badge-gold',
};

export default function MyBookingsPage() {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [preCheckinDone, setPreCheckinDone] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) { router.replace('/login'); return; }
            setUser(data.user);
            // Fetch verification status
            supabase.from('users').select('identity_verified, face_verified').eq('id', data.user.id).single()
                .then(({ data: uv }) => {
                    setPreCheckinDone(!!(uv?.identity_verified && uv?.face_verified));
                });
        });
        supabase.auth.getSession().then(({ data }) => {
            fetch('/api/my-bookings', { headers: { 'Authorization': `Bearer ${data.session?.access_token}` } })
                .then(r => r.json())
                .then(d => { setBookings(d.bookings || []); setLoading(false); });
        });
    }, [router]);

    return (
        <>
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
                <div className="nav-links">
                    <Link href="/" className="nav-link">Hotels</Link>
                    <button className="btn btn-outline btn-sm" onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}>Sign Out</button>
                </div>
            </nav>

            <div style={{ paddingTop: '7rem', paddingBottom: '5rem' }}>
                <div className="container" style={{ maxWidth: 900 }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="section-eyebrow">Your Account</div>
                        <h1>My Bookings</h1>
                        {user && <p className="text-muted text-sm mt-1">{user.email}</p>}
                    </div>

                    {loading ? (
                        <div className="spinner-center"><div className="spinner" /></div>
                    ) : bookings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                            <h3 style={{ marginBottom: '0.5rem' }}>No bookings yet</h3>
                            <p className="text-muted text-sm mb-3">Book your first luxury stay today.</p>
                            <Link href="/" className="btn btn-primary">Browse Hotels →</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {bookings.map(b => {
                                const nights = Math.max(0, (new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86400000);
                                const isPast = new Date(b.check_out_date) < new Date();
                                return (
                                    <Link key={b.id} href={`/my-bookings/${b.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                        <div style={{
                                            background: 'var(--surface)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)', padding: '1.5rem',
                                            transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                                            cursor: 'pointer',
                                        }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
                                                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.transform = '';
                                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                                                (e.currentTarget as HTMLElement).style.boxShadow = '';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                        <h4>{b.hotel?.name || 'Hotel'}</h4>
                                                        <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gold'}`}>
                                                            {b.status.replace('_', ' ')}
                                                        </span>
                                                        {isPast && <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>Past</span>}
                                                        {preCheckinDone && !isPast && ['confirmed', 'pending'].includes(b.status) && (
                                                            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem', background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(34,197,94,0.25)', whiteSpace: 'nowrap' }}>
                                                                ✓ Pre-Check-in
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted">📍 {b.hotel?.city} &nbsp;·&nbsp; 🛏️ {b.room_type?.name}</p>
                                                    <p className="text-sm mt-1">
                                                        <span style={{ color: 'var(--text-soft)' }}>
                                                            {b.check_in_date} → {b.check_out_date}
                                                        </span>
                                                        <span className="text-muted"> ({nights} night{nights !== 1 ? 's' : ''})</span>
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)', fontFamily: "'Playfair Display',serif" }}>
                                                        ₹{Number(b.total_amount).toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-muted" style={{ marginBottom: '0.5rem' }}>{b.payment_status}</div>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                                        View Details →
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
