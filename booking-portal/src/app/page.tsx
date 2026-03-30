'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Hotel = {
    id: string; name: string; location: string; city: string;
    star_rating: number; base_price: number; images: string[];
    amenities: string[]; description: string | null;
};

const AMENITY_ICONS: Record<string, string> = {
    pool: '🏊', spa: '💆', gym: '🏋️', wifi: '📶', restaurant: '🍽️',
    valet: '🚗', bar: '🍸', concierge: '🛎️', parking: '🅿️', rooftop: '🌆',
};

function Stars({ n }: { n: number }) {
    return <span className="hotel-card-stars">{'★'.repeat(n)}</span>;
}

function Navbar({ user }: { user: any }) {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);
    return (
        <nav className="nav" style={{ background: scrolled ? 'rgba(8,6,4,0.92)' : 'transparent', borderBottomColor: scrolled ? 'var(--border)' : 'transparent' }}>
            <Link href="/" className="nav-brand">FastInn</Link>
            <div className="nav-links">
                <Link href="/" className="nav-link">Hotels</Link>
                {user && <Link href="/my-bookings" className="nav-link">My Bookings</Link>}
                {user
                    ? <button className="btn btn-outline btn-sm" onClick={async () => { await supabase.auth.signOut(); router.refresh(); }}>Sign Out</button>
                    : <Link href="/login" className="btn btn-primary btn-sm">Sign In</Link>}
            </div>
        </nav>
    );
}

export default function HomePage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [city, setCity] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
        fetch('/api/hotels')
            .then(r => r.json())
            .then(d => { setHotels(d.hotels || []); setLoading(false); });
        const fn = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    const filtered = city
        ? hotels.filter(h => (h.city || h.name || '').toLowerCase().includes(city.toLowerCase()))
        : hotels;

    const today = new Date().toISOString().split('T')[0];

    return (
        <>
            <Navbar user={user} />

            {/* ───────── HERO ───────── */}
            <section style={{
                position: 'relative', minHeight: '100vh',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '0 1.5rem',
                backgroundColor: '#080604',
                overflow: 'hidden',
            }}>
                {/* Background image */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'url(/hotel-rooftop.jpg)',
                    backgroundSize: 'cover', backgroundPosition: 'center 40%',
                    filter: 'brightness(0.35) saturate(1.2)',
                }} />
                {/* Gradient overlays */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,6,4,0.3) 0%, rgba(8,6,4,0.15) 40%, rgba(8,6,4,0.7) 100%)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 60%)' }} />

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 900, width: '100%' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                        background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: 20, padding: '0.4rem 1.1rem',
                        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em',
                        textTransform: 'uppercase', color: 'var(--gold)',
                        marginBottom: '1.5rem',
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
                        Luxury Hotel Collection
                    </div>

                    <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2.4rem,6vw,4.5rem)', fontWeight: 700, lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.01em' }}>
                        Discover <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Extraordinary</em>
                        <br />Places to Stay
                    </h1>
                    <p style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: 'rgba(245,240,232,0.7)', maxWidth: 540, margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
                        Handpicked luxury hotels across India's most beautiful destinations. Seamless booking, instant confirmation.
                    </p>

                    {/* Search Bar */}
                    <div style={{
                        background: 'rgba(26,21,16,0.92)', backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(201,168,76,0.25)', borderRadius: 16,
                        padding: '1.1rem 1.5rem', display: 'flex', gap: '0', alignItems: 'stretch',
                        maxWidth: 720, margin: '0 auto',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ flex: 1, paddingRight: '1.25rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.3rem' }}>Destination</div>
                            <input
                                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 500, width: '100%', fontFamily: 'Inter,sans-serif' }}
                                placeholder="City or Hotel"
                                value={city}
                                onChange={e => setCity(e.target.value)}
                            />
                        </div>
                        <div style={{ width: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
                        <div style={{ flex: 1, padding: '0 1.25rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.3rem' }}>Check-in</div>
                            <input
                                type="date"
                                min={today}
                                style={{ background: 'none', border: 'none', outline: 'none', color: checkIn ? 'var(--text)' : 'rgba(245,240,232,0.35)', fontSize: '0.95rem', fontWeight: 500, width: '100%', fontFamily: 'Inter,sans-serif', cursor: 'pointer' }}
                                value={checkIn}
                                onChange={e => setCheckIn(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '0 1.75rem', borderRadius: 10, fontSize: '0.9rem', flexShrink: 0 }}
                            onClick={() => { const el = document.getElementById('hotels'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                        >
                            Search ↓
                        </button>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', marginTop: '3rem', flexWrap: 'wrap' }}>
                        {[['50+', 'Properties'], ['4.9★', 'Avg Rating'], ['24/7', 'Support'], ['0', 'Hidden Fees']].map(([val, label]) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'Playfair Display',serif", color: 'var(--gold)' }}>{val}</div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scroll indicator */}
                <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'rgba(245,240,232,0.4)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.4))' }} />
                    Scroll
                </div>
            </section>

            {/* ───────── HOTEL GRID ───────── */}
            <section id="hotels" style={{ padding: '5rem 0', background: 'var(--bg)' }}>
                <div className="container">
                    <div className="section-header">
                        <div className="section-eyebrow">Our Collection</div>
                        <h2 className="section-title">
                            {city ? `"${city}" Hotels` : 'Curated Properties'}
                        </h2>
                        <p className="section-subtitle">Every property offers exceptional service and unique character.</p>
                    </div>

                    {loading ? (
                        <div className="spinner-center"><div className="spinner" /></div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏨</div>
                            <h3 style={{ marginBottom: '0.5rem' }}>No hotels found</h3>
                            <p className="text-sm text-muted mb-3">{city ? 'Try a different search.' : 'Tap the button below to load demo hotels.'}</p>
                            {!city && (
                                <button className="btn btn-primary" onClick={async () => {
                                    const res = await fetch('/api/seed-hotels', { method: 'POST' });
                                    const d = await res.json();
                                    if (d.success) {
                                        const r2 = await fetch('/api/hotels').then(r => r.json());
                                        setHotels(r2.hotels || []);
                                    }
                                }}>
                                    Load Demo Hotels ✦
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                            {filtered.map((hotel, idx) => (
                                <Link key={hotel.id} href={`/hotel/${hotel.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                    <div style={{
                                        background: 'var(--surface)', border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius)', overflow: 'hidden',
                                        transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                                        cursor: 'pointer',
                                    }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)';
                                            (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.transform = '';
                                            (e.currentTarget as HTMLElement).style.boxShadow = '';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                                        }}
                                    >
                                        {/* Image */}
                                        <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
                                            {hotel.images?.[0]
                                                ? <img src={hotel.images[0]} alt={hotel.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, var(--surface-2), var(--surface))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>🏨</div>
                                            }
                                            {/* Gradient overlay on image */}
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,6,4,0.7) 0%, transparent 50%)' }} />

                                            {/* Star badge */}
                                            <div style={{
                                                position: 'absolute', top: 12, left: 12,
                                                background: 'rgba(8,6,4,0.8)', backdropFilter: 'blur(8px)',
                                                border: '1px solid rgba(201,168,76,0.3)',
                                                borderRadius: 20, padding: '0.3rem 0.75rem',
                                                fontSize: '0.72rem', fontWeight: 700, color: 'var(--gold)',
                                            }}>
                                                {'★'.repeat(hotel.star_rating ?? 4)} {hotel.star_rating ?? 4}-Star
                                            </div>

                                            {/* City on image bottom */}
                                            <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                                                <div style={{ fontSize: '0.72rem', color: 'rgba(245,240,232,0.7)', marginBottom: 2 }}>📍 {hotel.city || 'India'}</div>
                                            </div>
                                        </div>

                                        {/* Card body */}
                                        <div style={{ padding: '1.25rem 1.5rem' }}>
                                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.3 }}>{hotel.name}</h3>

                                            {hotel.description && (
                                                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {hotel.description}
                                                </p>
                                            )}

                                            {/* Amenities */}
                                            {hotel.amenities?.length > 0 && (
                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                                    {hotel.amenities.slice(0, 4).map(a => (
                                                        <span key={a} style={{
                                                            background: 'var(--gold-dim)', border: '1px solid var(--border)',
                                                            borderRadius: 20, padding: '0.2rem 0.6rem',
                                                            fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 500,
                                                        }}>
                                                            {AMENITY_ICONS[a] ?? '✓'} {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Price + CTA */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div>
                                                    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)', fontFamily: "'Playfair Display',serif" }}>
                                                        ₹{Number(hotel.base_price || 0).toLocaleString()}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>/night</span>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    View Details →
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ───────── WHY FASTINN ───────── */}
            <section style={{ padding: '5rem 0', background: 'var(--bg-2)', borderTop: '1px solid var(--border)' }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <div className="section-eyebrow">Why FastInn</div>
                    <h2 className="section-title" style={{ marginBottom: '3rem' }}>The Smarter Way to Book Luxury</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { icon: '⚡', title: 'Instant Confirmation', desc: 'Booking confirmed the moment you complete payment. No waiting, no uncertainty.' },
                            { icon: '🔒', title: 'Secure Payments', desc: 'Military-grade encryption protects every transaction and personal detail.' },
                            { icon: '🎯', title: 'No Hidden Fees', desc: 'The price you see is exactly what you pay. Always transparent, always fair.' },
                            { icon: '🛎️', title: 'Smart Check-in', desc: 'FastInn\'s QR-powered check-in means you skip the front desk completely.' },
                        ].map(f => (
                            <div key={f.title} style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', padding: '2rem 1.5rem', textAlign: 'center',
                                transition: 'border-color 0.2s',
                            }}>
                                <div style={{ fontSize: '2.25rem', marginBottom: '1rem', filter: 'grayscale(0.2)' }}>{f.icon}</div>
                                <h4 style={{ marginBottom: '0.5rem', fontFamily: "'Playfair Display',serif" }}>{f.title}</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───────── FOOTER ───────── */}
            <footer style={{ padding: '3rem 0 2rem', borderTop: '1px solid var(--border)' }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, background: 'linear-gradient(135deg,var(--gold),var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.4rem' }}>FastInn</div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 260, lineHeight: 1.6 }}>Luxury hotel bookings, reimagined with AI-powered concierge service.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '3rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.75rem' }}>Explore</div>
                            {['All Hotels', 'New Delhi', 'Jaipur', 'Goa'].map(l => <div key={l} style={{ marginBottom: '0.5rem' }}><Link href={`/?city=${l}`} style={{ color: 'inherit', transition: 'color 0.2s' }}>{l}</Link></div>)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.75rem' }}>Account</div>
                            {[['My Bookings', '/my-bookings'], ['Sign In', '/login']].map(([l, href]) => (
                                <div key={l} style={{ marginBottom: '0.5rem' }}><Link href={href} style={{ color: 'inherit' }}>{l}</Link></div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="container" style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    © {new Date().getFullYear()} FastInn Technologies. All rights reserved.
                </div>
            </footer>
        </>
    );
}
