import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Verify the session exists and is still pending
    const { data: session, error: fetchErr } = await supabaseAdmin
        .from('checkins')
        .select('session_id, status')
        .eq('session_id', sessionId)
        .single();

    if (fetchErr || !session) {
        console.error('[Challenge] Session not found:', sessionId, fetchErr?.message);
        return NextResponse.json({ error: 'Session not found. Make sure the QR session was created first.' }, { status: 404 });
    }

    // Allow re-challenge if verified (in case guest needs to re-scan)
    if (session.status === 'checked_out') {
        return NextResponse.json({ error: 'Session already checked out.' }, { status: 409 });
    }

    // Generate a cryptographically secure 32-byte nonce
    const nonce = crypto.randomBytes(32).toString('hex');

    // Try to persist nonce to DB (requires migration to have been run).
    // Non-blocking — if nonce column doesn't exist yet, we still return the nonce.
    try {
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        const { error: updateErr } = await supabaseAdmin
            .from('checkins')
            .update({ nonce, nonce_expires_at: expiresAt })
            .eq('session_id', sessionId);

        if (updateErr) {
            // Column likely doesn't exist yet — log a warning but don't fail the request
            console.warn('[Challenge] Could not persist nonce (migration needed?):', updateErr.message);
        }
    } catch (e) {
        console.warn('[Challenge] Nonce persistence failed (non-fatal):', e);
    }

    return NextResponse.json({ nonce });
}
