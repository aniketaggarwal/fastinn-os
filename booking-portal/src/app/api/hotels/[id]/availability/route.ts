import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';

/**
 * GET /api/hotels/[id]/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD
 *
 * Returns all room_type IDs that have AT LEAST ONE available (non-booked) room
 * for the requested date range.
 *
 * Overlap condition: existing.check_in_date < req.check_out AND existing.check_out_date > req.check_in
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: hotelId } = await params;
    const { searchParams } = new URL(req.url);
    const checkIn = searchParams.get('check_in');
    const checkOut = searchParams.get('check_out');

    if (!checkIn || !checkOut) {
        return NextResponse.json({ error: 'check_in and check_out are required' }, { status: 400 });
    }
    if (checkIn >= checkOut) {
        return NextResponse.json({ error: 'check_out must be after check_in' }, { status: 400 });
    }

    // Find all room IDs that are booked during the overlap window
    const { data: bookedRooms } = await supabaseAdmin
        .from('bookings')
        .select('room_id, room_type_id')
        .eq('hotel_id', hotelId)
        .not('status', 'in', '("cancelled")')
        .not('room_id', 'is', null)
        .lt('check_in_date', checkOut)
        .gt('check_out_date', checkIn);

    const bookedRoomIds = new Set((bookedRooms || []).map(b => b.room_id));

    // Get all rooms for this hotel
    const { data: allRooms } = await supabaseAdmin
        .from('rooms')
        .select('id, room_type_id, status')
        .eq('hotel_id', hotelId)
        .eq('status', 'vacant');

    // A room type is available if it has at least one room not in bookedRoomIds
    const available = new Set<string>();
    (allRooms || []).forEach(room => {
        if (!bookedRoomIds.has(room.id)) {
            available.add(room.room_type_id);
        }
    });

    // Also include room types that have NO assigned rooms yet (un-assigned inventory)
    // by checking which room_type_ids had overlapping bookings via room_type_id column
    const bookedTypeIds = new Set((bookedRooms || []).map(b => b.room_type_id));
    const { data: allTypes } = await supabaseAdmin
        .from('room_types')
        .select('id')
        .eq('hotel_id', hotelId);

    (allTypes || []).forEach(rt => {
        if (!bookedTypeIds.has(rt.id)) available.add(rt.id);
    });

    return NextResponse.json({ availableRoomTypeIds: Array.from(available) });
}
