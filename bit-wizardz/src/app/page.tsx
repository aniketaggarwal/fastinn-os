'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './login.css';

export default function Login() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
      },
    });
    if (error) alert(error.message);
  };

  const handleLogin = async () => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (fullName && isEmail && password) {
      setLoading(true);

      // Email + Password Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error(error);
        if (error.message.includes("Invalid login credentials")) {
          alert("Login failed. Redirecting to Sign Up.");
          router.push("/signup");
        } else {
          alert(error.message);
        }
      } else {
        // --- CONSTRAINT #2: Single Device Lock ---
        try {
          const { getDeviceId } = require('@/lib/device'); // Dynamic import for client-side safety
          const currentDeviceId = getDeviceId();
          const userId = data.user?.id;

          // 1. Check Lock Status
          const { data: profile } = await supabase
            .from('profiles')
            .select('active_device_id')
            .eq('id', userId)
            .single();

          if (profile?.active_device_id && profile.active_device_id !== currentDeviceId) {
            // LOCKED: Block Login
            await supabase.auth.signOut();
            alert(`🚫 LOGIN BLOCKED\n\nYou are already logged in on another device.\nPlease logout from the other device first.`);
            setLoading(false);
            return;
          }

          // 2. Lock this Device (or re-affirm lock)
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              active_device_id: currentDeviceId,
              last_active: new Date().toISOString()
            });

          if (upsertError) throw upsertError;

          // 3. SaaS Access Check (Staff vs Guest)
          const { data: mapping } = await supabase
            .from('hotel_users')
            .select('role')
            .eq('user_id', userId)
            .single();

          if (mapping && mapping.role !== 'guest') {
            router.push('/dashboard');
            setLoading(false);
            return;
          }

          // 4. Check if user profile exists to decide redirect
          const { data: userProfile } = await supabase
            .from('users')
            .select('id_last4')
            .eq('id', userId)
            .single();

          if (userProfile?.id_last4) {
            router.push('/menu');
          } else {
            const name = data.user?.user_metadata?.name || 'User';
            router.push(`/p1su?name=${encodeURIComponent(name)}`);
          }

        } catch (lockError) {
          console.error('Lock Check Failed:', lockError);
          alert('Security Check Failed. Please log in again.');
        }
      }
      setLoading(false);
    } else {
      alert("Please enter a valid Name, Email and Password.");
    }
  };

  return (
    <main className="login-container">

      {/* LEFT SIDE - BRANDING */}
      <div className="split-left">
        <div className="branding-content">
          <div className="logo-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-16 w-16" fill="none" stroke="currentColor">
              <path d="M 20 20 L 60 20 L 55 35 L 30 35 L 25 50 L 50 50 L 45 65 L 20 65 Z" fill="white" stroke="none" style={{ filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" }} />
              <path d="M 65 20 L 80 20 L 65 80 L 50 80 Z" fill="white" stroke="none" style={{ filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" }} />
              <path d="M 10 30 L 0 30" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
              <path d="M 15 45 L 5 45" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
              <path d="M 10 60 L 0 60" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
              <path d="M 85 30 L 95 30" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
              <path d="M 80 70 L 90 70" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
            </svg>
          </div>
          <h1 className="brand-name">FastInn</h1>
          <p className="brand-tagline">Seamless Hotel Check-ins</p>

          {/* Feature list */}
          <div className="brand-features">
            {[
              'Biometric face scan in seconds',
              'Bank-grade ECDSA security',
              'Contactless from booking to key',
            ].map(f => (
              <div key={f} className="brand-feature">
                <span className="brand-feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Status badge */}
        <div className="brand-status">
          <span className="brand-status-dot" />
          System online · v2.0
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="split-right">
        <div className="form-content">

          <div>
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">Please enter your details to continue.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            {/* Full Name Input */}
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="slick-input"
                placeholder="e.g. John Doe"
                maxLength={40}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Contact Input (Email) */}
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="text"
                className="slick-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Input */}
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

            {/* Login Buttons */}
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Processing...' : 'Login to FastInn'}
            </button>

            <div className="form-divider" style={{ margin: '4px 0' }}>or</div>

            <button type="button" className="google-button" onClick={handleGoogleLogin}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
              Login With Google
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="signup-text">
            Not a user? <Link href="/signup" className="signup-link">Sign Up!</Link>
          </div>



        </div>
      </div>

    </main>
  );
}
