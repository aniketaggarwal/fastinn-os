import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function reset() {
    const { data: booking } = await supabase.from('bookings').select('guest_id').eq('id', '355d4408-a74a-4153-9f23-053c13dfb6ce').single();
    if (booking) {
        await supabase.from('users').update({ face_verified: false, face_descriptor: null }).eq('id', booking.guest_id);
        console.log('Successfully reset face_verified for guest:', booking.guest_id);
    } else {
        console.log('Booking not found!');
    }
}
reset();
