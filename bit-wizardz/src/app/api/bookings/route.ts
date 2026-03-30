import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let query = auth.supabaseAdmin!
        .from('bookings')
        .select(`
            *,
            users:guest_id (name, email, identity_verified, face_verified),
            room_types:room_type_id (name),
            hotels:hotel_id (name),
            rooms:room_id (room_no)
        `)
        .order('check_in_date', { ascending: true });

    if (auth.user?.id !== 'admin-dashboard') {
        query = query.eq('hotel_id', auth.hotelId);
    }

    const { data: bookings, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings });
}

export async function POST(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (auth.role !== 'admin' && auth.role !== 'reception') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { guest_id, room_type_id, check_in_date, check_out_date, total_amount } = body;

        if (!guest_id || !room_type_id || !check_in_date || !check_out_date) {
            return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
        }

        const { data: booking, error } = await auth.supabaseAdmin!
            .from('bookings')
            .insert([{
                hotel_id: auth.hotelId,
                guest_id,
                room_type_id,
                check_in_date,
                check_out_date,
                total_amount: total_amount || 0.00,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        // Log audit event
        await auth.supabaseAdmin!.from('audit_logs').insert([{
            hotel_id: auth.hotelId, user_id: auth.user!.id,
            action: 'create_booking', entity_type: 'booking', entity_id: booking.id,
            details: { guest_id, room_type_id, check_in_date, check_out_date }
        }]);

        return NextResponse.json({ success: true, booking });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
