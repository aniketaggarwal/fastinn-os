'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function PaymentPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const bookingId = searchParams.get('booking_id') || '';
    const total = Number(searchParams.get('total') || 0);
    const nights = Number(searchParams.get('nights') || 0);

    const [cardName, setCardName] = useState('');
    const [cardNum, setCardNum] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!bookingId) router.replace('/');
    }, [bookingId, router]);

    // Format card number with spaces
    const handleCardNum = (v: string) => setCardNum(v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim());
    const handleExpiry = (v: string) => {
        const clean = v.replace(/\D/g, '').slice(0, 4);
        setExpiry(clean.length > 2 ? clean.slice(0, 2) + '/' + clean.slice(2) : clean);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        // MVP: mark as offline confirmed without real charge
        const res = await fetch(`/api/bookings/${bookingId}/confirm`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_method: 'card_offline' }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) { setError(data.error || 'Payment failed. Please try again.'); return; }
        router.push(`/booking/confirm?booking_id=${bookingId}`);
    };

    return (
        <>
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
            </nav>

            <div style={{ paddingTop: '7rem', paddingBottom: '5rem' }}>
                <div className="container" style={{ maxWidth: 860 }}>
                    <div className="step-bar">
                        <div className="step done"><div className="step-num">✓</div><div className="step-label">Select Dates</div></div>
                        <div className="step-line done" />
                        <div className="step active"><div className="step-num">2</div><div className="step-label">Payment</div></div>
                        <div className="step-line" />
                        <div className="step"><div className="step-num">3</div><div className="step-label">Confirmation</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
                        <form onSubmit={handleSubmit}>
                            <h2 style={{ marginBottom: '0.5rem' }}>Secure Payment</h2>
                            <p className="text-sm text-muted mb-3">Your payment information is encrypted and secure.</p>

                            {error && <div className="alert alert-error mb-2">{error}</div>}

                            <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                    <span style={{ fontSize: '1.25rem' }}>💳</span>
                                    <h4>Card Details</h4>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                        {['Visa', 'MC', 'Amex'].map(b => (
                                            <span key={b} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'var(--surface-2)', borderRadius: 4, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{b}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Cardholder Name</label>
                                    <input type="text" className="form-input" placeholder="Name on card" value={cardName}
                                        onChange={e => setCardName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Card Number</label>
                                    <input type="text" className="form-input" placeholder="0000 0000 0000 0000"
                                        value={cardNum} onChange={e => handleCardNum(e.target.value)} required maxLength={19} />
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Expiry Date</label>
                                        <input type="text" className="form-input" placeholder="MM/YY"
                                            value={expiry} onChange={e => handleExpiry(e.target.value)} required maxLength={5} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">CVV</label>
                                        <input type="password" className="form-input" placeholder="•••"
                                            value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} required maxLength={4} />
                                    </div>
                                </div>
                            </div>

                            <div className="alert alert-info mb-3">
                                🔒 This is a demo environment. No real payment will be processed.
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                {loading
                                    ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                                    : `Pay ₹${Number(total).toLocaleString()} →`}
                            </button>
                            <p className="text-xs text-muted mt-2" style={{ textAlign: 'center' }}>
                                By completing this booking you agree to our Terms of Service.
                            </p>
                        </form>

                        <div className="summary-box">
                            <div className="summary-title">Order Summary</div>
                            <div className="summary-row"><span>Stay Duration</span><span className="summary-row-val">{nights} Night{nights !== 1 ? 's' : ''}</span></div>
                            <div className="summary-row"><span>Booking ID</span><span className="summary-row-val" style={{ fontSize: '0.7rem', fontFamily: 'monospace', opacity: 0.7 }}>{bookingId.slice(0, 8)}…</span></div>
                            <div className="divider" style={{ margin: '0.75rem 0' }} />
                            <div className="summary-total">
                                <span className="summary-total-label">Total Due</span>
                                <span className="summary-total-val">₹{Number(total).toLocaleString()}</span>
                            </div>
                            <div className="mt-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {['No hidden fees', 'Free cancellation within 24h', 'Instant confirmation'].map(t => (
                                    <div key={t} className="text-xs text-muted" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--gold)' }}>✓</span> {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
