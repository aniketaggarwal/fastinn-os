import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/api-auth';

// GET all rooms for the current tenant (+ room type details)
export async function GET(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: rooms, error } = await auth.supabaseAdmin!
        .from('rooms')
        .select(`*, room_types(name, capacity)`)
        .eq('hotel_id', auth.hotelId)
        .order('room_no', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rooms });
}

// POST Create a new room in inventory
export async function POST(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (auth.role !== 'admin' && auth.role !== 'reception') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { room_no, room_type_id, status, floor } = body;

        if (!room_no) return NextResponse.json({ error: 'Room number is required' }, { status: 400 });

        // Upsert room (used for creating or legacy checkout logic occasionally)
        const { data, error } = await auth.supabaseAdmin!
            .from('rooms')
            .upsert({
                hotel_id: auth.hotelId,
                room_no,
                room_type_id: room_type_id || null,
                floor: floor || null,
                status: status || 'vacant',
                updated_at: new Date().toISOString()
            }, { onConflict: 'hotel_id,room_no' })
            .select()
            .single();

        if (error) throw error;

        // Audit Log
        await auth.supabaseAdmin!.from('audit_logs').insert([{
            hotel_id: auth.hotelId, user_id: auth.user!.id,
            action: 'create_or_update_room', entity_type: 'room', entity_id: data.id,
            details: { room_no, status }
        }]);

        return NextResponse.json({ success: true, room: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH Change Room Status
export async function PATCH(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Housekeeping can only update status to cleaning/vacant
    // Reception/Admin can do anything
    if (auth.role === 'guest') return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

    try {
        const body = await req.json();
        const { room_no, status } = body;

        const { data, error } = await auth.supabaseAdmin!
            .from('rooms')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('hotel_id', auth.hotelId)
            .eq('room_no', room_no)
            .select()
            .single();

        if (error) throw error;

        // Audit Log
        await auth.supabaseAdmin!.from('audit_logs').insert([{
            hotel_id: auth.hotelId, user_id: auth.user!.id,
            action: 'update_room_status', entity_type: 'room', entity_id: data.id,
            details: { room_no, new_status: status }
        }]);

        return NextResponse.json({ success: true, room: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
