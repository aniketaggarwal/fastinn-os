'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Hotel = {
    id: string; name: string; location: string; city: string; country: string;
    description: string; star_rating: number; base_price: number;
    amenities: string[]; images: string[];
    room_types: RoomType[];
};
type RoomType = {
    id: string; name: string; base_price: number; capacity: number;
    description: string;
};

const AMENITY_ICONS: Record<string, string> = {
    pool: '🏊', spa: '💆', gym: '🏋️', wifi: '📶', restaurant: '🍽️', valet: '🚗', bar: '🍸', concierge: '🛎️', parking: '🅿️', rooftop: '🌆',
};

const GRADIENTS = [
    'linear-gradient(135deg,#1a1510,#3a2510)',
    'linear-gradient(135deg,#0a1a2a,#102a1a)',
    'linear-gradient(135deg,#1a1030,#2a1020)',
    'linear-gradient(135deg,#201a10,#301a0a)',
];

function Gallery({ images, name }: { images: string[], name: string }) {
    const gradient = GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
    const slots = [0, 1, 2, 3, 4].map(i => images[i] || null);
    return (
        <div className="gallery">
            {slots.map((src, i) => (
                <div key={i} className={i === 0 ? 'gallery-main' : ''} style={{ minHeight: 200 }}>
                    {src
                        ? <img src={src} alt={name} className="gallery-img" />
                        : <div className="gallery-placeholder" style={{ background: gradient, height: '100%' }}>🏨</div>}
                </div>
            ))}
        </div>
    );
}

export default function HotelPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [hotel, setHotel] = useState<Hotel | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
        fetch(`/api/hotels/${id}`)
            .then(r => r.json())
            .then(d => { setHotel(d.hotel || null); setLoading(false); });
    }, [id]);

    if (loading) return <div className="spinner-center" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;
    if (!hotel) return (
        <div className="spinner-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>😕</div>
            <h3>Hotel not found</h3>
            <Link href="/" className="btn btn-outline">← Back to Hotels</Link>
        </div>
    );

    return (
        <>
            {/* NAV */}
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
                <div className="nav-links">
                    <Link href="/" className="nav-link">← All Hotels</Link>
                    {user && <Link href="/my-bookings" className="nav-link">My Bookings</Link>}
                    {user
                        ? <button className="btn btn-outline btn-sm" onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}>Sign Out</button>
                        : <Link href="/login" className="btn btn-primary btn-sm">Sign In</Link>}
                </div>
            </nav>

            <div style={{ paddingTop: '5rem' }}>
                {/* GALLERY */}
                <div className="container-wide" style={{ paddingTop: '2rem', paddingBottom: '1rem' }}>
                    <Gallery images={hotel.images || []} name={hotel.name} />
                </div>

                <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3rem', alignItems: 'start' }}>

                        {/* LEFT */}
                        <div>
                            {/* Header */}
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                    <span className="badge badge-gold">{'★'.repeat(hotel.star_rating ?? 4)} {hotel.star_rating ?? 4}-Star</span>
                                    {hotel.city && <span className="badge badge-gold">📍 {hotel.city}</span>}
                                </div>
                                <h1 style={{ marginBottom: '0.5rem' }}>{hotel.name}</h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                                    📍 {hotel.location || hotel.city}, {hotel.country || 'India'}
                                </p>
                                {hotel.description && (
                                    <p style={{ color: 'var(--text-soft)', lineHeight: 1.8, fontSize: '1rem' }}>{hotel.description}</p>
                                )}
                            </div>

                            {/* Amenities */}
                            {hotel.amenities?.length > 0 && (
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <h3 style={{ marginBottom: '1rem' }}>Amenities</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {hotel.amenities.map(a => (
                                            <span key={a} className="amenity-pill" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
                                                {AMENITY_ICONS[a] ?? '✓'} {a.charAt(0).toUpperCase() + a.slice(1)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Room Types */}
                            <div>
                                <h3 style={{ marginBottom: '1.25rem' }}>Available Room Types</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {hotel.room_types?.length === 0 && (
                                        <p className="text-muted text-sm">No rooms configured yet. Check back soon.</p>
                                    )}
                                    {hotel.room_types?.map(rt => (
                                        <div key={rt.id} className="card room-card">
                                            <div className="room-card-img" style={{ background: GRADIENTS[rt.name.charCodeAt(0) % GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                                                🛏️
                                            </div>
                                            <div className="room-card-body">
                                                <div className="room-card-name">{rt.name}</div>
                                                <div className="room-card-capacity">👤 Up to {rt.capacity} guests</div>
                                                {rt.description && <p className="text-sm text-muted" style={{ marginBottom: '0.75rem', lineHeight: 1.6 }}>{rt.description}</p>}
                                                <div className="room-card-row">
                                                    <span className="room-price">₹{Number(rt.base_price).toLocaleString()}<span className="room-price-unit">/night</span></span>
                                                    <Link href={`/hotel/${hotel.id}/book?room_type_id=${rt.id}&room_type_name=${encodeURIComponent(rt.name)}&price=${rt.base_price}`} className="btn btn-primary btn-sm">
                                                        Book This Room →
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT — sticky summary */}
                        <div className="summary-box">
                            <div className="summary-title">Reserve Your Stay</div>
                            <div style={{ marginBottom: '1rem' }}>
                                <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
                                    Select a room type above to begin your booking. Prices shown are per night, before taxes.
                                </p>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-label">From</span>
                                <span className="summary-row-val text-gold">₹{Number(hotel.base_price || 0).toLocaleString()}/night</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-label">Location</span>
                                <span className="summary-row-val">{hotel.city || 'India'}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-label">Rating</span>
                                <span className="summary-row-val">{'★'.repeat(hotel.star_rating ?? 4)}</span>
                            </div>
                            <div style={{ marginTop: '1.5rem' }}>
                                <Link href={`/hotel/${hotel.id}/book`} className="btn btn-primary btn-lg w-full" style={{ justifyContent: 'center' }}>
                                    Book Now →
                                </Link>
                            </div>
                            {!user && (
                                <p className="text-xs text-muted mt-2" style={{ textAlign: 'center' }}>
                                    <Link href="/login" style={{ color: 'var(--gold)' }}>Sign in</Link> to continue booking
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
