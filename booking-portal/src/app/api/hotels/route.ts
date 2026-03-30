import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';
import { enrichHotel } from '@/lib/hotel-meta';

export async function GET() {
    try {
        // select('*') is safe regardless of which schema version is running
        const { data, error } = await supabaseAdmin
            .from('hotels')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const hotels = (data || []).map(enrichHotel);
        return NextResponse.json({ hotels });
    } catch (err: any) {
        return NextResponse.json({ error: err.message, hotels: [] }, { status: 500 });
    }
}
