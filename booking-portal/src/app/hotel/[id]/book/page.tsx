'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type RoomType = { id: string; name: string; base_price: number; capacity: number; };

export default function BookPage() {
    const { id: hotelId } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();

    const initRoomTypeId = searchParams.get('room_type_id') || '';
    const initPrice = Number(searchParams.get('price') || 0);

    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [selectedType, setSelectedType] = useState(initRoomTypeId);
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [availability, setAvailability] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const idempotencyKey = useRef(crypto.randomUUID());

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            const u = data.user;
            if (!u) { router.replace('/login'); return; }
            setGuestEmail(u.email || '');
            setGuestName(u.user_metadata?.name || '');
        });
        fetch(`/api/hotels/${hotelId}`)
            .then(r => r.json())
            .then(d => { if (d.hotel?.room_types) setRoomTypes(d.hotel.room_types); });
    }, [hotelId, router]);

    useEffect(() => {
        if (!checkIn || !checkOut) return;
        fetch(`/api/hotels/${hotelId}/availability?check_in=${checkIn}&check_out=${checkOut}`)
            .then(r => r.json())
            .then(d => {
                const map: Record<string, boolean> = {};
                (d.availableRoomTypeIds || []).forEach((id: string) => { map[id] = true; });
                setAvailability(map);
            });
    }, [hotelId, checkIn, checkOut]);

    const selectedRoomType = roomTypes.find(r => r.id === selectedType);
    const nights = checkIn && checkOut
        ? Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
        : 0;
    const pricePerNight = selectedRoomType?.base_price ?? initPrice;
    const total = pricePerNight * nights;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType) { setError('Please select a room type.'); return; }
        if (!checkIn || !checkOut || nights <= 0) { setError('Please select valid check-in and check-out dates.'); return; }
        if (checkIn && checkOut && Object.keys(availability).length > 0 && !availability[selectedType]) {
            setError('This room type is not available for the selected dates.'); return;
        }
        setError('');
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'Idempotency-Key': idempotencyKey.current,
            },
            body: JSON.stringify({
                hotel_id: hotelId,
                room_type_id: selectedType,
                check_in_date: checkIn,
                check_out_date: checkOut,
                total_amount: total,
                guest_name: guestName,
            }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error || 'Booking failed. Please try again.'); return; }
        router.push(`/hotel/${hotelId}/book/payment?booking_id=${data.booking.id}&total=${total}&nights=${nights}`);
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <>
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
                <div className="nav-links">
                    <Link href={`/hotel/${hotelId}`} className="nav-link">← Hotel Details</Link>
                </div>
            </nav>

            <div style={{ paddingTop: '7rem', paddingBottom: '5rem' }}>
                <div className="container" style={{ maxWidth: 860 }}>
                    <div className="step-bar">
                        <div className="step active"><div className="step-num">1</div><div className="step-label">Select Dates</div></div>
                        <div className="step-line" />
                        <div className="step"><div className="step-num">2</div><div className="step-label">Payment</div></div>
                        <div className="step-line" />
                        <div className="step"><div className="step-num">3</div><div className="step-label">Confirmation</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
                        <form onSubmit={handleSubmit}>
                            <h2 style={{ marginBottom: '1.5rem' }}>Select Your Stay</h2>
                            {error && <div className="alert alert-error mb-2">{error}</div>}

                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Check-in Date</label>
                                    <input type="date" className="form-input" value={checkIn} min={today}
                                        onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Check-out Date</label>
                                    <input type="date" className="form-input" value={checkOut} min={checkIn || today}
                                        onChange={e => setCheckOut(e.target.value)} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Room Type</label>
                                {roomTypes.length === 0 ? <p className="text-sm text-muted">Loading rooms…</p>
                                    : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {roomTypes.map(rt => {
                                            const avail = !checkIn || !checkOut || Object.keys(availability).length === 0 || availability[rt.id] === true;
                                            return (
                                                <label key={rt.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                                    background: selectedType === rt.id ? 'var(--gold-dim)' : 'var(--surface-2)',
                                                    border: `1px solid ${selectedType === rt.id ? 'var(--border-2)' : 'var(--border)'}`,
                                                    borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem',
                                                    cursor: avail ? 'pointer' : 'not-allowed', opacity: avail ? 1 : 0.45,
                                                    transition: 'all 0.15s',
                                                }}>
                                                    <input type="radio" name="room_type" value={rt.id} checked={selectedType === rt.id}
                                                        onChange={() => setSelectedType(rt.id)} disabled={!avail}
                                                        style={{ accentColor: 'var(--gold)', width: 16, height: 16 }} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{rt.name}</div>
                                                        <div className="text-xs text-muted">👤 Up to {rt.capacity} guests</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 700, color: 'var(--gold)' }}>₹{Number(rt.base_price).toLocaleString()}</div>
                                                        <div className="text-xs text-muted">/night</div>
                                                    </div>
                                                    {checkIn && checkOut && !avail && <span className="badge badge-red">Booked</span>}
                                                </label>
                                            );
                                        })}
                                    </div>}
                            </div>

                            <h3 style={{ margin: '1.5rem 0 1rem' }}>Guest Details</h3>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input type="text" className="form-input" value={guestName}
                                    onChange={e => setGuestName(e.target.value)} placeholder="As per ID" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input type="email" className="form-input" value={guestEmail} readOnly style={{ opacity: 0.7 }} />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg w-full" style={{ marginTop: '1rem' }} disabled={loading}>
                                {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Continue to Payment →'}
                            </button>
                        </form>

                        <div className="summary-box">
                            <div className="summary-title">Booking Summary</div>
                            <div className="summary-row"><span>Room</span><span className="summary-row-val">{selectedRoomType?.name || '—'}</span></div>
                            <div className="summary-row"><span>Check-in</span><span className="summary-row-val">{checkIn || '—'}</span></div>
                            <div className="summary-row"><span>Check-out</span><span className="summary-row-val">{checkOut || '—'}</span></div>
                            <div className="summary-row"><span>Nights</span><span className="summary-row-val">{nights || '—'}</span></div>
                            <div className="summary-row"><span>Per Night</span><span className="summary-row-val">₹{Number(pricePerNight || 0).toLocaleString()}</span></div>
                            <div className="summary-total">
                                <span className="summary-total-label">Total</span>
                                <span className="summary-total-val">₹{Number(total).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-muted mt-2">Inclusive of all taxes.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
