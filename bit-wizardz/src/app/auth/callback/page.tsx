'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserAccess } from '@/lib/rbac';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            // 1. Get User Session (handled by Supabase automatically on redirect)
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // 2. SaaS/RBAC Check: Are they staff?
                const access = await getUserAccess();

                if (access.role === 'admin' || access.role === 'reception' || access.role === 'housekeeping') {
                    router.replace('/dashboard');
                    return;
                }

                // 3. Check Verification Status (Guest Flow)
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('id_last4')
                        .eq('id', user.id)
                        .single();

                    if (profile?.id_last4) {
                        // Already Verified -> Menu (Skip Setup)
                        router.replace('/menu');
                    } else {
                        // New User -> P1SU (Setup)
                        const name = user.user_metadata?.name || 'User';
                        router.replace(`/p1su?name=${encodeURIComponent(name)}`);
                    }
                } catch (error) {
                    console.error("Profile check failed:", error);
                    // Fallback to P1SU in case of error
                    const name = user.user_metadata?.name || 'User';
                    router.replace(`/p1su?name=${encodeURIComponent(name)}`);
                }
            } else {
                // No User -> Login
                router.replace('/');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent mb-4"></div>
            <p className="text-slate-400 font-medium animate-pulse">Verifying Account...</p>
        </div>
    );
}
