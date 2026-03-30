'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './signup.css';

export default function Signup() {
    const router = useRouter();
    const [step, setStep] = useState<'signup' | 'otp'>('signup');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (fullName && isEmail && password.length >= 6) {
            setLoading(true);
            const { error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: fullName,
                    }
                }
            });

            if (error) {
                alert(error.message);
            } else {
                setStep('otp'); // Actually 'verify-email' state
            }
            setLoading(false);
        } else {
            alert("Please use a valid email and a password of at least 6 characters.");
        }
    };

    const handleGoogleSignup = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.protocol}//${window.location.host}/p1su` },
        });
        if (error) alert(error.message);
    };

    return (
        <main className="signup-container">
            <div className="signup-card">

                {/* Header with Back Arrow */}
                <div className="signup-header">
                    <Link href="/" className="back-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </Link>
                    <h1 className="signup-title">Create Account</h1>
                </div>

                {step === 'signup' ? (
                    <>
                        {/* Inputs */}
                        <div className="input-group">
                            <label className="input-label">Full Name</label>
                            <input
                                type="text"
                                className="slick-input"
                                placeholder="e.g. Aayush Makkar"
                                maxLength={40}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Email Address</label>
                            <input
                                type="email"
                                className="slick-input"
                                placeholder="user@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <input
                                type="password"
                                className="slick-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Sign Up Button */}
                        <button className="signup-button" onClick={handleSignup} disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>

                        {/* Divider & Google */}
                        <div className="divider-container">
                            <span className="divider-text">or</span>

                            <button className="google-button" onClick={handleGoogleSignup}>
                                {/* Simple G icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                                </svg>
                                Sign Up with Google
                            </button>
                        </div>

                        {/* Dev Link */}
                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <a href="/register-face" style={{ fontSize: '0.8rem', color: '#cbd5e1', textDecoration: 'none' }}>[Dev: Go to Face Scan]</a>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ marginBottom: '20px', color: '#10b981' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#fff' }}>Verify Your Email</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
                            We've sent a confirmation link to <br />
                            <strong style={{ color: '#fff' }}>{email}</strong>
                        </p>
                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            Please check your inbox (and spam folder) and click the link to activate your account.
                        </p>
                        <Link href="/" className="verify-button" style={{ display: 'inline-block', marginTop: '30px', textDecoration: 'none', lineHeight: '48px' }}>
                            Back to Login
                        </Link>
                    </div>
                )}

            </div>
        </main>
    );
}
