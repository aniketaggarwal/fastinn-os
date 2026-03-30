import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data: booking } = await supabase.from('bookings').select('guest_id, status').eq('id', '355d4408-a74a-4153-9f23-053c13dfb6ce').single();
    if (booking) {
        console.log('Guest ID:', booking.guest_id);
        const { data, error } = await supabase.from('users').select('*').eq('id', booking.guest_id).single();
        console.log('User Record:', data ? { ...data, face_descriptor: data.face_descriptor ? `[Array(${data.face_descriptor.length})]` : null } : null);
        console.log('Error:', error);
    }
}
check();
