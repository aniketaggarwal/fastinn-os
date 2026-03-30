import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        // Active Occupied Rooms
        const { count: occupiedRooms, error: e1 } = await auth.supabaseAdmin!
            .from('rooms')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', auth.hotelId)
            .eq('status', 'occupied');

        if (e1) throw e1;

        // Today's Pending Arrivals
        const todayStr = new Date().toISOString().split('T')[0];
        const { count: pendingArrivals, error: e2 } = await auth.supabaseAdmin!
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', auth.hotelId)
            .eq('status', 'pending')
            .eq('check_in_date', todayStr);

        if (e2) throw e2;

        // Current Guests Checked In
        const { count: currentGuests, error: e3 } = await auth.supabaseAdmin!
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', auth.hotelId)
            .eq('status', 'checked_in');

        if (e3) throw e3;

        // Total Expected Revenue (Basic MVP)
        const { data: revenueData, error: e4 } = await auth.supabaseAdmin!
            .from('bookings')
            .select('total_amount')
            .eq('hotel_id', auth.hotelId)
            .neq('status', 'cancelled');

        if (e4) throw e4;

        const totalRevenue = revenueData.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

        return NextResponse.json({
            stats: {
                occupiedRooms: occupiedRooms || 0,
                pendingArrivals: pendingArrivals || 0,
                currentGuests: currentGuests || 0,
                totalRevenue: totalRevenue
            }
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
