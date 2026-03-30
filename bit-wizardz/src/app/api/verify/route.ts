import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to verify ECDSA signature (Server-side, Web Crypto API)
const verifySignature = async (publicKeyB64: string, data: string, signatureB64: string) => {
    try {
        const jwk = JSON.parse(atob(publicKeyB64));
        const key = await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify']
        );
        const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
        const dataBytes = new TextEncoder().encode(data);
        return await crypto.subtle.verify(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            key, signature, dataBytes
        );
    } catch (e) {
        console.error('[Verify] Signature verification error:', e);
        return false;
    }
};

export async function POST(request: Request) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            return NextResponse.json(
                { error: 'Server misconfiguration: missing service key' },
                { status: 500 }
            );
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        );

        const body = await request.json();
        const { signature, nonce, public_key, guest_name } = body;

        if (!signature || !nonce || !public_key || !guest_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // ── 1. Validate nonce against DB (replay attack prevention) ──────────
        const { data: sessionRow, error: sessionErr } = await supabaseAdmin
            .from('checkins')
            .select(`
                id, hotel_id, booking_id, nonce, nonce_expires_at, status,
                bookings ( room_type_id )
            `)
            .eq('nonce', nonce)
            .single();

        if (sessionErr || !sessionRow) {
            return NextResponse.json({ error: 'Invalid or expired QR code session.' }, { status: 404 });
        }

        if (sessionRow.status !== 'pending') {
            return NextResponse.json(
                { error: `Session already ${sessionRow.status}` },
                { status: 409 }
            );
        }

        const expired = !sessionRow.nonce_expires_at
            || new Date(sessionRow.nonce_expires_at) < new Date();

        if (expired) {
            return NextResponse.json({ error: 'Nonce expired — please rescan new QR from Reception.' }, { status: 401 });
        }

        // ── 2. Verify ECDSA signature ─────────────────────────────────────────
        const isValid = await verifySignature(public_key, nonce, signature);
        if (!isValid) {
            return NextResponse.json({ error: 'Device signature rejected by Cryptography engine.' }, { status: 401 });
        }

        // ── 3. Find the Guest User ID by Public Key ───────────────────────────
        let guestUserId = null;
        try {
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('public_key', public_key)
                .single();
            guestUserId = userRow?.id || null;
        } catch { /* Ignored */ }

        // ── 4. Auto-allocate the first available room of matching type ────────
        const booking = Array.isArray(sessionRow.bookings) ? sessionRow.bookings[0] : sessionRow.bookings;
        const targetRoomTypeId = booking?.room_type_id;

        if (!targetRoomTypeId) {
            return NextResponse.json({ error: 'Booking missing room type definition.' }, { status: 400 });
        }

        const { data: roomData } = await supabaseAdmin
            .from('rooms')
            .select('id, room_no')
            .eq('hotel_id', sessionRow.hotel_id)
            .eq('room_type_id', targetRoomTypeId)
            .eq('status', 'vacant')
            .order('room_no', { ascending: true })
            .limit(1)
            .single();

        if (!roomData) {
            return NextResponse.json({ error: 'No vacant rooms of requested type available. Please see Reception.' }, { status: 400 });
        }

        const allocatedRoom = roomData.room_no;
        const allocatedRoomId = roomData.id;

        // ── 5. Run Database Updates for successful Check-in ───────────────────

        // A. Occupy Room
        await supabaseAdmin
            .from('rooms')
            .update({ status: 'occupied', updated_at: new Date().toISOString() })
            .eq('id', allocatedRoomId);

        // B. Update Booking Status
        await supabaseAdmin
            .from('bookings')
            .update({ status: 'checked_in', room_id: allocatedRoomId, updated_at: new Date().toISOString() })
            .eq('id', sessionRow.booking_id);

        // C. Mark check-in as verified + clear nonce (one-time use)
        const { error: checkinError } = await supabaseAdmin
            .from('checkins')
            .update({
                status: 'verified',
                verified_at: new Date().toISOString(),
                guest_id: guestUserId,
                nonce: null,            // invalidate — prevents replay
                nonce_expires_at: null,
            })
            .eq('id', sessionRow.id);

        if (checkinError) {
            console.error('[Verify] Checkin update error:', checkinError);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        console.log(`[Verify] ✅ Guest checked into Room ${allocatedRoom} (Booking: ${sessionRow.booking_id})`);
        return NextResponse.json({ success: true, room: allocatedRoom });

    } catch (e: any) {
        console.error('[Verify API Error]:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
