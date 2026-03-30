'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AuthKeyManager from '@/components/AuthKeyManager';
import { getSessionQrUrl, monitorCheckinStatus, pollCheckinStatus } from '@/lib/checkin-monitor';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const DASHBOARD_PIN = '1670';

export default function DashboardPage() {
    const router = useRouter();

    // PIN Gate
    const [unlocked, setUnlocked] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const pinRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (sessionStorage.getItem('dash_pin') === DASHBOARD_PIN) setUnlocked(true);
    }, []);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === DASHBOARD_PIN) {
            sessionStorage.setItem('dash_pin', DASHBOARD_PIN);
            setUnlocked(true);
            setPinError(false);
        } else {
            setPinError(true);
            setPin('');
            pinRef.current?.focus();
        }
    };

    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // Tab State
    const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'rooms' | 'settings'>('overview');

    // Stats State
    const [stats, setStats] = useState({
        totalGuests: 0,
        activeRooms: 0,
        pendingArrivals: 0,
        totalRevenue: 0
    });

    // Session State
    const [sessionId, setSessionId] = useState('');
    const [monitorStatus, setMonitorStatus] = useState<'idle' | 'waiting' | 'verified'>('idle');
    const [verifiedData, setVerifiedData] = useState<any>(null);
    const [checkinMsg, setCheckinMsg] = useState('');

    // Load Stats
    useEffect(() => {
        if (!unlocked) return;
        const fetchStats = async () => {
            const h = await getHeaders();
            const res = await fetch('/api/stats', { headers: h });
            const data = await res.json();
            if (data.stats) {
                setStats({
                    totalGuests: data.stats.currentGuests,
                    activeRooms: data.stats.occupiedRooms,
                    pendingArrivals: data.stats.pendingArrivals,
                    totalRevenue: data.stats.totalRevenue
                });
            }
        };
        fetchStats();
    }, [unlocked]);

    const getHeaders = async () => {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('dash_pin') || DASHBOARD_PIN}`
        };
    };

    // Pending arrivals for Kiosk
    const [pendingBookings, setPendingBookings] = useState<any[]>([]);
    const [selectedBooking, setSelectedBooking] = useState('');

    useEffect(() => {
        if (unlocked && activeTab === 'overview') {
            const fetchArrivals = async () => {
                const headers = await getHeaders();
                const res = await fetch('/api/bookings', { headers });
                const d = await res.json();

                if (d.bookings) {
                    const today = new Date().toISOString().split('T')[0];
                    setPendingBookings(d.bookings.filter((b: any) =>
                        ['confirmed', 'pending'].includes(b.status) &&
                        b.check_in_date >= today
                    ).sort((a: any, b: any) => a.check_in_date.localeCompare(b.check_in_date)));
                }
            };
            fetchArrivals();
        }
    }, [unlocked, activeTab]);

    const handleGenerateSession = async () => {
        if (!selectedBooking) return alert('Please select an arrival first!');

        const nonce = `FASTINN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const booking = pendingBookings.find((b: any) => b.id === selectedBooking);
        const headers = await getHeaders();

        const res = await fetch('/api/admin/action', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                action: 'generate_qr',
                bookingId: selectedBooking,
                hotelId: booking?.hotel_id,
                nonce
            })
        });

        if (!res.ok) {
            alert('Failed to authorize check-in');
            return;
        }

        setSessionId(nonce);
        setMonitorStatus('waiting');
        setVerifiedData(null);
        setCheckinMsg('');
    };

    const handleDirectCheckin = async () => {
        if (!selectedBooking) return alert('Please select an arrival first!');
        if (!confirm('Manually check in this guest? This bypasses face verification.')) return;

        const booking = pendingBookings.find((b: any) => b.id === selectedBooking);
        const headers = await getHeaders();
        const nonce = `MANUAL-${Date.now()}`;

        const res = await fetch('/api/admin/action', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                action: 'direct_checkin',
                bookingId: selectedBooking,
                hotelId: booking?.hotel_id,
                nonce
            })
        });

        if (!res.ok) {
            setCheckinMsg('❌ Check-in failed: API Error');
            return;
        }

        setVerifiedData({ mode: 'manual', guest: booking?.users?.name || 'Guest', booking_id: selectedBooking });
        setMonitorStatus('verified');
        setCheckinMsg('');
        setPendingBookings(prev => prev.filter((b: any) => b.id !== selectedBooking));
        setSelectedBooking('');
    };

    // Monitor Effect
    useEffect(() => {
        if (monitorStatus === 'waiting' && sessionId) {
            const cleanup = monitorCheckinStatus(sessionId, (status, data) => {
                setMonitorStatus('verified');
                setVerifiedData(data);
            });
            const stopPolling = pollCheckinStatus(sessionId, (data) => {
                setMonitorStatus('verified');
                setVerifiedData(data);
            });
            return () => {
                cleanup();
                stopPolling();
            };
        }
    }, [sessionId, monitorStatus]);

    // Enhanced PIN Gate
    if (!unlocked) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a] relative overflow-hidden font-sans">
            {/* Ambient Background Lights */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d4af37]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

            <form onSubmit={handlePinSubmit} className="relative z-10 text-center p-10 bg-[#0c1220]/80 backdrop-blur-xl rounded-3xl border border-[#1e293b] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] w-full max-w-[400px]">
                <div className="text-[3rem] mb-4 text-[#d4af37] drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">🏛️</div>
                <h2 className="text-[#fff] font-bold text-2xl tracking-tight mb-2 font-serif">FastInn OS</h2>
                <p className="text-[#94a3b8] text-sm tracking-wide mb-8 uppercase">Administrative Access</p>

                <input
                    ref={pinRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pin}
                    onChange={e => { setPin(e.target.value); setPinError(false); }}
                    placeholder="ENTER PIN"
                    autoFocus
                    className={`w-full p-4 rounded-xl border ${pinError ? 'border-red-500/50 bg-red-950/20' : 'border-[#d4af37]/30 bg-[#0f172a]'} text-white text-xl tracking-[0.5em] text-center outline-none transition-all duration-300 focus:border-[#d4af37] focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] mb-3`}
                />

                <div className="h-6">
                    {pinError && <p className="text-red-400 text-xs font-bold uppercase tracking-wider animate-pulse">Access Denied</p>}
                </div>

                <button type="submit" className="w-full mt-4 py-4 bg-gradient-to-r from-[#b38a2e] to-[#d4af37] text-black font-bold uppercase tracking-widest text-sm rounded-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all duration-300 transform active:scale-[0.98]">
                    Authenticate
                </button>
            </form>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#05080f] text-slate-200 overflow-hidden font-sans selection:bg-[#d4af37] selection:text-black">
            {/* Sidebar */}
            <aside
                className={`flex-shrink-0 h-full bg-[#0a0f1a] border-r border-white/5 shadow-2xl z-30 transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 lg:w-0 lg:translate-x-0 lg:opacity-100'}`}
                style={{ width: sidebarOpen ? '17rem' : '0' }}
            >
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2 mb-1 font-serif">
                            Fast<span className="text-[#d4af37]">Inn</span>
                        </h1>
                        <p className="text-[0.6rem] uppercase tracking-widest text-[#d4af37]/80 font-bold">Property Management</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
                    <p className="px-4 text-[0.65rem] uppercase tracking-widest text-slate-500 font-bold mb-2">Operations</p>
                    <TabButton label="Reception Desk" icon="🛎️" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <TabButton label="All Reservations" icon="📅" active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} />

                    <p className="px-4 text-[0.65rem] uppercase tracking-widest text-slate-500 font-bold mb-2 mt-6">Inventory</p>
                    <TabButton label="Property Spaces" icon="🏨" active={activeTab === 'rooms'} onClick={() => setActiveTab('rooms')} />

                    <p className="px-4 text-[0.65rem] uppercase tracking-widest text-slate-500 font-bold mb-2 mt-6">System</p>
                    <TabButton label="Security & Auth" icon="🔐" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </nav>

                <div className="p-6 border-t border-white/5 bg-gradient-to-t from-black/50 to-transparent">
                    <button
                        onClick={async () => {
                            if (!confirm('Lock terminal?')) return;
                            sessionStorage.removeItem('dash_pin');
                            setUnlocked(false);
                        }}
                        className="w-full py-3 px-4 rounded-xl text-left text-white/50 hover:bg-white/5 hover:text-white font-medium text-sm transition-all flex items-center gap-3 group"
                    >
                        <span className="opacity-50 group-hover:opacity-100 transition-opacity">🔒</span> Secure Terminal
                    </button>
                    <div className="mt-4 px-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse"></div>
                        <p className="text-[10px] text-slate-500 font-mono tracking-wider">System Live • v2.0</p>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto relative">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[40%] bg-[#d4af37]/5 rounded-full blur-[150px] pointer-events-none" />

                <div className="max-w-[1400px] mx-auto p-8 relative z-10 w-full min-h-full flex flex-col">

                    {/* Header Strip */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-6 border-b border-white/10">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 backdrop-blur-md">
                                {sidebarOpen ? '◀' : '☰'}
                            </button>
                            <div>
                                <h2 className="text-3xl font-serif text-white tracking-tight leading-none mb-2">
                                    {activeTab === 'overview' && 'Reception Desk'}
                                    {activeTab === 'rooms' && 'Property Spaces'}
                                    {activeTab === 'bookings' && 'Reservations Matrix'}
                                    {activeTab === 'settings' && 'Platform Security'}
                                </h2>
                                <p className="text-sm text-[#d4af37] tracking-wide">Grand Luxe Resort & Spa</p>
                            </div>
                        </div>

                        {/* Top Stats - Luxury Style */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                            <StatBlock label="Daily Rev" value={`$${stats.totalRevenue.toLocaleString()}`} color="text-[#d4af37]" />
                            <StatBlock label="Arrivals" value={stats.pendingArrivals.toString()} color="text-amber-400" />
                            <StatBlock label="In-House" value={stats.totalGuests.toString()} color="text-white" />
                            <StatBlock label="Occ Rooms" value={stats.activeRooms.toString()} color="text-blue-400" />
                        </div>
                    </div>

                    <div className="flex-1">
                        {/* TAB CONTENT: OVERVIEW (QR & MONITOR) */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Kiosk Controller */}
                                <div className="lg:col-span-5 bg-[#0f172a]/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                        <h3 className="font-bold text-white tracking-wide uppercase text-xs flex items-center gap-3">
                                            <span className="text-[#d4af37]">01</span> Authorization Terminal
                                        </h3>
                                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></div>
                                    </div>

                                    <div className="p-8 flex flex-col items-center justify-center flex-1">
                                        {!sessionId ? (
                                            <div className="w-full max-w-sm">
                                                <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/10 flex items-center justify-center text-3xl mb-6 border border-[#d4af37]/30 shadow-[0_0_30px_rgba(212,175,55,0.1)]">🎟️</div>
                                                <h4 className="text-xl font-serif text-white mb-2">Initialize Check-in</h4>
                                                <p className="text-slate-400 text-sm mb-8 leading-relaxed">Select a guest from today's arrivals to securely transmit check-in credentials to the local terminal.</p>

                                                {checkinMsg && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">{checkinMsg}</div>}

                                                <div className="mb-6">
                                                    <select
                                                        value={selectedBooking}
                                                        onChange={(e) => setSelectedBooking(e.target.value)}
                                                        className="w-full bg-[#05080f] border border-white/10 text-white rounded-xl p-4 focus:outline-none focus:border-[#d4af37] text-sm appearance-none cursor-pointer transition-colors hover:border-white/20 shadow-inner"
                                                    >
                                                        <option value="">Select Scheduled Arrival...</option>
                                                        {pendingBookings.map(b => {
                                                            const preChecked = (b as any).users?.identity_verified && (b as any).users?.face_verified;
                                                            return (
                                                                <option key={b.id} value={b.id}>
                                                                    {b.users?.name || 'Guest'} — {b.room_types?.name} {preChecked ? '[PRE-VERIFIED]' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>

                                                <div className="space-y-3">
                                                    <button
                                                        onClick={handleGenerateSession}
                                                        disabled={!selectedBooking}
                                                        className="w-full py-4 bg-[#d4af37] text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-[#eacc64] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all disabled:opacity-30 disabled:hover:shadow-none"
                                                    >
                                                        Transmit Secure Key
                                                    </button>
                                                    <button
                                                        onClick={handleDirectCheckin}
                                                        disabled={!selectedBooking}
                                                        className="w-full py-4 bg-transparent border border-white/20 text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white/5 transition-all disabled:opacity-30"
                                                    >
                                                        Bypass Face Scan
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center w-full max-w-sm">
                                                <div className="p-8 bg-white rounded-[2rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-8">
                                                    <QRCodeSVG value={getSessionQrUrl(sessionId)} size={220} />
                                                </div>
                                                <p className="font-mono font-bold text-xl tracking-[0.2em] text-[#d4af37] mb-2">{sessionId}</p>
                                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-10">Scan to authenticate</p>

                                                <div className="flex gap-4 w-full">
                                                    <button
                                                        onClick={() => { if (confirm('Revoke access key?')) setSessionId(''); }}
                                                        className="flex-1 py-3 bg-red-500/10 text-red-400 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-red-500/20 transition border border-red-500/20"
                                                    >
                                                        Revoke
                                                    </button>
                                                    <a
                                                        href={getSessionQrUrl(sessionId)}
                                                        target="_blank"
                                                        className="flex-1 py-3 bg-[#d4af37] text-black text-center font-bold uppercase tracking-wider text-xs rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition shrink-0"
                                                    >
                                                        Local Launch
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Live Feed */}
                                <div className="lg:col-span-7 bg-[#0f172a]/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col relative">
                                    <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#d4af37]/5 blur-[80px] rounded-full pointer-events-none" />

                                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                        <h3 className="font-bold text-white tracking-wide uppercase text-xs flex items-center gap-3">
                                            <span className="text-[#d4af37]">02</span> Telemetry Feed
                                        </h3>
                                        <span className={`text-[9px] uppercase tracking-widest font-black px-3 py-1.5 rounded-md ${monitorStatus === 'idle' ? 'bg-white/10 text-slate-400 border border-white/10' :
                                                monitorStatus === 'waiting' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                            {monitorStatus}
                                        </span>
                                    </div>

                                    <div className="p-8 flex-1 flex flex-col items-center justify-center relative">
                                        {monitorStatus === 'idle' && (
                                            <div className="text-center">
                                                <div className="w-24 h-24 mx-auto border border-white/10 rounded-full flex items-center justify-center mb-6">
                                                    <span className="text-[#d4af37]/30 text-3xl">⧖</span>
                                                </div>
                                                <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Awaiting Instructions</p>
                                            </div>
                                        )}
                                        {monitorStatus === 'waiting' && (
                                            <div className="text-center relative">
                                                <div className="absolute inset-0 border border-[#d4af37]/20 rounded-full animate-ping"></div>
                                                <div className="mx-auto h-24 w-24 border border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(212,175,55,0.2)]"></div>
                                                <p className="text-lg font-serif text-[#d4af37]">Connection Established</p>
                                                <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-medium">Awaiting biometric handshake</p>
                                            </div>
                                        )}
                                        {monitorStatus === 'verified' && (
                                            <div className="text-center w-full max-w-lg">
                                                <div className="w-24 h-24 mx-auto bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                                                    <span className="text-emerald-400 text-4xl">✓</span>
                                                </div>
                                                <h2 className="text-3xl font-serif text-white mb-2">Verification Successful</h2>
                                                <p className="text-[#d4af37] text-sm uppercase tracking-widest font-bold mb-8">Access Granted</p>

                                                <div className="bg-[#05080f] p-6 rounded-2xl border border-white/10 text-left text-xs font-mono text-emerald-400 overflow-auto max-h-64 shadow-inner mb-8 leading-loose">
                                                    {JSON.stringify(verifiedData, null, 2)}
                                                </div>
                                                <button
                                                    onClick={() => { setMonitorStatus('waiting'); setVerifiedData(null); }}
                                                    className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition uppercase tracking-widest text-xs font-bold"
                                                >
                                                    Queue Next Operation
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'bookings' && <BookingsManager />}
                        {activeTab === 'rooms' && <RoomManager />}
                        {activeTab === 'settings' && (
                            <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-10 max-w-2xl">
                                <h3 className="text-xl font-serif text-white mb-8">Authorised Endpoints</h3>
                                <AuthKeyManager />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Minimal Components
function TabButton({ label, icon, active, onClick }: { label: string, icon: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 w-full mb-1 group ${active
                ? 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] translate-x-1'
                : 'text-slate-400 border border-transparent hover:border-white/5 hover:bg-white/5 hover:text-white'
                }`}
        >
            <span className={`text-[1.1rem] transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
            {label}
        </button>
    );
}

function StatBlock({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className="flex flex-col md:items-end">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{label}</p>
            <p className={`text-2xl md:text-3xl font-serif leading-none ${color}`}>{value}</p>
        </div>
    );
}

function RoomManager() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    const getHeaders = async () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('dash_pin') || DASHBOARD_PIN}`
    });

    const fetchRooms = async () => {
        const headers = await getHeaders();
        const res = await fetch('/api/rooms', { headers });
        const data = await res.json();
        if (data.rooms) setRooms(data.rooms);
    };

    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleCheckout = async (roomNo: string) => {
        if (!confirm(`Force checkout Room ${roomNo}?`)) return;
        const res = await fetch('/api/rooms', { method: 'PATCH', headers: await getHeaders(), body: JSON.stringify({ room_no: roomNo, status: 'vacant' }) });
        if (res.ok) fetchRooms();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {showAddModal && <AddRoomModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); fetchRooms(); }} getHeaders={getHeaders} />}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0f172a]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl gap-4">
                <div>
                    <h3 className="font-serif text-2xl text-white">Space Allocation Matrix</h3>
                    <p className="text-sm text-[#d4af37] tracking-wider mt-1">Real-time Suite Inventory</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowAddModal(true)} className="text-xs uppercase tracking-widest px-6 py-3 bg-[#d4af37] text-black rounded-xl hover:bg-[#eacc64] font-bold transition shadow-lg shrink-0">➕ New Space</button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {rooms.map(room => (
                    <div
                        key={room.room_no}
                        className={`relative p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center justify-center text-center aspect-[4/5] ${room.status === 'occupied'
                                ? 'bg-[#1a0f12] border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)] hover:border-red-500/50'
                                : 'bg-white/5 border-white/10 shadow-lg hover:border-[#d4af37]/50 hover:bg-white/10'
                            }`}
                    >
                        <div className={`absolute top-4 right-4 h-2 w-2 rounded-full ${room.status === 'occupied' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                            }`}></div>

                        <span className="font-serif text-4xl text-white mb-2">{room.room_no}</span>
                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-6 ${room.status === 'occupied' ? 'text-red-400' : 'text-[#d4af37]'}`}>
                            {room.status}
                        </p>

                        {room.status === 'occupied' ? (
                            <button
                                onClick={() => handleCheckout(room.room_no)}
                                className="mt-auto w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase tracking-widest font-bold rounded-lg hover:bg-red-500 hover:text-white transition-all"
                            >
                                Release
                            </button>
                        ) : (
                            <div className="mt-auto h-8 flex items-center justify-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                Ready
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AddRoomModal({ onClose, onAdded, getHeaders }: any) {
    const [types, setTypes] = useState<any[]>([]);
    const [roomNo, setRoomNo] = useState('');
    const [floor, setFloor] = useState('');
    const [typeId, setTypeId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getHeaders().then((h: any) => fetch('/api/room-types', { headers: h }).then(r => r.json()).then(d => {
            if (d.roomTypes) { setTypes(d.roomTypes); if (d.roomTypes.length) setTypeId(d.roomTypes[0].id); }
        }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch('/api/rooms', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ room_no: roomNo, room_type_id: typeId, floor }) });
        const data = await res.json();
        setSaving(false);
        if (data.success) onAdded();
        else alert(data.error || 'Failed');
    };

    return (
        <div className="fixed inset-0 bg-[#05080f]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f172a] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5">
                    <h3 className="font-serif text-2xl text-white">Add Spatial Unit</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black tracking-widest text-[#d4af37] uppercase mb-3 text-center">Designation</label>
                        <input type="text" required value={roomNo} onChange={e => setRoomNo(e.target.value)} className="w-full bg-[#05080f] border-b-2 border-white/10 py-3 text-center text-3xl font-serif text-white focus:outline-none focus:border-[#d4af37] transition-colors placeholder:text-white/10" placeholder="101" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3 text-center">Level Sector</label>
                        <input type="text" value={floor} onChange={e => setFloor(e.target.value)} className="w-full bg-[#05080f] border-b-2 border-white/10 py-3 text-center text-xl font-serif text-white focus:outline-none focus:border-[#d4af37] transition-colors placeholder:text-white/10" placeholder="01" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3 text-center">Classification</label>
                        <select value={typeId} onChange={e => setTypeId(e.target.value)} className="w-full bg-[#05080f] border border-white/10 rounded-xl p-4 text-center text-white focus:outline-none focus:border-[#d4af37] transition-colors appearance-none">
                            {types.map(t => <option key={t.id} value={t.id}>{t.name} (Cap {t.capacity})</option>)}
                        </select>
                    </div>
                    <div className="pt-6 flex gap-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-white/5 text-white text-xs tracking-widest uppercase font-bold rounded-xl hover:bg-white/10 transition">Discard</button>
                        <button type="submit" disabled={saving} className="flex-1 py-4 bg-[#d4af37] text-black text-xs tracking-widest uppercase font-bold rounded-xl hover:bg-[#eacc64] transition disabled:opacity-50 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                            {saving ? 'Processing' : 'Commit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function BookingsManager() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    const getHeaders = async () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('dash_pin') || DASHBOARD_PIN}`
    });

    const fetchBookings = async () => {
        const res = await fetch('/api/bookings', { headers: await getHeaders() });
        const data = await res.json();
        if (data.bookings) setBookings(data.bookings);
    };

    useEffect(() => { fetchBookings(); }, []);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {showAddModal && <AddBookingModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); fetchBookings(); }} getHeaders={getHeaders} />}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0f172a]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl gap-4">
                <div>
                    <h3 className="font-serif text-2xl text-white">Central Ledger</h3>
                    <p className="text-sm text-[#d4af37] tracking-wider mt-1">Global Reservation Manifest</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowAddModal(true)} className="text-xs uppercase tracking-widest px-6 py-3 bg-[#d4af37] text-black rounded-xl hover:bg-[#eacc64] font-bold transition shadow-lg shrink-0">➕ Append Record</button>
                </div>
            </div>

            <div className="bg-[#0f172a]/80 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                        <thead className="bg-white/5 text-[#d4af37] uppercase font-black text-[10px] tracking-widest border-b border-white/10">
                            <tr>
                                <th className="px-8 py-6">Client Identity</th>
                                <th className="px-8 py-6">Arrival Timeline</th>
                                <th className="px-8 py-6">Departure</th>
                                <th className="px-8 py-6">Suite Tier</th>
                                <th className="px-8 py-6 text-right">Status Code</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {bookings.map(b => (
                                <tr key={b.id} className="hover:bg-white/[0.03] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-serif text-lg text-white group-hover:text-[#d4af37] transition-colors">{b.users?.name || 'Unidentified'}</div>
                                    </td>
                                    <td className="px-8 py-6 font-mono text-slate-400">{b.check_in_date}</td>
                                    <td className="px-8 py-6 font-mono text-slate-400">{b.check_out_date}</td>
                                    <td className="px-8 py-6 text-slate-300">{b.room_types?.name || '—'}</td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-widest border ${b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                b.status === 'checked_in' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    b.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                        'bg-white/5 text-slate-400 border-white/10'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'confirmed' ? 'bg-emerald-400' :
                                                    b.status === 'checked_in' ? 'bg-blue-400' :
                                                        b.status === 'pending' ? 'bg-amber-400' : 'bg-slate-400'
                                                }`}></span>
                                            {b.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {bookings.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-serif">Registry is currently empty.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function AddBookingModal({ onClose, onAdded, getHeaders }: any) {
    const [types, setTypes] = useState<any[]>([]);
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [guestId, setGuestId] = useState('');
    const [typeId, setTypeId] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getHeaders().then((h: any) => fetch('/api/room-types', { headers: h }).then(r => r.json()).then(d => {
            if (d.roomTypes) { setTypes(d.roomTypes); if (d.roomTypes.length) setTypeId(d.roomTypes[0].id); }
        }));
        const toDay = (d: Date) => d.toISOString().split('T')[0];
        setCheckIn(toDay(new Date()));
        setCheckOut(toDay(new Date(Date.now() + 86400000)));
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ)}`, { headers: await getHeaders() });
        const data = await res.json();
        setSearchResults(data.users || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestId) return alert('Target identity required.');
        setSaving(true);
        const res = await fetch('/api/bookings', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ guest_id: guestId, room_type_id: typeId, check_in_date: checkIn, check_out_date: checkOut, total_amount: 500.00 }) });
        const data = await res.json();
        setSaving(false);
        if (data.success) onAdded();
        else alert(data.error || 'Failed');
    };

    return (
        <div className="fixed inset-0 bg-[#05080f]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f172a] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-serif text-2xl text-white">New Reservation</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
                </div>

                <div className="p-8 overflow-y-auto space-y-8 flex-1">
                    <div className="bg-[#05080f] p-6 rounded-2xl border border-white/5">
                        <label className="block text-[10px] font-black tracking-widest text-[#d4af37] uppercase mb-4">Phase 1: Identity Resolution</label>
                        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
                            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} className="flex-1 bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#d4af37]" placeholder="Name / Contact..." />
                            <button type="submit" className="px-6 py-3 bg-white/10 rounded-xl font-bold text-xs uppercase tracking-widest text-white hover:bg-white/20 transition">Scan</button>
                        </form>
                        {searchResults.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {searchResults.map(u => (
                                    <div key={u.id} onClick={() => setGuestId(u.id)} className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${guestId === u.id ? 'border-[#d4af37] bg-[#d4af37]/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-white/5 bg-[#0f172a] hover:border-white/20'}`}>
                                        <div>
                                            <p className="font-serif text-white text-lg">{u.name}</p>
                                            <p className="text-[10px] font-mono text-slate-500 tracking-wider mt-1">{u.email}</p>
                                        </div>
                                        {u.verified && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3">Arrival Vector</label>
                                <input type="date" required value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full bg-[#05080f] border border-white/10 rounded-xl p-4 text-white text-sm font-mono focus:outline-none focus:border-[#d4af37]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3">Departure Vector</label>
                                <input type="date" required value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full bg-[#05080f] border border-white/10 rounded-xl p-4 text-white text-sm font-mono focus:outline-none focus:border-[#d4af37]" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3">Suite Classification</label>
                            <select value={typeId} onChange={e => setTypeId(e.target.value)} className="w-full bg-[#05080f] border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-[#d4af37] appearance-none">
                                {types.map(t => <option key={t.id} value={t.id}>{t.name} (Cap {t.capacity})</option>)}
                            </select>
                        </div>
                    </form>
                </div>

                <div className="p-8 border-t border-white/5 bg-gradient-to-t from-black/50 to-transparent flex gap-4">
                    <button type="button" onClick={onClose} className="flex-1 py-4 bg-white/5 text-white text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-white/10 transition">Abort</button>
                    <button type="submit" form="booking-form" disabled={saving || !guestId} className="flex-1 py-4 bg-[#d4af37] text-black text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-[#eacc64] transition disabled:opacity-50">
                        {saving ? 'Processing...' : 'Write Ledger'}
                    </button>
                </div>
            </div>
        </div>
    );
}

