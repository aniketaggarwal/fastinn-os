import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';

export async function POST(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== 'Bearer 1670') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action, bookingId, hotelId, nonce } = body;

        if (action === 'generate_qr') {
            const { error } = await supabaseAdmin
                .from('checkins')
                .upsert({
                    hotel_id: hotelId,
                    booking_id: bookingId,
                    nonce,
                    status: 'pending',
                    nonce_expires_at: new Date(Date.now() + 15 * 60000).toISOString()
                }, { onConflict: 'booking_id' });

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (action === 'direct_checkin') {
            // Update booking status
            const { error: bErr } = await supabaseAdmin
                .from('bookings')
                .update({ status: 'checked_in' })
                .eq('id', bookingId);

            if (bErr) throw bErr;

            // Upsert completed checkin record
            const { error: cErr } = await supabaseAdmin
                .from('checkins')
                .upsert({
                    hotel_id: hotelId,
                    booking_id: bookingId,
                    nonce,
                    status: 'verified',
                    nonce_expires_at: new Date(Date.now() + 60000).toISOString()
                }, { onConflict: 'booking_id' });

            if (cErr) throw cErr;
            return NextResponse.json({ success: true });
        }

        if (action === 'get_face_descriptor') {
            // Find the pending checkin session by nonce
            const { data: checkin, error: cErr } = await supabaseAdmin
                .from('checkins')
                .select('booking_id')
                .eq('nonce', nonce)
                .single();
            if (cErr || !checkin) return NextResponse.json({ error: 'Invalid or expired QR session' }, { status: 404 });

            // Get the booking and guest face descriptor
            const { data: booking, error: bErr } = await supabaseAdmin
                .from('bookings')
                .select(`
                    id, 
                    users:guest_id (name, face_descriptor),
                    rooms:room_id (room_no)
                `)
                .eq('id', checkin.booking_id)
                .single();

            if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
            const user = (booking.users as any);

            if (!user?.face_descriptor) {
                return NextResponse.json({ error: 'Guest has not completed Pre-Check-in face scan' }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                name: user.name,
                descriptor: user.face_descriptor,
                room: (booking.rooms as any)?.room_no || null
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
