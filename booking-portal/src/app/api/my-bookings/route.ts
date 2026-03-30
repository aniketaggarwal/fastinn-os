import { NextResponse } from 'next/server';
import { getApiAuth, supabaseAdmin } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await getApiAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const specificId = searchParams.get('id');

    // Guest can only see THEIR OWN bookings — enforced by eq('guest_id', user.id)
    let query = supabaseAdmin
        .from('bookings')
        .select(`
            id, status, payment_status, check_in_date, check_out_date, total_amount, created_at,
            hotel:hotels ( id, name, city ),
            room_type:room_types ( name ),
            room:rooms ( room_no )
        `)
        .eq('guest_id', auth.user.id)
        .order('created_at', { ascending: false });

    if (specificId) {
        query = query.eq('id', specificId) as typeof query;
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data || [] });
}
