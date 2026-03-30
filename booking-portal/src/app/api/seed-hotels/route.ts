import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/api-auth';

/**
 * POST /api/seed-hotels
 * Creates 3 demo hotels with room types and rooms.
 * Safe to call multiple times.
 */
export async function POST() {
    const demos = [
        {
            name: 'The Imperial, New Delhi',
            domain: 'imperial.fastinn.app',
            roomTypes: [
                { name: 'Deluxe Room', base_price: 12500, capacity: 2, description: 'Elegant room with city views, king bed, and marble bathroom.' },
                { name: 'Executive Suite', base_price: 22000, capacity: 2, description: 'Spacious suite with private lounge and panoramic skyline views.' },
                { name: 'Presidential Suite', base_price: 45000, capacity: 4, description: 'Two-bedroom suite with private dining room and butler service.' },
            ],
        },
        {
            name: 'Jaipur Heritage Palace',
            domain: 'heritage.fastinn.app',
            roomTypes: [
                { name: 'Palace Room', base_price: 18000, capacity: 2, description: 'Decorated in authentic Rajasthani style with garden views.' },
                { name: 'Maharaja Suite', base_price: 35000, capacity: 2, description: 'Royal luxury with a private pool and courtyard.' },
                { name: 'Garden Cottage', base_price: 14000, capacity: 3, description: 'Secluded cottage amid manicured gardens with outdoor seating.' },
            ],
        },
        {
            name: 'Goa Beachfront Resort',
            domain: 'goa.fastinn.app',
            roomTypes: [
                { name: 'Ocean View Room', base_price: 9500, capacity: 2, description: 'Bright, airy room with floor-to-ceiling windows and sea views.' },
                { name: 'Beach Villa', base_price: 19000, capacity: 4, description: 'Private villa steps from the beach with your own plunge pool.' },
                { name: 'Overwater Bungalow', base_price: 28000, capacity: 2, description: 'Iconic bungalow perched over the lagoon with glass floor panels.' },
            ],
        },
    ];

    const results = [];

    for (const demo of demos) {
        // Check if hotel already exists by name (idempotent)
        const { data: existing } = await supabaseAdmin
            .from('hotels')
            .select('id')
            .eq('name', demo.name)
            .single();

        let hotelId: string;

        if (existing) {
            hotelId = existing.id;
            results.push({ hotel: demo.name, status: 'already exists' });
        } else {
            const { data: newHotel, error: insertErr } = await supabaseAdmin
                .from('hotels')
                .insert({ name: demo.name, domain: demo.domain })
                .select('id')
                .single();

            if (insertErr || !newHotel) {
                results.push({ hotel: demo.name, status: 'insert failed', error: insertErr?.message });
                continue;
            }
            hotelId = newHotel.id;
        }

        // Check if room types already exist for this hotel
        const { data: existingRTs } = await supabaseAdmin
            .from('room_types')
            .select('id')
            .eq('hotel_id', hotelId);

        if (existingRTs && existingRTs.length > 0) {
            results.push({ hotel: demo.name, status: 'rooms already seeded' });
            continue;
        }

        // Create room types + rooms
        for (let i = 0; i < demo.roomTypes.length; i++) {
            const rt = demo.roomTypes[i];
            const { data: roomType } = await supabaseAdmin
                .from('room_types')
                .insert({ hotel_id: hotelId, ...rt })
                .select('id')
                .single();

            if (!roomType) continue;

            // Create 3 rooms per type (room numbers: 101-103, 201-203, 301-303)
            const rooms = Array.from({ length: 3 }, (_, j) => ({
                hotel_id: hotelId,
                room_type_id: roomType.id,
                room_no: `${(i + 1)}${(j + 1).toString().padStart(2, '0')}`,
                floor: String(i + 1),
                status: 'vacant',
            }));
            await supabaseAdmin.from('rooms').insert(rooms);
        }

        results.push({ hotel: demo.name, id: hotelId, status: 'seeded' });
    }

    return NextResponse.json({ success: true, results });
}
