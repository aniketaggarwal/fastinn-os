'use client';

import { useRouter } from 'next/navigation';

interface BackButtonProps {
    fallbackRoute?: string;
    className?: string;
    label?: string;
}

export default function BackButton({ fallbackRoute = '/menu', className = '', label = 'Back' }: BackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        if (window.history.length > 2) {
            router.back();
        } else {
            router.push(fallbackRoute);
        }
    };

    return (
        <button
            onClick={handleBack}
            className={`px-4 py-2 bg-slate-200/20 hover:bg-slate-200/30 text-current rounded-lg font-bold transition-colors backdrop-blur-sm border border-white/10 ${className}`}
        >
            ← {label}
        </button>
    );
}
