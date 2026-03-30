import { useState, useEffect } from 'react';
import { loadModels, type ModelLoadProgress } from '@/lib/face-util';

const STAGE_LABELS: Record<ModelLoadProgress, string> = {
    detector: 'Loading face detector…',
    landmarks: 'Loading landmark model…',
    recognizer: 'Loading recognition model…',
    done: 'Models ready',
};

export const useFaceApi = () => {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState<string>('Initializing…');

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const success = await loadModels((stage) => {
                if (mounted) setLoadingStage(STAGE_LABELS[stage]);
            });
            if (mounted) {
                setIsModelLoaded(success);
                setIsLoading(false);
            }
        };

        init();
        return () => { mounted = false; };
    }, []);

    return { isModelLoaded, isLoading, loadingStage };
};
