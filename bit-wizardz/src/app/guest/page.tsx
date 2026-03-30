'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GuestPage() {
    const router = useRouter();
    const [guestName, setGuestName] = useState('');
    const [roomNo, setRoomNo] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const name = localStorage.getItem('guest_name');
        const room = localStorage.getItem('guest_room');
        const session = localStorage.getItem('guest_session');

        if (!name || !room || !session) {
            router.push('/');
            return;
        }

        setGuestName(name);
        setRoomNo(room);
        setSessionId(session);

        // Poll for admin-initiated checkout
        const checkStatus = async () => {
            try {
                const { supabase } = await import('@/lib/supabase');
                const { data } = await supabase
                    .from('checkins')
                    .select('status')
                    .eq('session_id', session)
                    .single();

                if (data && data.status === 'checked_out') {
                    localStorage.removeItem('guest_name');
                    localStorage.removeItem('guest_room');
                    localStorage.removeItem('guest_session');
                    alert('You have been checked out by the Front Desk.');
                    router.push('/');
                }
            } catch (e) {
                console.error('Polling error', e);
            }
        };

        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, [router]);

    const doCheckout = async () => {
        setShowConfirm(false);
        setLoading(true);
        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Pass session_id as primary — server resolves room from DB
                body: JSON.stringify({ session_id: sessionId, room_no: roomNo }),
            });

            if (res.ok) {
                localStorage.removeItem('guest_name');
                localStorage.removeItem('guest_room');
                localStorage.removeItem('guest_session');
                alert('Checked out successfully!');
                router.push('/');
            } else {
                const data = await res.json();
                alert('Checkout failed: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            console.error(e);
            alert('Network error during checkout');
        } finally {
            setLoading(false);
        }
    };

    if (!guestName) return <div className="p-8 text-center text-gray-500">Loading your room...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative">

            {/* Inline confirm modal */}
            {showConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, padding: 28,
                        maxWidth: 380, width: '100%', textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                    }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ready to check out?</h2>
                        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                            This will clear your room assignment. You'll be redirected to the home screen.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={doCheckout}
                                style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                            >
                                Check out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm text-center border-t-8 border-blue-600">
                <div className="mb-6">
                    <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-2">Welcome Guest</p>
                    <h1 className="text-2xl font-bold text-gray-800">{guestName}</h1>
                </div>

                <div className="py-8 bg-blue-50 rounded-lg border border-blue-100 mb-8">
                    <p className="text-blue-600 uppercase font-bold text-sm mb-1">Your Room</p>
                    <p className="text-6xl font-black text-blue-900">{roomNo}</p>
                </div>

                <div className="text-xs text-center text-gray-400 font-mono mb-8">
                    Session: {sessionId}
                </div>

                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={loading}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {loading ? 'Checking out…' : <><span className="text-xl">👋</span> Checkout Now</>}
                </button>
            </div>

            <p className="mt-8 text-gray-400 text-sm">Have a pleasant stay!</p>
        </div>
    );
}
