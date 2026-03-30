'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { verifyAadhaarCard } from '@/lib/ocr-verification';
import { supabase } from '@/lib/supabase';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export default function PreCheckinUploadIDPage() {
    const router = useRouter();
    const { bookingId } = useParams() as { bookingId: string };
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [userDetails, setUserDetails] = useState<{ name: string; dob: string; last4: string } | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) { router.replace('/login'); return; }
            supabase.from('users').select('name, dob, id_last4').eq('id', data.user.id).single()
                .then(({ data: u }) => {
                    if (u) setUserDetails({ name: u.name, dob: u.dob, last4: u.id_last4 });
                });
        });
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setErrorMsg('');
        setScanStatus('idle');
        if (f.type.startsWith('image/')) {
            const url = URL.createObjectURL(f);
            setPreview(url);
        } else {
            setPreview(null);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragActive(false);
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        setFile(f);
        setErrorMsg('');
        setScanStatus('idle');
        if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
    };

    const handleVerify = async () => {
        if (!file) return;
        setScanStatus('scanning');
        setErrorMsg('');
        try {
            const result = await verifyAadhaarCard(file, userDetails || undefined);
            if (result.success) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('users').upsert({ id: user.id, email: user.email, identity_verified: true }, { onConflict: 'id' });
                }
                setScanStatus('success');
                setTimeout(() => router.push(`/pre-checkin/${bookingId}/face`), 2000);
            } else {
                setScanStatus('error');
                setErrorMsg(result.errors?.join(' · ') || 'Could not verify document. Please upload a clear Aadhaar card image.');
            }
        } catch (err) {
            console.error(err);
            setScanStatus('error');
            setErrorMsg('Verification failed. Please try again.');
        }
    };

    return (
        <>
            <nav className="nav">
                <Link href="/" className="nav-brand">FastInn</Link>
                <div className="nav-links">
                    <Link href={`/pre-checkin/${bookingId}`} className="nav-link">← Pre-Check-in</Link>
                </div>
            </nav>

            <div style={{ paddingTop: '7rem', paddingBottom: '5rem', minHeight: '100vh' }}>
                <div className="container" style={{ maxWidth: 560 }}>

                    {/* Progress */}
                    <div className="step-bar" style={{ marginBottom: '2.5rem' }}>
                        <div className="step active"><div className="step-num">1</div><div className="step-label">Upload ID</div></div>
                        <div className="step-line" />
                        <div className="step"><div className="step-num">2</div><div className="step-label">Face Scan</div></div>
                        <div className="step-line" />
                        <div className="step"><div className="step-num">3</div><div className="step-label">Done</div></div>
                    </div>

                    <div className="section-eyebrow" style={{ marginBottom: '0.25rem' }}>Step 1 of 2</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Upload Identity Document</h2>
                    <p className="text-muted text-sm" style={{ marginBottom: '2rem' }}>
                        Please upload a clear photo of your <strong style={{ color: 'var(--text-soft)' }}>Aadhaar card</strong> (masked or unmasked). PDF, JPG, or PNG accepted.
                    </p>

                    {scanStatus === 'success' ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                            <h3 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Identity Verified!</h3>
                            <p className="text-muted text-sm">Redirecting to face scan…</p>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '1.75rem' }}>
                            {/* Upload Zone */}
                            {!file ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                                    style={{
                                        border: `2px dashed ${isDragActive ? 'var(--gold)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '3rem 1.5rem',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: isDragActive ? 'var(--gold-dim)' : 'var(--surface-2)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display: 'none' }} />
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🪪</div>
                                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drag & drop or click to browse</p>
                                    <p className="text-xs text-muted">Supports PDF, JPG, PNG · Max 10MB</p>
                                </div>
                            ) : (
                                <div>
                                    {/* File Preview */}
                                    {preview ? (
                                        <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '1rem', maxHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>
                                            <img src={preview} alt="ID preview" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                                        </div>
                                    ) : (
                                        <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <span>📄</span>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{file.name}</div>
                                                <div className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</div>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => { setFile(null); setPreview(null); setErrorMsg(''); setScanStatus('idle'); }}
                                        className="btn btn-outline btn-sm"
                                        style={{ marginBottom: '1rem', width: '100%' }}
                                    >
                                        Change File
                                    </button>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="alert alert-error mt-2 mb-2" style={{ fontSize: '0.8rem' }}>{errorMsg}</div>
                            )}

                            <button
                                className="btn btn-primary btn-lg w-full"
                                onClick={handleVerify}
                                disabled={!file || scanStatus === 'scanning'}
                                style={{ marginTop: '1rem' }}
                            >
                                {scanStatus === 'scanning' ? (
                                    <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Scanning document…</>
                                ) : '🔍 Verify Document →'}
                            </button>
                        </div>
                    )}

                    <p className="text-xs text-muted mt-3" style={{ textAlign: 'center' }}>
                        🔒 Document is processed locally. No images are stored on our servers.
                    </p>
                </div>
            </div>
        </>
    );
}
