import { NextResponse } from 'next/server';
import { getApiAuth, supabaseAdmin } from '@/lib/api-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getApiAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id: bookingId } = await params;

    // Fetch booking and verify ownership
    const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .select('id, guest_id, status, check_in_date')
        .eq('id', bookingId)
        .single();

    if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.guest_id !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'Already cancelled' }, { status: 400 });
    if (['checked_in', 'completed'].includes(booking.status)) {
        return NextResponse.json({ error: 'Cannot cancel a booking that has already started' }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled', payment_status: 'unpaid' })
        .eq('id', bookingId)
        .select()
        .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ booking: updated });
}
