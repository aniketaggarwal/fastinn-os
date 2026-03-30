import { NextResponse } from 'next/server';
import { getApiAuth, supabaseAdmin } from '@/lib/api-auth';

export async function POST(req: Request) {
    const auth = await getApiAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const idempotencyKey = req.headers.get('Idempotency-Key');
    const body = await req.json();
    const { hotel_id, room_type_id, check_in_date, check_out_date, total_amount, guest_name } = body;

    if (!hotel_id || !room_type_id || !check_in_date || !check_out_date) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (check_in_date >= check_out_date) {
        return NextResponse.json({ error: 'check_out must be after check_in' }, { status: 400 });
    }

    // ── Ensure user exists in public.users (required by FK) ────────
    // Portal guests may only be in auth.users — auto-create public.users row
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(auth.user.id);
    const { error: upsertUserErr } = await supabaseAdmin
        .from('users')
        .upsert({
            id: auth.user.id,
            email: auth.user.email,
            name: userData?.user?.user_metadata?.name || guest_name || auth.user.email,
        }, { onConflict: 'id' });

    if (upsertUserErr) {
        console.error('Failed to upsert user:', upsertUserErr);
        return NextResponse.json({ error: 'Failed to set up guest account.' }, { status: 500 });
    }

    // ── Idempotency Check (without DB column — use composite lookup) ──
    if (idempotencyKey) {
        // Check for an existing pending booking with same key params in last 10min
        const { data: existing } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('hotel_id', hotel_id)
            .eq('guest_id', auth.user.id)
            .eq('room_type_id', room_type_id)
            .eq('check_in_date', check_in_date)
            .eq('check_out_date', check_out_date)
            .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
            .limit(1);

        if (existing && existing.length > 0) {
            return NextResponse.json({ booking: existing[0] });
        }
    }

    // ── Server-side Availability Re-check ─────────────────────────
    const { data: conflicting } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('hotel_id', hotel_id)
        .eq('room_type_id', room_type_id)
        .not('status', 'eq', 'cancelled')
        .lt('check_in_date', check_out_date)
        .gt('check_out_date', check_in_date)
        .limit(1);

    if (conflicting && conflicting.length > 0) {
        return NextResponse.json(
            { error: 'This room type is no longer available for the selected dates.' },
            { status: 409 }
        );
    }

    // ── Auto-create Guest hotel_users row ─────────────────────────
    await supabaseAdmin.from('hotel_users').upsert(
        { hotel_id, user_id: auth.user.id, role: 'guest' },
        { onConflict: 'hotel_id,user_id' }
    );

    // ── Create Booking ────────────────────────────────────────────
    const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .insert({
            hotel_id,
            guest_id: auth.user.id,
            room_type_id,
            check_in_date,
            check_out_date,
            total_amount: total_amount || 0,
            status: 'pending',
            payment_status: 'unpaid',
            // idempotency_key not inserted — column added by schema_portal.sql
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booking }, { status: 201 });
}
