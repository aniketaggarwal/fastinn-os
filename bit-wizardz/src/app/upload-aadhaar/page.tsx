'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { verifyAadhaarCard } from '@/lib/ocr-verification';
import { supabase } from '@/lib/supabase';
import './upload.css';

function UploadContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auth & File State
    const [file, setFile] = useState<File | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);

    // Verification State
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [extractedData, setExtractedData] = useState<any>(null);

    // Get expected details from URL
    const expectedDetails = {
        name: searchParams.get('name') || '',
        dob: searchParams.get('dob') || '', // YYYY-MM-DD
        aadhaarLast4: searchParams.get('aadhaarLast4') || ''
    };

    // Handle File Selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setErrorMsg('');
        }
    };

    // Drag & Drop Handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setStatus('idle');
            setErrorMsg('');
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleContinue = async () => {
        if (!file) return;

        setStatus('scanning');
        setErrorMsg('');

        try {
            // Convert Input Date (YYYY-MM-DD) to OCR expectations (DD/MM/YYYY) for comparison
            // But let the lib handle normalization if possible, or do it here.
            // The lib expects DD/MM/YYYY.
            let formattedDob = '';
            if (expectedDetails.dob) {
                const [y, m, d] = expectedDetails.dob.split('-');
                formattedDob = `${d}/${m}/${y}`;
            }

            const result = await verifyAadhaarCard(file, {
                name: expectedDetails.name,
                dob: formattedDob,
                last4: expectedDetails.aadhaarLast4
            });

            if (result.success) {
                // Call API to store verified identity
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;

                    const updateResponse = await fetch('/api/update-identity', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            dob: formattedDob, // Use formattedDob since we verified it
                            aadhaarLast4: expectedDetails.aadhaarLast4,
                            id_masked: `XXXX XXXX ${expectedDetails.aadhaarLast4}` // Construct masked ID manually
                        })
                    });

                    if (!updateResponse.ok) {
                        const errorData = await updateResponse.json();
                        throw new Error(errorData.error || 'Failed to update identity status.');
                    }

                    setStatus('success');
                    // setExtractedData(result.extracted); // extracted not available/needed if we verified input
                } catch (apiErr: any) {
                    console.error("API Error Details:", apiErr);
                    setStatus('failed');
                    setErrorMsg(apiErr.message || 'Verification passed, but failed to save status.');
                }
            } else {
                setStatus('failed');
                setErrorMsg(result.errors?.[0] || 'Verification Failed. Details did not match.');
            }

        } catch (err: any) {
            setStatus('failed');
            setErrorMsg(err.message || 'Failed to scan document.');
        }
    };

    // Auto-redirect after success
    useEffect(() => {
        if (status === 'success') {
            const timer = setTimeout(() => {
                router.push('/register-face');
            }, 2500); // Wait for animation to finish + delay
            return () => clearTimeout(timer);
        }
    }, [status, router]);

    return (
        <div className="upload-content-wrapper">
            {/* Conditional Header */}
            {status !== 'success' && (
                <div className="upload-header">
                    <div className="absolute left-0">
                        <BackButton className="!text-slate-500 hover:!bg-slate-100 !border-0" />
                    </div>
                    <h1 className="upload-title">Upload Identity</h1>
                </div>
            )}

            {status !== 'success' ? (
                <>
                    <p className="upload-subtitle">
                        Please upload your masked Aadhaar card to verify your identity.
                    </p>

                    {/* Error Alert */}
                    {status === 'failed' && (
                        <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>
                            <strong>Verification Failed:</strong> {errorMsg}
                            <div style={{ fontSize: '0.8rem', marginTop: '5px', opacity: 0.8 }}>Please ensure the photo is clear and matches your details.</div>
                        </div>
                    )}

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

                            {/* Cloud Upload Icon */}
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
                                <button className="remove-btn" onClick={() => setFile(null)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="upload-subtext" style={{ marginTop: '10px' }}>File selected</p>
                        </div>
                    )}

                    <button
                        className="continue-button"
                        onClick={handleContinue}
                        disabled={!file || status === 'scanning'}
                    >
                        {status === 'scanning' ? 'Verifying...' : 'Verify & Continue'}
                    </button>

                    {status === 'scanning' && (
                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>
                            Reading document... This may take a few seconds.
                        </p>
                    )}
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
                    <p style={{ color: '#94a3b8', marginTop: '10px' }}>Redirecting to dashboard...</p>
                </div>
            )}
        </div>
    );
}

export default function UploadAadhaar() {
    return (
        <main className="upload-container">
            <div className="upload-card">
                <Suspense fallback={<div>Loading...</div>}>
                    <UploadContent />
                </Suspense>
            </div>
        </main>
    );
}
