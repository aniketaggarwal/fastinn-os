'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import '../login.css';
import '../page-shell.css';

const TILES = [
    {
        href: '/upload-id',
        icon: '📄',
        label: 'Re-Verify ID',
        desc: 'Manage your identity document',
        accent: '#dbeafe',
        accentBorder: '#bfdbfe',
    },
    {
        href: '/register-face',
        icon: '👤',
        label: 'Re-Scan Face',
        desc: 'Update your biometric profile',
        accent: '#fef3c7',
        accentBorder: '#fde68a',
    },
    {
        href: '/checkin',
        icon: '🏨',
        label: 'Self Check-in',
        desc: 'Guest kiosk mode',
        accent: '#dcfce7',
        accentBorder: '#bbf7d0',
    },
    {
        href: '/profile',
        icon: '🆔',
        label: 'Your Profile',
        desc: 'View account details',
        accent: '#ede9fe',
        accentBorder: '#ddd6fe',
    },
];

export default function MenuPage() {
    const router = useRouter();

    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileCloseTimeout = useRef<any>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [userName, setUserName] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase.from('users').select('name').eq('id', user.id).single()
                    .then(({ data }) => { if (data?.name) setUserName(data.name); });
            }
        });
        setMounted(true);
    }, []);

    const firstName = mounted && userName ? userName.split(' ')[0] : '';
    const today = mounted ? new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

    return (
        <main className="fi-page" style={{ minHeight: '100vh' }}>

            {/* ── Logout modal ── */}
            {showLogoutConfirm && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h2 style={{ color: '#dc2626' }}>Logging Out?</h2>
                        <p>You're about to sign out of your account.</p>
                        <div className="modal-actions">
                            <button className="modal-btn modal-btn--yes" onClick={async () => {
                                setShowLogoutConfirm(false);
                                const { data: { user } } = await supabase.auth.getUser();
                                if (user) await supabase.from('profiles').update({ active_device_id: null }).eq('id', user.id);
                                await supabase.auth.signOut();
                                router.push('/');
                            }}>Yes</button>
                            <button className="modal-btn modal-btn--no" onClick={() => setShowLogoutConfirm(false)}>No</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <header className="top-header">
                <div style={{ width: 120 }}></div>
                <div className="header-brand">FastInn</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <button className="header-cta" onClick={() => router.push('/how-to')}>How To Use?</button>
                </div>
                <div style={{ width: 120, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                    <div
                        className="profile-avatar-wrapper"
                        onMouseEnter={() => { if (profileCloseTimeout.current) clearTimeout(profileCloseTimeout.current); setProfileMenuOpen(true); }}
                        onMouseLeave={() => { profileCloseTimeout.current = setTimeout(() => setProfileMenuOpen(false), 220); }}
                    >
                        <div className="profile-avatar" role="img" aria-label="user avatar">
                            <div className="avatar-letter">{(userName && userName.charAt(0).toUpperCase()) || 'U'}</div>
                        </div>
                        {profileMenuOpen && (
                            <div
                                className="profile-popup"
                                onMouseEnter={() => { if (profileCloseTimeout.current) clearTimeout(profileCloseTimeout.current); setProfileMenuOpen(true); }}
                                onMouseLeave={() => { profileCloseTimeout.current = setTimeout(() => setProfileMenuOpen(false), 220); }}
                            >
                                <button className="profile-popup-item" onClick={() => { router.push('/profile'); setProfileMenuOpen(false); }}>Visit Profile</button>
                                <button className="profile-popup-item" onClick={() => { router.push('/how-to'); setProfileMenuOpen(false); }}>How To Use?</button>
                                <button className="profile-popup-item profile-logout-inline" onClick={() => { setShowLogoutConfirm(true); setProfileMenuOpen(false); }}>Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Main content ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>

                {/* Welcome heading */}
                <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
                    {today && (
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(125,211,252,0.7)', marginBottom: '0.5rem' }}>
                            {today}
                        </p>
                    )}
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, fontStyle: 'italic', color: '#ffffff', margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
                        {firstName ? `Welcome back, ${firstName}` : 'Your Menu'}
                    </h1>
                    <p style={{ color: 'rgba(226,232,240,0.55)', marginTop: '0.375rem', fontSize: '0.9375rem' }}>
                        What would you like to do today?
                    </p>
                </div>

                {/* Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', width: '100%', maxWidth: 900 }}>
                    {TILES.map(t => (
                        <button
                            key={t.href}
                            onClick={() => router.push(t.href)}
                            className="menu-button"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left',
                                background: 'rgba(255,255,255,0.92)',
                                backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                                border: '1px solid rgba(255,255,255,0.65)',
                                borderRadius: '18px', padding: '1.375rem 1.5rem',
                                cursor: 'pointer', color: '#0f172a',
                                fontFamily: "'Inter', sans-serif",
                                boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
                                outline: 'none',
                            }}
                        >
                            <div style={{
                                width: 52, height: 52, flexShrink: 0,
                                borderRadius: 14, background: t.accent,
                                border: `1.5px solid ${t.accentBorder}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem',
                            }}>
                                {t.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{t.label}</div>
                                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '1.25rem', lineHeight: 1 }}>›</div>
                        </button>
                    ))}
                </div>

                {/* Developer/Test SaaS Init Button */}
                <div style={{ marginTop: 40, textAlign: 'center' }}>
                    <button
                        onClick={async () => {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return alert("Please login first.");

                            const res = await fetch('/api/setup-demo', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: user.id })
                            });

                            const data = await res.json();
                            if (data.success) {
                                alert('Demo hotel created and you are now an Admin! Routing to Dashboard...');
                                window.location.href = '/dashboard';
                            } else if (data.error === 'User is already assigned to a hotel') {
                                window.location.href = '/dashboard';
                            } else {
                                alert('Setup Error: ' + data.error);
                            }
                        }}
                        className="text-xs px-4 py-2 border border-blue-500/30 text-blue-400 bg-blue-900/10 hover:bg-blue-900/40 rounded-lg transition-colors"
                    >
                        ⚙️ Initialize Demo Hotel (SaaS Test)
                    </button>
                </div>
            </div>

        </main>
    );
}
