import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { user_id } = await req.json();
        if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

        // 1. Check if user already has a role
        const { data: existing } = await supabaseAdmin
            .from('hotel_users')
            .select('id')
            .eq('user_id', user_id)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'User is already assigned to a hotel' }, { status: 400 });
        }

        // 2. Create the Demo Hotel
        const { data: hotel, error: hotelErr } = await supabaseAdmin
            .from('hotels')
            .insert([{ name: 'FastInn Demo Property', domain: 'demo.fastinn.app' }])
            .select('*').single();

        if (hotelErr || !hotel) throw hotelErr;

        // 3. Add user as admin
        const { error: userErr } = await supabaseAdmin
            .from('hotel_users')
            .insert([{ hotel_id: hotel.id, user_id, role: 'admin' }]);

        if (userErr) throw userErr;

        // 4. Also automatically create some Room Types for convenience
        const { error: typeErr } = await supabaseAdmin
            .from('room_types')
            .insert([
                { hotel_id: hotel.id, name: 'Standard King', base_price: 150.00, capacity: 2 },
                { hotel_id: hotel.id, name: 'Deluxe Suite', base_price: 250.00, capacity: 4 }
            ]);

        if (typeErr) console.warn("Failed to insert default room types", typeErr);

        return NextResponse.json({ success: true, hotel_id: hotel.id });
    } catch (err: any) {
        console.error("Setup Demo Error:", err);
        return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
    }
}
