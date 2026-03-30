// face-util.ts — Core face recognition utility
// Designed to be the foundation for the hotel identity verification system.

import type { Point, FaceLandmarks68 } from 'face-api.js';

const MODEL_URL = '/models';

// ─── Thresholds ───────────────────────────────────────────────────────────────
/** Euclidean distance below which two faces are considered a match */
export const MATCH_THRESHOLD = 0.40;      // tighter than the old 0.45/0.6

/** Number of frames to average before producing a final descriptor */
const FRAMES_TO_AVERAGE = 5;

/** Minimum detector confidence to process a frame */
const SCORE_THRESHOLD = 0.65;             // raised from 0.5 to reject blurry/partial

// ─── Model Loading ────────────────────────────────────────────────────────────
export type ModelLoadProgress = 'detector' | 'landmarks' | 'recognizer' | 'done';

export const loadModels = async (
    onProgress?: (stage: ModelLoadProgress) => void
): Promise<boolean> => {
    try {
        const faceapi = await import('face-api.js');

        onProgress?.('detector');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

        onProgress?.('landmarks');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

        onProgress?.('recognizer');
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        onProgress?.('done');
        return true;
    } catch (error) {
        console.error('[FaceUtil] Error loading models:', error);
        return false;
    }
};

// ─── Geometry Helpers ─────────────────────────────────────────────────────────
const getMag = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

/** Eye Aspect Ratio — used for blink detection. EAR < 0.26 → closed. */
export const getEyeAspectRatio = (eye: Point[]): number => {
    const v1 = getMag(eye[1], eye[5]);
    const v2 = getMag(eye[2], eye[4]);
    const h  = getMag(eye[0], eye[3]);
    return (v1 + v2) / (2.0 * h);
};

/**
 * Estimates horizontal head yaw from the face landmarks.
 * Returns a value: negative = turned left, positive = turned right.
 * Uses the ratio of nose-to-left-cheek vs nose-to-right-cheek distances.
 */
export const getHeadYaw = (landmarks: FaceLandmarks68): number => {
    const nose      = landmarks.getNose();
    const jawline   = landmarks.getJawOutline();
    // Left cheek ~ jawline[2], Right cheek ~ jawline[14]
    const leftCheek  = jawline[2];
    const rightCheek = jawline[14];
    const noseBase   = nose[3]; // base of nose bridge

    const distLeft  = getMag(noseBase, leftCheek);
    const distRight = getMag(noseBase, rightCheek);
    return (distRight - distLeft) / (distLeft + distRight); // -1..+1
};

// ─── Descriptor Extraction ────────────────────────────────────────────────────
export interface DetectionResult {
    descriptor: Float32Array;
    landmarks: FaceLandmarks68;
    /** Bounding box in pixels */
    box: { x: number; y: number; width: number; height: number };
}

/** Extract a single frame result — used internally and for canvas overlay. */
export const extractSingleFrame = async (
    input: HTMLVideoElement | HTMLImageElement
): Promise<DetectionResult | null> => {
    try {
        const faceapi = await import('face-api.js');
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: SCORE_THRESHOLD,
        });
        const det = await faceapi
            .detectSingleFace(input, options)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!det) return null;

        return {
            descriptor: det.descriptor,
            landmarks:  det.landmarks,
            box: {
                x:      det.detection.box.x,
                y:      det.detection.box.y,
                width:  det.detection.box.width,
                height: det.detection.box.height,
            },
        };
    } catch {
        return null;
    }
};

/**
 * Average N consecutive frame descriptors.
 * Returns null if fewer than FRAMES_TO_AVERAGE valid frames are accumulated.
 * Automatically calls onFrame for each valid frame with the raw DetectionResult.
 */
export const extractAveragedDescriptor = async (
    input: HTMLVideoElement,
    onFrame?: (result: DetectionResult) => void
): Promise<Float32Array | null> => {
    const collected: Float32Array[] = [];

    while (collected.length < FRAMES_TO_AVERAGE) {
        const result = await extractSingleFrame(input);
        if (result) {
            onFrame?.(result);
            collected.push(result.descriptor);
        }
        // Small delay between frames so the model breathes
        await new Promise(r => setTimeout(r, 80));
    }

    // Element-wise average
    const avg = new Float32Array(collected[0].length);
    for (const desc of collected) {
        for (let i = 0; i < avg.length; i++) avg[i] += desc[i];
    }
    for (let i = 0; i < avg.length; i++) avg[i] /= collected.length;
    return avg;
};

// ─── Legacy compat export (used by register-face & checkin) ──────────────────
/** @deprecated Use extractSingleFrame. Kept for backwards compat. */
export const extractDescriptor = extractSingleFrame;

// ─── Matching ─────────────────────────────────────────────────────────────────
export const verifyFaceMatch = async (
    stored: Float32Array,
    live: Float32Array,
    threshold = MATCH_THRESHOLD
): Promise<boolean> => {
    const faceapi = await import('face-api.js');
    const dist = faceapi.euclideanDistance(stored, live);
    if (process.env.NODE_ENV === 'development') {
        console.debug(`[FaceUtil] Euclidean distance: ${dist.toFixed(4)} (threshold: ${threshold})`);
    }
    return dist < threshold;
};
