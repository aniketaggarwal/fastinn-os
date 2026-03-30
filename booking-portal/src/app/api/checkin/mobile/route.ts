import { NextResponse } from 'next/server';
import { getApiAuth, supabaseAdmin } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await getApiAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
        return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    // Use admin client to bypass RLS, but enforce ownership check
    const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .select(`
            *,
            hotel:hotels (*),
            room_type:room_types (*)
        `)
        .eq('id', bookingId)
        .single();

    if (error || !booking) {
        return NextResponse.json({ error: error ? JSON.stringify(error) : 'Booking not found' }, { status: 404 });
    }

    // Ensure the logged-in user actually owns this booking
    if (booking.guest_id !== auth.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch the public.users record for the face descriptor
    const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('name, face_descriptor')
        .eq('id', booking.guest_id)
        .single();

    return NextResponse.json({
        booking: {
            ...booking,
            users: userProfile || null
        }
    });
}

export async function POST(req: Request) {
    const auth = await getApiAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { bookingId, nonce } = await req.json();

        if (!bookingId) {
            return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
        }
        if (!nonce) {
            return NextResponse.json({ error: 'Missing QR Session ID (nonce)' }, { status: 400 });
        }

        // Verify ownership and get guest name and booking details
        const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select('guest_id, hotel_id, room_type_id, room_id, users(name)')
            .eq('id', bookingId)
            .single();

        if (!booking || booking.guest_id !== auth.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        let assignedRoomId = booking.room_id;
        let assignedRoomNo = null;

        // Auto-assign Room if not already assigned
        if (!assignedRoomId) {
            const { data: availableRooms, error: roomFindErr } = await supabaseAdmin
                .from('rooms')
                .select('id, room_no')
                .eq('hotel_id', booking.hotel_id)
                .eq('room_type_id', booking.room_type_id)
                .eq('status', 'vacant')
                .limit(1);

            if (roomFindErr || !availableRooms || availableRooms.length === 0) {
                return NextResponse.json({ error: 'No vacant rooms available for this room type.' }, { status: 400 });
            }

            assignedRoomId = availableRooms[0].id;
            assignedRoomNo = availableRooms[0].room_no;

            // Block the room
            await supabaseAdmin
                .from('rooms')
                .update({ status: 'occupied' })
                .eq('id', assignedRoomId);
        } else {
            // Room was previously pre-assigned, fetch its number and mark occupied
            const { data: existingRoom } = await supabaseAdmin
                .from('rooms')
                .select('room_no')
                .eq('id', assignedRoomId)
                .single();
            assignedRoomNo = existingRoom?.room_no;

            await supabaseAdmin
                .from('rooms')
                .update({ status: 'occupied' })
                .eq('id', assignedRoomId);
        }

        // Update Booking status
        const { error: bookingErr } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'checked_in', room_id: assignedRoomId })
            .eq('id', bookingId);

        if (bookingErr) throw bookingErr;

        // Upsert the check-in session for the Admin Dashboard Real-time Feed
        const guestName = Array.isArray(booking.users) ? (booking.users[0] as any)?.name : (booking.users as any)?.name;

        const { error: checkinErr } = await supabaseAdmin
            .from('checkins')
            .upsert({
                nonce: nonce,
                status: 'verified',
                verified_at: new Date().toISOString(),
                guest_name: guestName || 'Guest'
            }, { onConflict: 'nonce' });

        if (checkinErr) console.error("Warning: Could not notify dashboard:", checkinErr);

        return NextResponse.json({ success: true, roomNo: assignedRoomNo });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
