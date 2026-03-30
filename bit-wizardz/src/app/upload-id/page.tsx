'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyAadhaarCard } from '@/lib/ocr-verification';
import { supabase } from '@/lib/supabase';
import './upload-id.css';

export default function UploadIDPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI State
    const [file, setFile] = useState<File | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);

    // Logic State
    const [isScanning, setIsScanning] = useState(false);
    const [statusMatch, setStatusMatch] = useState<{ success: boolean; msg: string } | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [userDetails, setUserDetails] = useState<{ name: string; dob: string; last4: string } | null>(null);

    // 0. Fetch User Details for Verification
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Fetch from 'users' table (using the aligned schema)
                const { data } = await supabase.from('users').select('name, dob, id_last4').eq('id', user.id).single();
                if (data) {
                    setUserDetails({
                        name: data.name,
                        dob: data.dob,
                        last4: data.id_last4
                    });
                }
            }
        };
        fetchUser();
    }, []);

    // 1. Handle File Selection (Merge Logic + UI)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatusMatch(null); // Reset status on new file
        }
    };

    // 2. Drag & Drop Handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
        else if (e.type === 'dragleave') setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setStatusMatch(null);
        }
    };

    const handleClick = () => fileInputRef.current?.click();

    // 3. Scan & Verify (The Logic)
    const handleContinue = async () => {
        if (!file) return;

        setIsScanning(true);
        setStatusMatch(null);

        try {
            // Pass userDetails if available for stricter checking
            const result = await verifyAadhaarCard(file, userDetails || undefined);

            if (result.success) {
                // Success!
                // 1. Update DB
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('users').update({ identity_verified: true }).eq('id', user.id);
                }

                // 2. UI Feedback
                setStatusMatch({ success: true, msg: `✅ Valid Aadhaar! matched with records` });
                setIsVerified(true); // Trigger UI Animation
            } else {
                // Failed
                setStatusMatch({
                    success: false,
                    msg: result.errors && result.errors.length > 0
                        ? `❌ Verification Failed:\n${result.errors.join('\n')}`
                        : `❌ Invalid Document. Could not verify Aadhaar.`
                });
            }
        } catch (error) {
            console.error(error);
            setStatusMatch({ success: false, msg: '❌ Scanning Failed. Try again.' });
        } finally {
            setIsScanning(false);
        }
    };

    // 4. Auto-redirect on Success
    useEffect(() => {
        if (isVerified) {
            const timer = setTimeout(() => {
                router.push('/register-face');
            }, 2000); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isVerified, router]);

    return (
        <main className="upload-container">

            {/* Navbar */}
            <nav className="upload-navbar">
                <span className="upload-navbar__brand">FastInn</span>
                <div style={{ flex: 1 }} />
                <button className="upload-navbar__back" onClick={() => router.back()}>← Back</button>
            </nav>

            <div className="upload-center">
                <div className="upload-card">

                    {/* Header */}
                    {!isVerified && (
                        <div className="upload-header" style={{ justifyContent: 'center' }}>
                            <h1 className="upload-title">Upload Identity</h1>
                        </div>
                    )}

                    {!isVerified ? (
                        <>
                            <p className="upload-subtitle">Please upload your masked Aadhaar card to verify your identity.</p>

                            {/* Upload Zone */}
                            {!file ? (
                                <div
                                    className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={handleClick}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <div>
                                        <p className="upload-text">Drag & drop or Click to browse</p>
                                        <p className="upload-subtext">Supports PDF, JPG, PNG</p>
                                    </div>
                                </div>
                            ) : (
                                /* File Preview State */
                                <div className="upload-zone" style={{ padding: '20px', borderStyle: 'solid', borderColor: '#bfdbfe', background: '#eff6ff' }}>
                                    <div className="file-preview">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="file-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div className="file-info">
                                            <p className="file-name">{file.name}</p>
                                            <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button className="remove-btn" onClick={() => { setFile(null); setStatusMatch(null); }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {statusMatch?.success === false && (
                                <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded border border-red-200">
                                    {statusMatch.msg}
                                </p>
                            )}

                            <button
                                className="continue-button"
                                onClick={handleContinue}
                                disabled={!file || isScanning}
                                style={{
                                    background: !file || isScanning ? '#94a3b8' : 'linear-gradient(135deg,#1e3a8a,#2563eb)',
                                    boxShadow: !file || isScanning ? 'none' : '0 4px 16px rgba(37,99,235,0.28)',
                                }}
                            >
                                {isScanning ? 'Verifying…' : 'Verify & Continue'}
                            </button>
                        </>
                    ) : (
                        /* Success Animation */
                        <div className="success-container">
                            <div className="success-glow">
                                <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                    <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                                    <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                                </svg>
                            </div>
                            <h2 className="verified-text">Identity Verified!</h2>
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}
