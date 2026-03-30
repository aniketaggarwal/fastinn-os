'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) setError(error.message);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const fn = isSignUp
            ? supabase.auth.signUp({ email, password })
            : supabase.auth.signInWithPassword({ email, password });
        const { error } = await fn;
        setLoading(false);
        if (error) { setError(error.message); return; }
        if (isSignUp) { setError('Check your email for a confirmation link.'); return; }
        router.push('/');
        router.refresh();
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <Link href="/" style={{ font: 'inherit' }}>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 700, background: 'linear-gradient(135deg,#c9a84c,#f0d07a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            FastInn
                        </span>
                    </Link>
                </div>

                <h2 className="auth-title">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                <p className="auth-subtitle">{isSignUp ? 'Join to start booking' : 'Sign in to your account'}</p>

                <button className="google-btn" onClick={handleGoogle}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Continue with Google
                </button>

                <div className="auth-divider"><span>or</span></div>

                {error && <div className="alert alert-error mb-2">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    </div>
                    <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-switch">
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <a href="#" onClick={e => { e.preventDefault(); setIsSignUp(!isSignUp); setError(''); }}>
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </a>
                </p>
            </div>
        </div>
    );
}
