'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import '../login.css';
import '../page-shell.css';

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/'); return; }
            const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
            if (data) setProfile({ ...data, email: user.email });
            setLoading(false);
        };
        fetchProfile();
    }, [router]);

    if (loading) return (
        <div className="fi-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading profile…</p>
        </div>
    );

    return (
        <div className="fi-page">

            {/* Logout modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h2 style={{ color: '#dc2626' }}>Logging Out?</h2>
                        <p>You're about to sign out of your account. This will remove your active session.</p>
                        <div className="modal-actions">
                            <button className="modal-btn modal-btn--yes" onClick={async () => {
                                setShowLogoutConfirm(false);
                                await supabase.from('profiles').update({ active_device_id: null }).eq('id', (await supabase.auth.getUser()).data.user?.id);
                                await supabase.auth.signOut();
                                router.push('/');
                            }}>Yes</button>
                            <button className="modal-btn modal-btn--no" onClick={() => setShowLogoutConfirm(false)}>No</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="fi-navbar">
                <span className="fi-navbar__brand">FastInn</span>
                <div style={{ flex: 1 }} />
                <button className="fi-navbar__back" onClick={() => router.push('/menu')}>
                    ← Menu
                </button>
            </nav>

            {/* Content */}
            <div className="fi-center">
                <div className="fi-card" style={{ width: '100%', maxWidth: 460, padding: '2.25rem' }}>

                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
                        <div style={{
                            width: 60, height: 60, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1d4ed8, #4338ca)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '1.5rem', fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: '0 4px 16px rgba(29,78,216,0.3)',
                        }}>
                            {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h1 className="fi-card-title" style={{ fontSize: '1.375rem' }}>{profile?.name || 'User'}</h1>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 2 }}>{profile?.email}</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 1.5rem' }} />

                    {/* Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {profile?.phone && (
                            <div className="fi-detail">
                                <span className="fi-detail__label">Phone</span>
                                <span className="fi-detail__value" style={{ fontFamily: 'monospace' }}>{profile.phone}</span>
                            </div>
                        )}

                        {/* Aadhaar block */}
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 14,
                            padding: '1rem 1.125rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div>
                                <span className="fi-label" style={{ color: '#2563eb' }}>🔒 Aadhaar Linked</span>
                                <p style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: 700, letterSpacing: '0.1em', marginTop: 4 }}>
                                    •••• •••• {profile?.id_last4 || 'XXXX'}
                                </p>
                            </div>
                            <span className="fi-badge fi-badge--green">Active</span>
                        </div>

                        {/* Meta */}
                        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', lineHeight: 1.8 }}>
                                ID: {profile?.id}<br />
                                Last active: {new Date(profile?.last_active).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        style={{
                            marginTop: '1.75rem',
                            width: '100%',
                            padding: '12px',
                            borderRadius: 12,
                            background: '#fff5f5',
                            border: '1.5px solid #fecaca',
                            color: '#dc2626',
                            fontWeight: 700,
                            fontSize: '0.9375rem',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            fontFamily: "'Inter', sans-serif",
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
