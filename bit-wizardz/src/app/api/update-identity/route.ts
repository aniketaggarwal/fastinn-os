import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // Initialize Supabase Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get Token from Header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization Header' }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '');

        // Verify User
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('Auth Error:', authError);
            return NextResponse.json({ error: 'Unauthorized: Invalid Token' }, { status: 401 });
        }

        const body = await request.json();
        const { dob, aadhaarLast4, id_masked } = body;

        if (!dob || !aadhaarLast4) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Perform Upsert with authenticated context
        // We use the token to act as the user for RLS policies
        const authenticatedSupabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { error } = await authenticatedSupabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                identity_verified: true,
                dob: dob,
                id_last4: aadhaarLast4,
                id_masked: id_masked,
                id_type: 'aadhaar',
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('Update Identity Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
