import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { enrichHotel } from '@/lib/hotel-meta';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { data: raw, error } = await supabaseAdmin
        .from('hotels')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !raw) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });

    const hotel = enrichHotel(raw);

    const { data: roomTypes } = await supabaseAdmin
        .from('room_types')
        .select('id, name, description, base_price, capacity')
        .eq('hotel_id', id)
        .order('base_price', { ascending: true });

    return NextResponse.json({ hotel: { ...hotel, room_types: roomTypes || [] } });
}
