'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3000';

export default function SiteFooter() {
    const [expanded, setExpanded] = useState(false);
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        // Check if current user has a staff/admin role in hotel_users
        supabase.auth.getUser().then(async ({ data }) => {
            if (!data.user) return;
            const { data: hu } = await supabase
                .from('hotel_users')
                .select('role')
                .eq('user_id', data.user.id)
                .in('role', ['admin', 'staff', 'manager', 'owner'])
                .limit(1)
                .maybeSingle();
            if (hu) setIsStaff(true);
        });
    }, []);

    return (
        <footer style={{
            borderTop: '1px solid var(--border)',
            padding: '2rem 0 1.5rem',
            marginTop: 'auto',
        }}>
            <div className="container" style={{ maxWidth: 1200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Brand */}
                    <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.5rem' }}>
                            FastInn
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 240 }}>
                            Curated luxury hotel experiences. Book, pre-check-in, and arrive like a VIP.
                        </p>
                    </div>

                    {/* Guest Links */}
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                            Guest
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {[
                                { href: '/', label: 'Browse Hotels' },
                                { href: '/my-bookings', label: 'My Bookings' },
                                { href: '/login', label: 'Sign In' },
                            ].map(({ href, label }) => (
                                <Link key={href} href={href} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        © {new Date().getFullYear()} FastInn. Premium hospitality tech.
                    </p>

                    {/* ── Masked Staff Access ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Small dot trigger — staff know to click it */}
                        <button
                            onClick={() => setExpanded(e => !e)}
                            title="FastInn Operations"
                            style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: isStaff ? 'var(--gold)' : 'var(--border)',
                                border: 'none', cursor: 'pointer', padding: 0,
                                opacity: 0.5, transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                        />
                        {expanded && (
                            <a
                                href={`${ADMIN_URL}/dashboard`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--text-muted)',
                                    textDecoration: 'none',
                                    padding: '0.2rem 0.6rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: 20,
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)';
                                    (e.currentTarget as HTMLElement).style.color = 'var(--gold)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                                }}
                            >
                                🏨 Staff Dashboard ↗
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
}
