'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
    const router = useRouter();
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) router.replace('/');
            else router.replace('/login');
        });
    }, [router]);
    return (
        <div className="spinner-center" style={{ minHeight: '100vh' }}>
            <div className="spinner" />
        </div>
    );
}
