import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    // Use crypto.randomUUID() for Session ID
    const sessionId = crypto.randomUUID();

    // Insert into checkins table
    // Assuming table 'checkins' has columns: id, session_id, status, created_at
    const { data, error } = await supabase
        .from('checkins')
        .insert([
            { session_id: sessionId, status: 'pending' }
        ])
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessionId });
}
