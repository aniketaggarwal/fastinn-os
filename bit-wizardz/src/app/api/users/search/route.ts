import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/api-auth';

// Search users by name or email (for receptionists to create bookings)
export async function GET(req: Request) {
    const auth = await getApiAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (auth.role !== 'admin' && auth.role !== 'reception') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ users: [] });
    }

    const { data: users, error } = await auth.supabaseAdmin!
        .from('users')
        .select('id, name, email, verified')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ users });
}
