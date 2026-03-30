'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useFaceApi } from '@/hooks/useFaceApi';
import {
    extractSingleFrame,
    getEyeAspectRatio,
    getHeadYaw,
    type DetectionResult,
} from '@/lib/face-util';

// ─── Liveness FSM states ──────────────────────────────────────────────────────
type LivenessStep =
    | 'loading'       // models not ready
    | 'camera-error'  // camera access failed
    | 'detecting'     // looking for a face
    | 'wait-blink'    // face found — waiting for blink
    | 'wait-turn'     // blink done — waiting for head turn left
    | 'capturing'     // averaging frames
    | 'done';         // completed

const STEP_LABELS: Record<LivenessStep, string> = {
    'loading': 'Loading models…',
    'camera-error': 'Camera error',
    'detecting': 'Position your face in the frame',
    'wait-blink': 'Slowly blink once',
    'wait-turn': 'Turn your head slightly left',
    'capturing': 'Hold still — capturing…',
    'done': 'Scan complete!',
};

const STEP_COLORS: Record<LivenessStep, string> = {
    'loading': '#64748b',
    'camera-error': '#ef4444',
    'detecting': '#f59e0b',
    'wait-blink': '#3b82f6',
    'wait-turn': '#8b5cf6',
    'capturing': '#06b6d4',
    'done': '#22c55e',
};

interface FaceScannerProps {
    onScan: (descriptor: Float32Array) => void;
    onInstructionChange?: (instruction: string) => void;
    /** Show raw EAR/yaw values — only meaningful in dev */
    showDebug?: boolean;
}

const FRAMES_TO_CAPTURE = 5;

export default function FaceScanner({ onScan, onInstructionChange, showDebug }: FaceScannerProps) {
    const { videoRef, startCamera, stopCamera, isStreamActive, error: cameraError } = useCamera();
    const { isModelLoaded, isLoading: isModelsLoading, loadingStage } = useFaceApi();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [step, setStep] = useState<LivenessStep>('loading');
    const [debugInfo, setDebugInfo] = useState('');
    const [captureCount, setCaptureCount] = useState(0);

    // Refs used inside rAF loop — not state to avoid re-renders
    const stepRef = useRef<LivenessStep>('loading');
    const blinkingRef = useRef(false);
    const descriptors = useRef<Float32Array[]>([]);
    const loopRef = useRef<number>(0);
    const isMountedRef = useRef(true);

    const changeStep = useCallback((s: LivenessStep) => {
        stepRef.current = s;
        setStep(s);
        onInstructionChange?.(STEP_LABELS[s]);
    }, [onInstructionChange]);

    // ── lifecycle ──────────────────────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            cancelAnimationFrame(loopRef.current);
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isModelLoaded && !isStreamActive) {
            changeStep('detecting');
            startCamera();
        }
    }, [isModelLoaded, isStreamActive, startCamera, changeStep]);

    useEffect(() => {
        if (isStreamActive && isModelLoaded) startLoop();
        return () => cancelAnimationFrame(loopRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStreamActive, isModelLoaded]);

    // ── canvas overlay ────────────────────────────────────────────────────────
    const drawOverlay = useCallback((result: DetectionResult | null) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!result) return;

        const { box } = result;
        const color = STEP_COLORS[stepRef.current];

        // Flip canvas horizontally to match mirrored video
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        // Bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Corner accents
        const cs = 16; // corner size
        ctx.lineWidth = 4;
        const corners = [
            [box.x, box.y, cs, 0, 0, cs],
            [box.x + box.width, box.y, -cs, 0, 0, cs],
            [box.x, box.y + box.height, cs, 0, 0, -cs],
            [box.x + box.width, box.y + box.height, -cs, 0, 0, -cs],
        ] as const;
        for (const [rx, ry, dx1, dy1, dx2, dy2] of corners) {
            ctx.beginPath();
            ctx.moveTo(rx + dx1, ry + dy1);
            ctx.lineTo(rx, ry);
            ctx.lineTo(rx + dx2, ry + dy2);
            ctx.stroke();
        }

        ctx.restore();
    }, [videoRef]);

    // ── main scan loop ────────────────────────────────────────────────────────
    const startLoop = useCallback(() => {
        changeStep('detecting');

        const tick = async () => {
            if (!isMountedRef.current) return;
            const video = videoRef.current;
            if (!video || video.paused || video.ended) {
                loopRef.current = requestAnimationFrame(tick);
                return;
            }

            const result = await extractSingleFrame(video);
            drawOverlay(result);

            if (!result) {
                setDebugInfo('No face detected');
                loopRef.current = requestAnimationFrame(tick);
                return;
            }

            const { landmarks, descriptor } = result;
            const leftEAR = getEyeAspectRatio(landmarks.getLeftEye());
            const rightEAR = getEyeAspectRatio(landmarks.getRightEye());
            const avgEAR = (leftEAR + rightEAR) / 2;
            const yaw = getHeadYaw(landmarks);

            if (showDebug || process.env.NODE_ENV === 'development') {
                setDebugInfo(`EAR: ${avgEAR.toFixed(3)} | Yaw: ${yaw.toFixed(3)}`);
            }

            const cur = stepRef.current;

            // ── Step: detecting → wait-blink (face found) ──────────────────
            if (cur === 'detecting') {
                changeStep('wait-blink');
            }

            // ── Step: wait-blink ────────────────────────────────────────────
            if (cur === 'wait-blink') {
                if (avgEAR < 0.26 && !blinkingRef.current) {
                    blinkingRef.current = true; // eye closed
                } else if (avgEAR > 0.28 && blinkingRef.current) {
                    // eye opened again → blink complete
                    blinkingRef.current = false;
                    changeStep('wait-turn');
                }
            }

            // ── Step: wait-turn (head left, yaw < -0.06) ───────────────────
            if (cur === 'wait-turn') {
                if (yaw < -0.06) {
                    changeStep('capturing');
                    descriptors.current = [];
                    setCaptureCount(0);
                }
            }

            // ── Step: capturing (multi-frame average) ──────────────────────
            if (cur === 'capturing') {
                descriptors.current.push(descriptor);
                setCaptureCount(descriptors.current.length);

                if (descriptors.current.length >= FRAMES_TO_CAPTURE) {
                    cancelAnimationFrame(loopRef.current);
                    video.pause();
                    changeStep('done');

                    // Element-wise average
                    const avg = new Float32Array(descriptors.current[0].length);
                    for (const d of descriptors.current) {
                        for (let i = 0; i < avg.length; i++) avg[i] += d[i];
                    }
                    for (let i = 0; i < avg.length; i++) avg[i] /= descriptors.current.length;

                    onScan(avg);
                    return;
                }
            }

            loopRef.current = requestAnimationFrame(tick);
        };

        loopRef.current = requestAnimationFrame(tick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [changeStep, drawOverlay, onScan]);

    // ── render ─────────────────────────────────────────────────────────────────
    const statusColor = STEP_COLORS[step];

    if (cameraError) {
        return (
            <div className="flex flex-col items-center gap-3 p-6 bg-red-50 rounded-xl border border-red-200 text-center">
                <div className="text-4xl">📷</div>
                <p className="text-red-700 font-semibold text-sm">{cameraError}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3 w-full">

            {/* Camera + overlay container */}
            <div className="relative w-full aspect-[4/3] max-w-md rounded-2xl overflow-hidden bg-black shadow-2xl border-2"
                style={{ borderColor: statusColor, transition: 'border-color 0.4s' }}>

                <video
                    ref={videoRef}
                    autoPlay muted playsInline
                    onLoadedMetadata={() => videoRef.current?.play()}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                />

                {/* Canvas bounding-box overlay */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Capture progress bar */}
                {step === 'capturing' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                            className="h-full transition-all duration-200"
                            style={{
                                width: `${(captureCount / FRAMES_TO_CAPTURE) * 100}%`,
                                background: statusColor,
                            }}
                        />
                    </div>
                )}

                {/* Done overlay */}
                {step === 'done' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                        <div className="text-5xl mb-2">✅</div>
                    </div>
                )}

                {/* Loading overlay */}
                {(isModelsLoading || step === 'loading') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
                        <div className="h-8 w-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <p className="text-white text-xs font-mono">{loadingStage}</p>
                    </div>
                )}

                {/* Dev debug overlay */}
                {(showDebug || process.env.NODE_ENV === 'development') && debugInfo && (
                    <div className="absolute top-2 left-2 bg-black/60 text-green-400 text-xs font-mono px-2 py-1 rounded">
                        {debugInfo}
                    </div>
                )}
            </div>

            {/* Status pill */}
            <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all duration-400"
                style={{ background: statusColor }}
            >
                <StepIcon step={step} />
                <span>{STEP_LABELS[step]}</span>

                {step === 'capturing' && (
                    <span className="ml-1 opacity-70 text-xs">
                        {captureCount}/{FRAMES_TO_CAPTURE}
                    </span>
                )}
            </div>

        </div>
    );
}

function StepIcon({ step }: { step: LivenessStep }) {
    switch (step) {
        case 'loading': return <span className="animate-spin text-sm">⚙️</span>;
        case 'detecting': return <span>👁️</span>;
        case 'wait-blink': return <span>😑</span>;
        case 'wait-turn': return <span>↩️</span>;
        case 'capturing': return <span className="animate-pulse">📸</span>;
        case 'done': return <span>✅</span>;
        default: return <span>⚠️</span>;
    }
}
