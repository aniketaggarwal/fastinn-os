import { NextResponse } from 'next/server';
import { getApiAuth, supabaseAdmin } from '@/lib/api-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getApiAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id: bookingId } = await params;
    const body = await req.json();
    const payment_method = body.payment_method || 'card_offline';

    // Fetch the booking and verify ownership
    const { data: booking, error: fetchErr } = await supabaseAdmin
        .from('bookings')
        .select('id, guest_id, status, payment_status')
        .eq('id', bookingId)
        .single();

    if (fetchErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Only the booking's guest can confirm it
    if (booking.guest_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (booking.status === 'cancelled') {
        return NextResponse.json({ error: 'Cannot confirm a cancelled booking' }, { status: 400 });
    }

    // Update booking to confirmed
    const { data: updated, error: updateErr } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'confirmed', payment_status: payment_method === 'card_offline' ? 'offline' : 'paid' })
        .eq('id', bookingId)
        .select()
        .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ booking: updated });
}
