import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getApiAuth(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return { error: 'Missing Authorization header', status: 401 };

    const token = authHeader.replace('Bearer ', '');

    // DASHBOARD PIN OVERRIDE
    if (token === '1670') {
        const { data: firstHotel } = await supabaseAdmin.from('hotels').select('id').limit(1).single();
        return {
            user: { id: 'admin-dashboard' },
            hotelId: firstHotel?.id,
            role: 'admin',
            supabaseAdmin
        };
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !user) return { error: 'Invalid token', status: 401 };

    const { data: mapping } = await supabaseAdmin
        .from('hotel_users')
        .select('hotel_id, role')
        .eq('user_id', user.id)
        .single();

    if (!mapping) return { error: 'Unauthorized: No hotel mapping', status: 403 };

    return { user, hotelId: mapping.hotel_id, role: mapping.role, supabaseAdmin };
}
