"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QrScannerProps {
    onScanSuccess: (decodedText: string, decodedResult: any) => void;
    onScanFailure?: (error: any) => void;
    width?: number; // Optional custom width
}

export default function QrCodeScanner({ onScanSuccess, onScanFailure }: QrScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(true);

    useEffect(() => {
        // Use a flag to prevent race conditions in Strict Mode
        let isMounted = true;

        const initScanner = async () => {
            try {
                // If already scanning, skip
                if (scannerRef.current?.isScanning) return;

                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 15, // Increase for faster scanning
                    // qrbox: { width: 250, height: 250 }, // Removed to allow full-width/auto scanning
                    aspectRatio: 1.0,
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText, decodedResult) => {
                        if (isMounted) {
                            setScanning(false);
                            onScanSuccess(decodedText, decodedResult);
                            // Stop immediately after success
                            html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
                        }
                    },
                    (errorMessage) => {
                        // ignored
                        if (onScanFailure) onScanFailure(errorMessage);
                    }
                );
            } catch (err: any) {
                if (isMounted) {
                    console.error("Camera Init Error:", err);
                    setCameraError("Camera access failed. Please use manual input.");
                    setScanning(false);
                }
            }
        };

        // Small delay to ensure DOM is ready and previous instances cleared
        const timer = setTimeout(() => {
            initScanner();
        }, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
                } else {
                    try { scannerRef.current.clear(); } catch (e) { /* ignore */ }
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="w-full max-w-sm mx-auto overflow-hidden bg-black rounded-xl shadow-2xl border border-gray-800 relative">
            {cameraError ? (
                <div className="p-8 text-center text-red-500">
                    <p className="font-bold">Camera Error</p>
                    <p className="text-sm mt-2">{cameraError}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-gray-800 rounded text-white text-sm">Retry</button>
                </div>
            ) : (
                <div className="relative">
                    <div id="reader" className="w-full h-[350px] bg-black [&>video]:scale-x-100 [&>video]:!transform-none"></div>

                    {/* Overlay Frame */}
                    <div className="absolute inset-0 pointer-events-none border-[40px] border-black/50">
                        <div className="w-full h-full border-2 border-blue-500/50 relative">
                            {/* Scanning Line Animation */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}
            <div className="p-4 bg-gray-900 text-center">
                <p className="text-gray-400 text-sm">Point camera at the QR Code</p>
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0%, 100% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}
