import { useState, useRef, useEffect, useCallback } from 'react';

export const useCamera = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsStreamActive(false);
    }, []);

    const startCamera = useCallback(async () => {
        stopCamera();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 480 },
                    height: { ideal: 360 },
                },
                audio: false,
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreamActive(true);
                setError(null);
            }
        } catch (err: any) {
            console.error('[Camera] Access error:', err);
            const msg = err?.name === 'NotAllowedError'
                ? 'Camera permission denied. Please allow camera access and reload.'
                : 'Could not access camera. Please check your device.';
            setError(msg);
            setIsStreamActive(false);
        }
    }, [stopCamera]);

    useEffect(() => () => stopCamera(), [stopCamera]);

    return { videoRef, startCamera, stopCamera, isStreamActive, error };
};
