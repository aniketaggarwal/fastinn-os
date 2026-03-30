'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import '../signup/signup.css'; // Reusing styling from Signup

function P1SUContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [aadhaarLast4, setAadhaarLast4] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const nameParam = searchParams.get('name');
        if (nameParam) {
            setName(nameParam);
        }

        // Check if already verified
        const checkExistingProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('id_last4')
                    .eq('id', user.id)
                    .single();

                if (profile?.id_last4) {
                    router.replace('/menu'); // Redirect if already setup
                }
            }
        };
        checkExistingProfile();
    }, [searchParams, router]);

    const handleContinue = async () => {
        if (dob && aadhaarLast4.length === 4 && phone.length === 10) {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { error } = await supabase.from('users').upsert({
                        id: user.id,
                        name: name,
                        email: user.email, // Save Email from Auth
                        id_last4: aadhaarLast4,
                        dob: dob,
                        phone: `+91${phone}`, // Save phone directly to profile
                        updated_at: new Date().toISOString()
                    });
                    if (error) throw error;
                }
                router.push('/upload-id');
            } catch (error) {
                console.error('Error saving profile:', error);
                alert('Failed to save details. Please try again.');
            } finally {
                setIsLoading(false);
            }
        } else {
            alert("Please fill all details correctly.");
        }
    };

    const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (/^\d*$/.test(val) && val.length <= 4) {
            setAadhaarLast4(val);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 10) {
            setPhone(val);
        }
    };

    return (
        <main className="signup-container">
            <div className="signup-card">

                {/* Header */}
                <div className="signup-header">
                    <button className="back-button" onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <h1 className="signup-title">Enter Details</h1>
                </div>

                {/* Name (Editable) */}
                <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input
                        type="text"
                        className="slick-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                    />
                </div>

                {/* DOB */}
                <div className="input-group">
                    <label className="input-label">Date of Birth</label>
                    <input
                        type="date"
                        className="slick-input"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                    />
                </div>

                {/* Aadhaar Last 4 */}
                <div className="input-group">
                    <label className="input-label">Aadhaar (Last 4 Digits)</label>
                    <input
                        type="password"
                        className="slick-input"
                        placeholder="XXXX"
                        maxLength={4}
                        value={aadhaarLast4}
                        onChange={handleAadhaarChange}
                        inputMode="numeric"
                        style={{ letterSpacing: '4px' }}
                    />
                </div>

                {/* Phone Number (No Verification) */}
                <div className="input-group">
                    <label className="input-label">Phone Number</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ padding: '12px', background: '#e2e8f0', borderRadius: '8px', color: '#64748b' }}>+91</span>
                        <input
                            type="tel"
                            className="slick-input"
                            placeholder="9876543210"
                            maxLength={10}
                            value={phone}
                            onChange={handlePhoneChange}
                            inputMode="numeric"
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>

                {/* Continue Button */}
                <button
                    className="signup-button"
                    onClick={handleContinue}
                    disabled={isLoading}
                    style={{ marginTop: '24px' }}
                >
                    {isLoading ? 'Saving...' : 'Continue'}
                </button>

            </div>
        </main>
    );
}

export default function P1SU() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-black text-white">
                Loading...
            </div>
        }>
            <P1SUContent />
        </Suspense>
    );
}
