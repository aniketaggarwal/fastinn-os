import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/api-auth';

// GET all room types for the current tenant
export async function GET(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: roomTypes, error } = await auth.supabaseAdmin!
        .from('room_types')
        .select('*')
        .eq('hotel_id', auth.hotelId)
        .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ roomTypes });
}

// POST create a new room type
export async function POST(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Only Admin or Reception can manage room types
    if (auth.role !== 'admin' && auth.role !== 'reception') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, description, base_price, capacity } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const { data, error } = await auth.supabaseAdmin!
            .from('room_types')
            .insert([{
                hotel_id: auth.hotelId,
                name,
                description: description || '',
                base_price: parseFloat(base_price) || 0.00,
                capacity: parseInt(capacity) || 2
            }])
            .select()
            .single();

        if (error) throw error;

        // Audit Log
        await auth.supabaseAdmin!.from('audit_logs').insert([{
            hotel_id: auth.hotelId, user_id: auth.user!.id,
            action: 'create_room_type', entity_type: 'room_type', entity_id: data.id,
            details: { name }
        }]);

        return NextResponse.json({ success: true, roomType: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
