'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import '../login.css';

export default function HowToPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen" style={{ background: "linear-gradient(rgba(0,20,40,0.68), rgba(0,17,36,0.68)), url('/city-life.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', color: '#e6eef8' }}>
            <header className="top-header">
                <div style={{ width: 120 }}></div>
                <div className="header-brand">FastInn</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <button className="header-cta" onClick={() => router.push('/menu')}>Back to Menu</button>
                </div>
                <div style={{ width: 120, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }} />
            </header>

            <div style={{ padding: '3.5rem 1rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 1100 }}>

                    {/* Hero */}
                    <section style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ flex: 1, background: 'rgba(2,6,23,0.6)', padding: 22, borderRadius: 12 }}>
                            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>How To Use FastInn</h1>
                            <p style={{ color: '#94a3b8', marginTop: 10 }}>Clear, step-by-step instructions to help you re-verify ID, scan your face, and use the self check-in kiosk. Paste your final content in the sections below.</p>
                        </div>
                        <div style={{ width: 320, background: 'linear-gradient(180deg,#ffffff08,#ffffff04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                            <strong style={{ display: 'block', marginBottom: 8 }}>Estimated time</strong>
                            <div style={{ fontSize: 28, fontWeight: 800 }}>2–4 minutes</div>
                            <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 13 }}>Follow steps in order for best results.</div>
                        </div>
                    </section>

                    {/* Step cards */}
                    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 18 }}>
                        <div className="menu-button" style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(90deg,#fff1f2,#f0f9ff)', color: '#081028' }}>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>1. Verify ID</div>
                            <div style={{ color: '#475569', marginTop: 6 }}>Upload a clear photo of your government ID. Make sure all four corners are visible and lighting is even.</div>
                        </div>

                        <div className="menu-button" style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(90deg,#fff7ed,#eef2ff)', color: '#081028' }}>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>2. Scan Face</div>
                            <div style={{ color: '#475569', marginTop: 6 }}>Position your face inside the camera frame, remove glasses if possible, and follow on-screen guidance for lighting and distance.</div>
                        </div>

                        <div className="menu-button" style={{ padding: 18, borderRadius: 12, background: 'linear-gradient(90deg,#fff7f0,#f0fff4)', color: '#081028' }}>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>3. Self Check-in</div>
                            <div style={{ color: '#475569', marginTop: 6 }}>At the hotel: scan the QR code at the desk, complete a face scan, and wait while we process your information. After verification you'll receive your room key.</div>
                        </div>
                    </section>

                    {/* FAQ / expandable placeholders */}
                    <section style={{ marginTop: 6, background: 'rgba(2,6,23,0.4)', padding: 18, borderRadius: 12 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>FAQ</h2>
                        <div style={{ marginTop: 12, color: '#cbd5e1' }}>
                            <details style={{ marginBottom: 8 }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>How is my personal data stored and protected?</summary>
                                <div style={{ marginTop: 8 }}>We store only the minimum necessary data for verification. Biometric templates are encrypted and never shared — see our privacy policy for full details.</div>
                            </details>
                            <details style={{ marginBottom: 8 }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>My face scan failed — now what?</summary>
                                <div style={{ marginTop: 8 }}>Retry in a well-lit area, center your face, remove hats or glasses, and allow the camera to autofocus.</div>
                            </details>
                        </div>
                    </section>

                    {/* CTA */}
                    <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <button className="login-button" onClick={() => router.push('/upload-id')} style={{ padding: '8px 10px', width: 160, fontSize: '0.95rem' }}>Re-Verify ID</button>
                        <button className="login-button" onClick={() => router.push('/register-face')} style={{ padding: '8px 10px', width: 160, fontSize: '0.95rem' }}>Re-Scan Face</button>
                    </div>
                </div>
            </div>
        </main>
    );
}
